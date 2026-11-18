"""Prepare the official all-size model raster for a Leaflet EPSG:3857 map."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
import rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling, transform_bounds

MD5 = '416739e1891ab1e8117e05847f285fd3'
BINS = [0, 1, 10, 100, 1000, 10000, 100000]
COLORS = ['#440154', '#443983', '#31688e', '#21918c', '#35b779', '#90d743', '#fde725']
LABELS = ['<1', '1–<10', '10–<100', '100–<1 000', '1 000–<10 000', '10 000–<100 000', '≥100 000']


def concentrations(values, valid):
    """Preserve missing data as NaN; finite negative logs are legitimate."""
    result = np.full(values.shape, np.nan, dtype=np.float64)
    mask = valid & np.isfinite(values)
    with np.errstate(over='ignore', under='ignore'):
        result[mask] = np.power(10.0, values[mask])
    result[~np.isfinite(result) | (result <= 0)] = np.nan
    return result


def colorize(values):
    rgba = np.zeros(values.shape + (4,), dtype=np.uint8)
    valid = np.isfinite(values) & (values > 0)
    categories = np.searchsorted(BINS[1:], values[valid], side='right')
    palette = np.array([[int(color[i:i + 2], 16) for i in (1, 3, 5)] for color in COLORS], dtype=np.uint8)
    rgba[valid, :3] = palette[categories]
    rgba[valid, 3] = 255
    return rgba


def prepare(source, output):
    if hashlib.md5(source.read_bytes()).hexdigest() != MD5:
        raise ValueError('Source differs from inspected Figshare file 44299730.')
    with rasterio.open(source) as ds:
        if ds.crs.to_epsg() != 4326 or ds.count != 1 or ds.nodata != -9999:
            raise ValueError('Unexpected source CRS, bands or NoData.')
        logs = ds.read(1)
        values = concentrations(logs, ds.read_masks(1) > 0)
        target_transform, width, height = calculate_default_transform(ds.crs, 'EPSG:3857', ds.width, ds.height, *ds.bounds)
        # Keep the full outer pixel extent instead of rounding off the east edge.
        target_bounds = transform_bounds(ds.crs, 'EPSG:3857', *ds.bounds)
        target_transform = rasterio.transform.from_bounds(*target_bounds, width, height)
        projected = np.full((height, width), np.nan, dtype=np.float64)
        # Nearest-neighbor preserves source values and missing cells.
        reproject(values, projected, src_transform=ds.transform, src_crs=ds.crs,
                  dst_transform=target_transform, dst_crs='EPSG:3857',
                  src_nodata=np.nan, dst_nodata=np.nan, resampling=Resampling.nearest)
        projected_bounds = rasterio.transform.array_bounds(height, width, target_transform)
        west, south, east, north = transform_bounds('EPSG:3857', 'EPSG:4326', *projected_bounds)
        metadata = {
            'source': 'https://doi.org/10.6084/m9.figshare.5873142.v2',
            'download': 'https://ndownloader.figshare.com/files/44299730',
            'citation': 'Lebreton et al. (2018), Scientific Reports 8, 4666; Lebreton & Reisser, Figshare v2',
            'license': 'CC BY 4.0', 'license_url': 'https://creativecommons.org/licenses/by/4.0/',
            'research_year': 2018, 'source_file': source.name, 'source_md5': MD5,
            'source_crs': str(ds.crs), 'source_bounds': list(ds.bounds),
            'source_transform': list(ds.transform)[:6], 'source_shape': [ds.height, ds.width],
            'source_nodata': ds.nodata, 'source_units_metadata': ds.units[0],
            'unit_basis': 'Figshare v2 description states log10(g/km²); TIFF has no unit label.',
            'source_units': 'log10(g/km²)', 'display_units': 'g/km²',
            'quantity': 'Modelled plastic mass concentration, all size classes',
            'conversion': '10 ** source_value; masked and nonfinite cells remain missing',
            'source_valid_cells': int(np.isfinite(values).sum()),
            'source_missing_cells': int((~np.isfinite(values)).sum()),
            'source_log_range': [float(logs[np.isfinite(values)].min()), float(logs[np.isfinite(values)].max())],
            'concentration_range': [float(np.nanmin(values)), float(np.nanmax(values))],
            'image': 'assets/gpgp-mass.png', 'image_crs': 'EPSG:3857',
            'image_shape': [height, width], 'image_transform': list(target_transform)[:6],
            'bounds': [[south, west], [north, east]], 'resampling': 'nearest', 'opacity': 0.65,
            'bins': [{'min': value, 'max': BINS[i + 1] if i + 1 < len(BINS) else None,
                      'label': LABELS[i], 'color': COLORS[i]} for i, value in enumerate(BINS)],
        }
    output.mkdir(parents=True, exist_ok=True)
    Image.fromarray(colorize(projected)).save(output / 'gpgp-mass.png')
    (output / 'gpgp-mass.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf8')
    return metadata


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--out-dir', type=Path, default=Path('assets'))
    args = parser.parse_args()
    result = prepare(args.source, args.out_dir)
    print('Valid / missing:', result['source_valid_cells'], result['source_missing_cells'])
    print('g/km2 range:', result['concentration_range'], 'Leaflet bounds:', result['bounds'])
