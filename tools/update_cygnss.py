"""Monthly CYGNSS refresh. Credentials are read from EARTHDATA_TOKEN only."""
import argparse
import calendar
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'ml'))
CMR = ('https://cmr.earthdata.nasa.gov/search/granules.json?'
       'collection_concept_id=C2893924134-POCLOUD&sort_key=-start_date&page_size=1')
ARCHIVE = 'https://archive.podaac.earthdata.nasa.gov/podaac-ops-cumulus-protected/CYGNSS_L3_MICROPLASTIC_V3.2/'
NAME = re.compile(r'cyg\.ddmi\.s(\d{8})-120000-e\1-120000\.l3\.grid-microplastic\.a32\.d33\.nc\Z')
BBOX = {'west': -150., 'south': 25., 'east': -145., 'north': 30.}
DOI = '10.5067/CYGNS-L3P32'


def iso(value):
    return value.astimezone(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def next_month(value):
    year, month = value.year + (value.month == 12), value.month % 12 + 1
    return value.replace(year=year, month=month, day=min(value.day, calendar.monthrange(year, month)[1]))


def read_json(path):
    try:
        return json.loads(path.read_text(encoding='utf8'))
    except (OSError, ValueError):
        return {}


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf8', dir=path.parent,
                                         suffix='.tmp', delete=False) as target:
            temporary = Path(target.name)
            json.dump(data, target, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
            target.write('\n')
        os.replace(temporary, path)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


@contextmanager
def update_lock(path):
    """OS advisory lock is released even if a process exits unexpectedly."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a+b') as handle:
        handle.seek(0, 2)
        if handle.tell() == 0:
            handle.write(b'0')
            handle.flush()
        handle.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            yield False
            return
        try:
            yield True
        finally:
            handle.seek(0)
            if os.name == 'nt':
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def due(state, now):
    try:
        return now >= datetime.fromisoformat(state['next_check_at'].replace('Z', '+00:00'))
    except (KeyError, ValueError, TypeError):
        return True


def retry(operation, sleep=time.sleep):
    for attempt in range(3):
        try:
            return operation()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
        except (urllib.error.URLError, TimeoutError):
            if attempt == 2:
                raise
        sleep(2 ** attempt)


def discover():
    def fetch():
        with urllib.request.urlopen(CMR, timeout=30) as response:
            return json.load(response)['feed']['entry']
    entries = retry(fetch)
    if not entries:
        raise ValueError('Empty catalog')
    entry = entries[0]
    name = entry['title'] + '.nc'
    match = NAME.fullmatch(name)
    date = entry['time_start'][:10]
    if not match or datetime.strptime(match[1], '%Y%m%d').date().isoformat() != date:
        raise ValueError('Unexpected product or date')
    url = ARCHIVE + name
    if not any(link.get('href') == url for link in entry.get('links', [])):
        raise ValueError('Official download link missing')
    return {'filename': name, 'date': date, 'granule_id': entry['id'],
            'catalog_updated_at': entry.get('updated'), 'url': url}


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urllib.parse.urlparse(newurl)
        host = parsed.hostname or ''
        if parsed.scheme != 'https' or not (host.endswith('.earthdata.nasa.gov') or host.endswith('.cloudfront.net')):
            raise ValueError('Untrusted redirect')
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if urllib.parse.urlparse(req.full_url).netloc != parsed.netloc:
            redirected.remove_header('Authorization')
        return redirected


def download(granule, destination):
    token = os.environ.get('EARTHDATA_TOKEN', '').strip()
    if not token:
        raise PermissionError('Local Earthdata configuration required')
    def fetch():
        request = urllib.request.Request(granule['url'], headers={'Authorization': 'Bearer ' + token})
        opener = urllib.request.build_opener(SafeRedirect())
        with opener.open(request, timeout=45) as response, destination.open('wb') as output:
            total = 0
            while chunk := response.read(256 * 1024):
                total += len(chunk)
                if total > 32 * 1024 * 1024:
                    raise ValueError('Unexpected file size')
                output.write(chunk)
    retry(fetch)


def validate_asset(result, expected_date):
    from build_cygnss_sample import build
    # Reuse schema, units, coordinates, duplicate, date and version checks.
    rows = [{'lat': row[0], 'lon': row[1], 'mp_concentration': row[2], 'num_mp_samples': row[3],
             'date': expected_date + 'T12:00:00'} for row in result['cells']]
    rebuilt = build({'source': {'doi': result['source_doi']}, 'bbox': result['bbox_centers'],
                     'units': {'mp_concentration': result['source_units']},
                     'global_attributes': {'version_id': result['product_version'],
                                           'l3_data_version': result['data_version'],
                                           'time_coverage_duration': 'P30DT00H00M00S'},
                     'cells': rows}, expected_date=expected_date + 'T12:00:00', require_complete=False)
    if (not rows or result['date'] != expected_date + 'T12:00:00Z'
            or rebuilt['cells'] != result['cells'] or result['grid_step_deg'] != .25
            or result['averaging_days'] != 30 or result['averaging_degrees'] != 1):
        raise ValueError('Invalid public asset')


def build_file(filename, expected_date):
    import netCDF4
    import numpy as np
    from read_cygnss import read_region
    from build_cygnss_sample import build
    source = read_region(filename, (-150, 25, -145, 30))
    result = build(source, expected_date=expected_date + 'T12:00:00', require_complete=False)
    with netCDF4.Dataset(filename) as dataset:
        if {key: len(dataset.dimensions[key]) for key in ('time', 'lat', 'lon')} != {'time': 1, 'lat': 297, 'lon': 1440}:
            raise ValueError('Unexpected grid')
        lat, lon = dataset['lat'][:], dataset['lon'][:]
        np.testing.assert_allclose(lat, np.arange(-37, 37.01, .25), rtol=0, atol=0)
        np.testing.assert_allclose(lon, np.arange(0, 360, .25), rtol=0, atol=0)
        expected = []
        for ri in np.where((lat >= 25) & (lat <= 30))[0]:
            for ci in np.where((lon >= 210) & (lon <= 215))[0]:
                value, samples = dataset['mp_concentration'][0, ri, ci], dataset['num_mp_samples'][0, ri, ci]
                if (np.ma.is_masked(value) or np.ma.is_masked(samples) or not np.isfinite(value)
                        or value < 0 or samples <= 0):
                    continue
                expected.append([float(lat[ri]), float(lon[ci] - 360), float(value), int(samples)])
        if result['cells'] != expected:
            raise ValueError('Cell verification failed')
    result['verification'] = {'method': 'All regional cells compared directly with NetCDF',
                              'matched_cells': len(expected), 'source_grid': [1, 297, 1440]}
    return result


def refresh(directory=ROOT / 'assets', local_file=None, force=False, now=None,
            discovery=discover, builder=build_file, downloader=download):
    now = now or datetime.now(timezone.utc)
    with update_lock(directory / '.cygnss-update.lock') as locked:
        if not locked:
            return {'status': 'busy'}
        return refresh_locked(directory, local_file, force, now, discovery, builder, downloader)


def refresh_locked(directory, local_file, force, now, discovery, builder, downloader):
    status_path, asset_path = directory / 'cygnss-status.json', directory / 'cygnss-latest.json'
    previous, current = read_json(status_path), read_json(asset_path)
    if not current:
        current = read_json(directory / 'cygnss-north-pacific-20180816.json')
    if not force and not local_file and not due(previous, now):
        try:
            validate_asset(current, current['date'][:10])
            if previous.get('displayed_date') == current['date']:
                return previous
        except (ValueError, KeyError, TypeError, IndexError):
            pass
    retained = ('last_success_at', 'last_failure_at', 'last_failure_reason', 'latest_available_date',
                'catalog_updated_at', 'catalog_checked_at')
    state = {key: previous[key] for key in retained if key in previous}
    if previous.get('status') in ('error', 'auth_required') and previous.get('attempted_at'):
        state.setdefault('last_failure_at', previous['attempted_at'])
        state.setdefault('last_failure_reason', 'previous_failure')
    state.update(schema_version=1, attempted_at=iso(now), displayed_date=current.get('date'),
                 displayed_source_sha256=current.get('source_sha256'),
                 refresh_interval='monthly', region=BBOX, next_check_at=iso(now + timedelta(days=1)))
    phase = 'catalog_error'
    try:
        granule = discovery()
        datetime.strptime(granule['date'], '%Y-%m-%d')
        if granule['date'] > now.date().isoformat():
            raise ValueError('Future catalog date')
        state.update(latest_available_date=granule['date'], catalog_updated_at=granule.get('catalog_updated_at'),
                     catalog_checked_at=iso(now))
        if current.get('date', '')[:10] > granule['date']:
            raise ValueError('Catalog rollback')
        same = current.get('date', '')[:10] == granule['date'] and current.get('catalog_updated_at') == granule.get('catalog_updated_at')
        if same:
            try:
                validate_asset(current, granule['date'])
            except (ValueError, KeyError, TypeError, IndexError):
                same = False
        if not same or local_file:
            phase = 'download_error'
            with tempfile.TemporaryDirectory(prefix='odak-cygnss-') as temporary:
                filename = Path(local_file) if local_file else Path(temporary) / granule['filename']
                if not local_file:
                    downloader(granule, filename)
                phase = 'validation_failed'
                if filename.name != granule['filename'] or filename.stat().st_size > 32 * 1024 * 1024:
                    raise ValueError('Unexpected local source')
                result = builder(filename, granule['date'])
                validate_asset(result, granule['date'])
                result.update(source_sha256=hashlib.sha256(filename.read_bytes()).hexdigest(),
                              granule_id=granule['granule_id'], catalog_updated_at=granule.get('catalog_updated_at'),
                              prepared_at=iso(now))
                phase = 'publish_failed'
                atomic_json(asset_path, result)
                current = result
        state.update(status='ready', last_success_at=iso(now), displayed_date=current['date'],
                     displayed_source_sha256=current.get('source_sha256'),
                     next_check_at=iso(next_month(now)))
    except Exception as error:
        auth = isinstance(error, PermissionError) or isinstance(error, urllib.error.HTTPError) and error.code in (401, 403)
        state.update(status='auth_required' if auth else 'error', last_failure_at=iso(now),
                     last_failure_reason='auth_required' if auth else phase)
        # No exception messages, response bodies, credentials, signed URLs or paths are published.
    atomic_json(status_path, state)
    return state


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--file', type=Path, help='Import the newest official file downloaded locally')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    state = refresh(local_file=args.file, force=args.force)
    print(json.dumps(state, ensure_ascii=False))
    sys.exit(0 if state.get('status') in ('ready', 'busy') else 1)
