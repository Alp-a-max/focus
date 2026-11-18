"""Synthetic fixtures only, not validation against a NASA granule."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import netCDF4
import numpy as np

from read_cygnss import read_region


def fixture(path):
    with netCDF4.Dataset(path, 'w') as ds:
        ds.title = 'SYNTHETIC CYGNSS-shaped test fixture'
        for name, values, units in [('time', [0, 1], 'days since 2020-01-01 12:00:00'),
                                     ('lat', [36, 37], 'degrees_north'),
                                     ('lon', [31, 179, 181, 329], 'degrees_east')]:
            ds.createDimension(name, len(values))
            variable = ds.createVariable(name, 'f8', (name,))
            variable.units = units
            variable[:] = values
        for name, units in [('mp_concentration', 'count km-2'),
                            ('num_mp_samples', '1'), ('stddev_mp_samples', '1')]:
            variable = ds.createVariable(name, 'f8', ('lon', 'time', 'lat'), fill_value=-9999)
            variable.units = units
            variable[:] = 10 if name == 'mp_concentration' else 2
        ds['mp_concentration'][0, 0, 0] = -9999
        ds['mp_concentration'][0, 1, 0] = np.nan
        ds['mp_concentration'][0, 0, 1] = -1
        ds['mp_concentration'][0, 1, 1] = 0  # Real zero stays distinct from missing.
        ds['num_mp_samples'][1, 0, 0] = 0
        ds['num_mp_samples'][1, 0, 1] = -9999
        ds['stddev_mp_samples'][2, 0, 0] = -9999
        ds['stddev_mp_samples'][2, 0, 1] = .5


class ReaderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.file = self.root / 'synthetic.nc'
        fixture(self.file)

    def test_masks_dates_metadata_and_dimension_order(self):
        result = read_region(self.file, [30, 35, 32, 38])
        self.assertEqual(len(result['cells']), 1)
        cell = result['cells'][0]
        self.assertEqual(cell['mp_concentration'], 0)
        self.assertEqual(cell['date'], '2020-01-02T12:00:00')
        self.assertEqual(cell['lat'], 37)
        self.assertEqual(result['counts']['excluded'], 3)
        self.assertEqual(result['units']['mp_concentration'], 'count km-2')
        self.assertIn('SYNTHETIC', result['global_attributes']['title'])
        json.dumps(result, allow_nan=False)

    def test_antimeridian_and_optional_deviation(self):
        result = read_region(self.file, [170, 35, -170, 38])
        self.assertEqual(len(result['cells']), 6)
        self.assertEqual({cell['lon'] for cell in result['cells']}, {179, -179})
        self.assertEqual(sum(cell['stddev_mp_samples'] is None for cell in result['cells']), 1)
        self.assertEqual(next(cell['stddev_mp_samples'] for cell in result['cells']
                              if cell['date'] == '2020-01-01T12:00:00'
                              and cell['lat'] == 37 and cell['lon'] == -179), .5)

    def test_negative_deviation_remains_missing(self):
        with netCDF4.Dataset(self.file, 'a') as ds:
            ds['stddev_mp_samples'][3, 0, 0] = -0.1
        result = read_region(self.file, [-32, 35, -30, 38])
        self.assertIsNone(next(cell['stddev_mp_samples'] for cell in result['cells']
                               if cell['lat'] == 36 and cell['date'] == '2020-01-01T12:00:00'))

    def test_negative_longitude_and_empty_region(self):
        result = read_region(self.file, [-32, 35, -30, 38])
        self.assertEqual(len(result['cells']), 4)
        self.assertTrue(all(cell['lon'] == -31 for cell in result['cells']))
        self.assertEqual(read_region(self.file, [0, 0, 1, 1])['cells'], [])

    def test_declared_valid_range_and_scale(self):
        with netCDF4.Dataset(self.file, 'a') as ds:
            variable = ds['mp_concentration']
            variable.valid_range = np.array([0., 20.])
            variable.scale_factor = .5
            variable.set_auto_maskandscale(False)
            variable[3, 0, 0] = 30  # finite, but outside declared packed range
            variable[3, 1, 0] = 8
        result = read_region(self.file, [-32, 35, -30, 36.1])
        self.assertEqual(len(result['cells']), 1)
        self.assertEqual(result['cells'][0]['mp_concentration'], 4)

    def test_invalid_bbox_and_missing_metadata_fail(self):
        with self.assertRaises(ValueError):
            read_region(self.file, [float('nan'), 0, 1, 1])
        with netCDF4.Dataset(self.file, 'a') as ds:
            ds['time'].delncattr('units')
        with self.assertRaisesRegex(ValueError, 'time'):
            read_region(self.file, [30, 35, 32, 38])

    def test_cli_writes_json_and_preserves_input(self):
        before = self.file.read_bytes()
        out = self.root / 'result.json'
        command = [sys.executable, str(Path(__file__).with_name('read_cygnss.py')),
                   str(self.file), '--bbox', '30', '35', '32', '38', '--out', str(out)]
        subprocess.run(command, check=True, capture_output=True)
        self.assertEqual(json.loads(out.read_text(encoding='utf8'))['counts']['exported'], 1)
        failed = subprocess.run(command[:-1] + [str(self.file)], capture_output=True)
        self.assertNotEqual(failed.returncode, 0)
        self.assertEqual(self.file.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
