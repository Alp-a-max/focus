import json
import unittest

from build_cygnss_sample import build


def fixture():
    return {'source': {'doi': '10.5067/CYGNS-L3P32', 'private_note': 'DO_NOT_PUBLISH'},
            'bbox': {'west': -150., 'south': 25., 'east': -145., 'north': 30.},
            'units': {'mp_concentration': 'count km-2'},
            'global_attributes': {'version_id': '3.2', 'l3_data_version': '3.3',
                                  'time_coverage_duration': 'P30DT00H00M00S', 'private_note': 'DO_NOT_PUBLISH'},
            'cells': [{'lat': 25 + i / 4, 'lon': -150 + j / 4, 'date': '2018-08-16T12:00:00',
                       'mp_concentration': 12000., 'num_mp_samples': 1000,
                       'stddev_mp_samples': .15, 'private_note': 'DO_NOT_PUBLISH'}
                      for i in range(21) for j in range(21)]}


class BuildTests(unittest.TestCase):
    def test_allowlist_excludes_unneeded_fields_and_output_is_deterministic(self):
        data = fixture()
        result = build(data)
        self.assertEqual(len(result['cells']), 441)
        self.assertEqual(result['cells'][0], [25, -150, 12000, 1000])
        self.assertNotIn('DO_NOT_PUBLISH', json.dumps(result))
        self.assertNotIn('stddev_mp_samples', json.dumps(result))
        data['cells'].reverse()
        self.assertEqual(build(data), result)

    def test_missing_values_are_omitted_while_real_zero_is_preserved(self):
        data = fixture()
        data['cells'][0]['mp_concentration'] = None
        data['cells'][1]['mp_concentration'] = float('nan')
        data['cells'][2]['num_mp_samples'] = 0
        data['cells'][3]['mp_concentration'] = 0
        result = build(data)
        self.assertEqual(len(result['cells']), 438)
        self.assertEqual(result['excluded_cells'], 3)
        self.assertEqual(result['cells'][0], [25, -149.25, 0, 1000])
        json.dumps(result, allow_nan=False)

    def test_invalid_metadata_grid_and_date_are_rejected(self):
        for key, value in [('date', '2020-01-01T00:00:00'), ('lat', 25.1)]:
            data = fixture()
            data['cells'][0][key] = value
            with self.assertRaises(ValueError):
                build(data)
        data = fixture()
        data['global_attributes']['l3_data_version'] = 'other'
        with self.assertRaises(ValueError):
            build(data)


if __name__ == '__main__':
    unittest.main()
