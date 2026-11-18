"""Updater failure/scheduling checks use only temporary stores and mocked services."""
import copy
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
import update_cygnss as updater

NOW = datetime(2026, 11, 18, 12, tzinfo=timezone.utc)
BASE = json.loads((ROOT / 'assets/cygnss-north-pacific-20180816.json').read_text(encoding='utf8'))


def asset(date):
    value = copy.deepcopy(BASE)
    value.update(date=date + 'T12:00:00Z', catalog_updated_at='revision-1')
    return value


def granule(date='2026-10-28'):
    stamp = date.replace('-', '')
    return {'date':date, 'filename':f'cyg.ddmi.s{stamp}-120000-e{stamp}-120000.l3.grid-microplastic.a32.d33.nc',
            'granule_id':'test-only', 'catalog_updated_at':'revision-1'}


class UpdateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.asset_path = self.directory / 'cygnss-latest.json'
        updater.atomic_json(self.asset_path, asset('2018-08-16'))
        self.before = self.asset_path.read_bytes()

    def run_update(self, **changes):
        options = dict(directory=self.directory, force=True, now=NOW,
                       discovery=granule, builder=lambda filename,date:asset(date),
                       downloader=lambda item,destination:destination.write_bytes(b'test fixture only'))
        options.update(changes)
        return updater.refresh(**options)

    def test_successful_update_and_monthly_due_check(self):
        state = self.run_update()
        self.assertEqual(state['status'], 'ready')
        self.assertEqual(state['displayed_date'], '2026-10-28T12:00:00Z')
        self.assertEqual(state['next_check_at'], '2026-12-18T12:00:00Z')
        self.assertEqual(state['last_success_at'], '2026-11-18T12:00:00Z')
        self.assertEqual(self.run_update(force=False, discovery=lambda: self.fail('Not due')), state)

    def test_auth_failure_keeps_old_bytes_and_last_success(self):
        self.run_update()
        before = self.asset_path.read_bytes()
        def denied(item, destination):
            raise PermissionError('SECRET_MUST_NOT_APPEAR')
        newer = granule('2026-11-01')
        state = self.run_update(discovery=lambda:newer, downloader=denied)
        self.assertEqual(state['status'], 'auth_required')
        self.assertEqual(state['displayed_date'], '2026-10-28T12:00:00Z')
        self.assertEqual(state['latest_available_date'], '2026-11-01')
        self.assertIn('last_success_at', state)
        self.assertEqual(state['next_check_at'], '2026-11-19T12:00:00Z')
        self.assertNotIn('SECRET_MUST_NOT_APPEAR', json.dumps(state))
        self.assertEqual(self.asset_path.read_bytes(), before)

    def test_invalid_new_results_never_replace_good_data(self):
        for change in [lambda result:result.update(cells=[]),
                       lambda result:result.update(date='2025-01-01T12:00:00Z'),
                       lambda result:result.update(source_units='g/km²'),
                       lambda result:result['cells'][0].__setitem__(2, None)]:
            with self.subTest(change=change):
                def bad(filename, date):
                    result = asset(date); change(result); return result
                state = self.run_update(builder=bad)
                self.assertEqual(state['status'], 'error')
                self.assertEqual(self.asset_path.read_bytes(), self.before)

    def test_older_catalog_and_mismatched_local_file_are_rejected(self):
        self.run_update()
        before = self.asset_path.read_bytes()
        self.assertEqual(self.run_update(discovery=lambda:granule('2025-01-01'))['status'], 'error')
        wrong = self.directory / granule('2025-01-01')['filename']
        wrong.write_bytes(b'test')
        self.assertEqual(self.run_update(local_file=wrong)['status'], 'error')
        self.assertEqual(self.asset_path.read_bytes(), before)

    def test_corrupt_source_or_catalog_network_error_preserves_data(self):
        def fail(*args):
            raise ValueError('Invalid NetCDF')
        self.assertEqual(self.run_update(builder=fail)['status'], 'error')
        self.assertEqual(self.run_update(discovery=lambda: (_ for _ in ()).throw(urllib.error.URLError('offline')))['status'], 'error')
        self.assertEqual(self.asset_path.read_bytes(), self.before)

    def test_retries_transient_network_only(self):
        calls, waits = [], []
        def transient():
            calls.append(1)
            if len(calls) < 3: raise urllib.error.URLError('offline')
            return 'ok'
        self.assertEqual(updater.retry(transient, sleep=waits.append), 'ok')
        self.assertEqual(waits, [1, 2])
        error = urllib.error.HTTPError('https://example.org',401,'denied',{},None)
        try:
            with self.assertRaises(urllib.error.HTTPError):
                updater.retry(lambda: (_ for _ in ()).throw(error), sleep=lambda seconds:self.fail('Auth must not retry'))
        finally:
            error.close()

    def test_atomic_replace_failure_leaves_original_and_cleans_temp(self):
        with patch.object(updater.os, 'replace', side_effect=OSError('test')):
            with self.assertRaises(OSError): updater.atomic_json(self.asset_path, asset('2026-10-28'))
        self.assertEqual(self.asset_path.read_bytes(), self.before)
        self.assertEqual(list(self.directory.glob('*.tmp')), [])

    def test_other_process_lock_does_not_start_second_update(self):
        with updater.update_lock(self.directory / '.cygnss-update.lock') as locked:
            self.assertTrue(locked)
            self.assertEqual(self.run_update(), {'status':'busy'})
        self.assertEqual(self.run_update()['status'], 'ready')

    def test_status_write_failure_leaves_new_valid_asset_recoverable(self):
        real_write = updater.atomic_json
        def write(path, value):
            if path.name == 'cygnss-status.json': raise OSError('test')
            real_write(path, value)
        with patch.object(updater, 'atomic_json', side_effect=write):
            with self.assertRaises(OSError): self.run_update()
        stored = updater.read_json(self.asset_path)
        updater.validate_asset(stored, '2026-10-28')
        self.assertEqual(self.run_update()['status'], 'ready')

    def test_month_end_and_failure_history(self):
        self.assertEqual(updater.next_month(datetime(2026,1,31,tzinfo=timezone.utc)).day, 28)
        updater.atomic_json(self.directory/'cygnss-status.json', {'status':'error','attempted_at':'2026-11-17T12:00:00Z'})
        self.assertEqual(self.run_update()['last_failure_at'], '2026-11-17T12:00:00Z')

    def test_redirect_never_forwards_credentials_to_another_origin(self):
        request = updater.urllib.request.Request('https://archive.podaac.earthdata.nasa.gov/data', headers={'Authorization':'Bearer TEST_ONLY_TOKEN'})
        handler = updater.SafeRedirect()
        cross = handler.redirect_request(request, None, 302, 'Found', {}, 'https://example.cloudfront.net/file')
        self.assertIsNone(cross.get_header('Authorization'))
        same = handler.redirect_request(request, None, 302, 'Found', {}, 'https://archive.podaac.earthdata.nasa.gov/other')
        self.assertEqual(same.get_header('Authorization'), 'Bearer TEST_ONLY_TOKEN')
        with self.assertRaises(ValueError):
            handler.redirect_request(request, None, 302, 'Found', {}, 'http://archive.podaac.earthdata.nasa.gov/file')
        with self.assertRaises(ValueError):
            handler.redirect_request(request, None, 302, 'Found', {}, 'https://attacker.example/file')


if __name__ == '__main__': unittest.main()
