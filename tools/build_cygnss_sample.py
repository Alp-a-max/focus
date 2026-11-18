"""Publish only the verified CYGNSS North Pacific sample, using an allowlist."""
import argparse
import json
import math
from pathlib import Path

DOI = '10.5067/CYGNS-L3P32'
DATE = '2018-08-16T12:00:00'
BBOX = {'west': -150.0, 'south': 25.0, 'east': -145.0, 'north': 30.0}


def build(data):
    if data['source']['doi'] != DOI or data['bbox'] != BBOX:
        raise ValueError('Expected the verified North Pacific sample.')
    if data['units']['mp_concentration'] != 'count km-2':
        raise ValueError('Unexpected concentration units.')
    metadata = data['global_attributes']
    if (str(metadata.get('version_id')) != '3.2' or str(metadata.get('l3_data_version')) != '3.3'
            or metadata.get('time_coverage_duration') != 'P30DT00H00M00S'):
        raise ValueError('Unexpected product version or averaging duration.')
    if len(data['cells']) != 441:
        raise ValueError('Expected 441 input cells.')
    cells = []
    seen = set()
    for row in data['cells']:
        lat, lon = row['lat'], row['lon']
        if row['date'] != DATE or not (25 <= lat <= 30 and -150 <= lon <= -145):
            raise ValueError('Unexpected date or cell position.')
        if lat * 4 != round(lat * 4) or lon * 4 != round(lon * 4) or (lat, lon) in seen:
            raise ValueError('Expected unique 0.25 degree grid centers.')
        seen.add((lat, lon))
        value, samples = row['mp_concentration'], row['num_mp_samples']
        if (not isinstance(value, (float, int)) or isinstance(value, bool) or not math.isfinite(value)
                or value < 0 or not isinstance(samples, int) or isinstance(samples, bool) or samples <= 0):
            continue
        cells.append([lat, lon, value, samples])
    cells.sort(key=lambda row: (row[0], row[1]))
    return {'schema_version': 1, 'source_doi': DOI,
            'source_units': 'count km-2', 'display_units': 'adet/km²',
            'date': DATE + 'Z', 'bbox_centers': BBOX, 'grid_step_deg': 0.25,
            'averaging_days': 30, 'averaging_degrees': 1,
            'product_version': '3.2', 'data_version': '3.3',
            'columns': ['lat', 'lon', 'mp_concentration', 'num_mp_samples'],
            'input_cells': 441, 'excluded_cells': 441 - len(cells), 'cells': cells}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=Path('ml/output/cygnss-north-pacific-20180816.json'))
    parser.add_argument('--out', type=Path, default=Path('assets/cygnss-north-pacific-20180816.json'))
    args = parser.parse_args()
    if args.input.resolve() == args.out.resolve():
        parser.error('Input and output must differ.')
    result = build(json.loads(args.input.read_text(encoding='utf8')))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n', encoding='utf8')
    print(f'{len(result["cells"])} cells written to {args.out}')
