import json
from pathlib import Path
import tempfile
import unittest

import numpy as np
from PIL import Image
import rasterio
from rasterio.warp import transform

from prepare_gpgp_raster import concentrations, colorize, prepare

SOURCE = Path(__file__).parent / 'data' / 'MassConcentrationAllSizes.tif'


class RasterTests(unittest.TestCase):
    def test_log_conversion_and_missing_cells(self):
        raw = np.array([[-2., 0., 1., 2., -9999., np.nan, np.inf, -np.inf]])
        actual = concentrations(raw, raw != -9999)
        np.testing.assert_allclose(actual[0, :4], [.01, 1, 10, 100])
        self.assertTrue(np.isnan(actual[0, 4:]).all())
        self.assertTrue((colorize(actual)[0, 4:, 3] == 0).all())

    def test_legend_boundaries(self):
        rgba = colorize(np.array([[.1, 1, 10, 100, 1000, 10000, 100000]]))
        self.assertEqual(rgba[0].tolist(), [[68,1,84,255], [68,57,131,255],
                         [49,104,142,255], [33,145,140,255], [53,183,121,255],
                         [144,215,67,255], [253,231,37,255]])

    def test_real_raster_extent_and_every_reprojected_pixel(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp)
            metadata = prepare(SOURCE, output)
            self.assertEqual(metadata['source_valid_cells'], 24049)
            self.assertEqual(metadata['source_missing_cells'], 1277)
            self.assertEqual(metadata['source_crs'], 'EPSG:4326')
            self.assertIsNone(metadata['source_units_metadata'])
            np.testing.assert_allclose(metadata['bounds'], [[20, -160], [45.2, -119.8]], atol=1e-10)
            self.assertAlmostEqual(metadata['concentration_range'][0], 10 ** -2.51397)
            self.assertAlmostEqual(metadata['concentration_range'][1], 10 ** 5.23479)
            image = np.array(Image.open(output / 'gpgp-mass.png'))
            height, width = metadata['image_shape']
            rows, cols = np.indices((height, width))
            affine = rasterio.Affine(*metadata['image_transform'])
            x = affine.c + affine.a * (cols.ravel() + .5)
            y = affine.f + affine.e * (rows.ravel() + .5)
            lon, lat = transform('EPSG:3857', 'EPSG:4326', x, y)
            with rasterio.open(SOURCE) as source:
                source_rows, source_cols = rasterio.transform.rowcol(source.transform, lon, lat)
                raw = source.read(1)[source_rows, source_cols].reshape(height, width)
            expected = colorize(concentrations(raw, raw != -9999))
            np.testing.assert_array_equal(image, expected)
            self.assertGreater((image[..., 3] == 0).sum(), 0)
            json.loads((output / 'gpgp-mass.json').read_text(encoding='utf8'))


if __name__ == '__main__':
    unittest.main()
