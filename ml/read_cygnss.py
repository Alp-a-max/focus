"""Export a local CYGNSS L3 microplastic NetCDF region without network access."""
import argparse
import json
import math
import os
from pathlib import Path
import tempfile

import netCDF4
import numpy as np

SOURCE = 'https://podaac.jpl.nasa.gov/dataset/CYGNSS_L3_MICROPLASTIC_V3.2'
FIELDS = ('mp_concentration', 'num_mp_samples', 'stddev_mp_samples')
COORDS = ('time', 'lat', 'lon')


def json_value(value):
    if isinstance(value, np.ndarray):
        return json_value(value.tolist())
    if isinstance(value, np.generic):
        return json_value(value.item())
    if isinstance(value, (list, tuple)):
        return [json_value(item) for item in value]
    if isinstance(value, bytes):
        return value.decode('utf8', errors='replace')
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def attributes(variable):
    return {name: json_value(variable.getncattr(name)) for name in variable.ncattrs()}


def number(value):
    if np.ma.is_masked(value) or not np.isfinite(value):
        return None
    return float(value)


def validate_bbox(bounds):
    west, south, east, north = bounds
    if not all(math.isfinite(v) for v in bounds):
        raise ValueError('Bölge sınırları sonlu sayılar olmalı.')
    if not (-180 <= west <= 180 and -180 <= east <= 180 and west != east
            and -90 <= south < north <= 90):
        raise ValueError('Sınırlar batı güney doğu kuzey sırasıyla geçerli dereceler olmalı.')


def read_region(filename, bounds):
    validate_bbox(bounds)
    west, south, east, north = bounds
    with netCDF4.Dataset(filename) as dataset:
        variables = dataset.variables
        for name in COORDS + FIELDS:
            if name not in variables:
                raise ValueError(f'Gerekli değişken bulunamadı: {name}')
            if not getattr(variables[name], 'units', '').strip():
                raise ValueError(f'Birim metaverisi eksik: {name}')
        for name in COORDS:
            if variables[name].dimensions != (name,):
                raise ValueError(f'Tek boyutlu {name} koordinatı gerekli.')
        if variables['lat'].units != 'degrees_north' or variables['lon'].units != 'degrees_east':
            raise ValueError('Koordinat birimleri degrees_north / degrees_east olmalı.')
        for name in FIELDS:
            if set(variables[name].dimensions) != set(COORDS) or variables[name].ndim != 3:
                raise ValueError(f'{name} time, lat, lon boyutlarını içermeli.')
        # netCDF4 applies _FillValue, missing_value, valid_range and scale/offset.
        dataset.set_auto_maskandscale(True)
        lat = np.ma.masked_invalid(variables['lat'][:])
        lon = np.ma.masked_invalid(variables['lon'][:])
        latitude = np.ma.filled(lat, np.nan)
        longitude_raw = np.ma.filled(lon, np.nan)
        longitude = (longitude_raw + 180) % 360 - 180
        lat_indices = np.flatnonzero(np.isfinite(latitude) & (latitude >= south) & (latitude <= north))
        valid_lon = np.isfinite(longitude_raw) & (longitude_raw >= -180) & (longitude_raw <= 360)
        if west < east:
            in_longitude = (longitude >= west) & (longitude <= east)
        else:
            in_longitude = (longitude >= west) | (longitude <= east)
        lon_indices = np.flatnonzero(valid_lon & in_longitude)
        time = variables['time']
        calendar = getattr(time, 'calendar', 'standard')
        cells = []
        considered = 0
        skipped_times = 0
        for ti, raw_time in enumerate(time[:]):
            if number(raw_time) is None:
                skipped_times += 1
                continue
            date = netCDF4.num2date(raw_time, time.units, calendar=calendar).isoformat()
            # Calendar is recorded separately, including non-Gregorian calendars.
            if not len(lat_indices) or not len(lon_indices):
                continue
            grids = {}
            for name in FIELDS:
                variable = variables[name]
                selectors = {'time': slice(ti, ti + 1), 'lat': lat_indices, 'lon': lon_indices}
                grid = variable[tuple(selectors[d] for d in variable.dimensions)]
                grids[name] = np.transpose(grid, [variable.dimensions.index(d) for d in COORDS])[0]
            for row, lat_index in enumerate(lat_indices):
                for col, lon_index in enumerate(lon_indices):
                    considered += 1
                    concentration = number(grids[FIELDS[0]][row, col])
                    samples = number(grids[FIELDS[1]][row, col])
                    deviation = number(grids[FIELDS[2]][row, col])
                    if concentration is None or concentration < 0 or samples is None or samples <= 0 or not samples.is_integer():
                        continue
                    if deviation is not None and deviation < 1:
                        deviation = None
                    cells.append({'date': date, 'lat': float(latitude[lat_index]),
                                  'lon': float(longitude[lon_index]),
                                  'mp_concentration': concentration, 'num_mp_samples': int(samples),
                                  'stddev_mp_samples': deviation})
        return {
            'source': {'reference_dataset': SOURCE, 'doi': '10.5067/CYGNS-L3P32',
                       'file': Path(filename).name, 'verification': 'local file schema and metadata'},
            'bbox': dict(zip(('west', 'south', 'east', 'north'), bounds)),
            'global_attributes': attributes(dataset),
            'variables': {name: {'dimensions': list(variables[name].dimensions),
                                 'attributes': attributes(variables[name])} for name in variables},
            'units': {name: variables[name].units for name in COORDS + FIELDS},
            'calendar': calendar,
            'date_timezone': 'UTC per CYGNSS product specification',
            'selection': 'Inclusive cell centers; west > east crosses the antimeridian.',
            'missing_policy': 'Invalid concentration or missing/nonpositive sample count excludes the cell. Invalid geometric deviation is null.',
            'counts': {'considered': considered, 'exported': len(cells),
                       'excluded': considered - len(cells), 'invalid_times': skipped_times},
            'cells': cells,
        }


def main():
    parser = argparse.ArgumentParser(description='Yerel CYGNSS L3 mikroplastik NetCDF bölgesini JSON olarak oku.')
    parser.add_argument('file', type=Path)
    parser.add_argument('--bbox', nargs=4, type=float, required=True, metavar=('WEST', 'SOUTH', 'EAST', 'NORTH'))
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    temporary = None
    try:
        if not args.file.is_file():
            raise ValueError('Yerel NetCDF dosyası bulunamadı.')
        if args.file.resolve() == args.out.resolve():
            raise ValueError('Çıktı dosyası girdiyle aynı olamaz.')
        result = read_region(args.file, args.bbox)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf8', dir=args.out.parent,
                                         suffix='.tmp', delete=False) as output:
            temporary = Path(output.name)
            json.dump(result, output, ensure_ascii=False, indent=2, allow_nan=False)
            output.write('\n')
        os.replace(temporary, args.out)
        print(f'{len(result["cells"])} geçerli hücre yazıldı: {args.out}')
    except (OSError, ValueError, RuntimeError) as error:
        parser.exit(1, f'Hata: {error}\n')
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


if __name__ == '__main__':
    main()
