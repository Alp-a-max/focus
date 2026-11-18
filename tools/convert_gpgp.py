"""Convert the official Figshare contour archive without changing geometry.

Dependency: pyshp>=3,<4. Run from the project root with a downloaded archive.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile

import shapefile

SOURCE = 'https://figshare.com/articles/dataset/5873142/2'
DOWNLOAD = 'https://ndownloader.figshare.com/files/44299727'
MD5 = 'ab6f0e9fdbbf6db6eb8e8bb59413887b'
WKT = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]'


def convert(archive):
    data = archive.read_bytes()
    if hashlib.md5(data).hexdigest() != MD5:
        raise ValueError('Archive differs from the inspected Figshare version 2 file.')
    with zipfile.ZipFile(io.BytesIO(data)) as source:
        if source.read('GPGP_contours.prj').decode().strip() != WKT:
            raise ValueError('Unexpected CRS. Reprojection needs review.')
        encoding = source.read('GPGP_contours.cpg').decode().strip()
        if encoding != 'latin9':
            raise ValueError('Unexpected DBF encoding.')
        reader = shapefile.Reader(
            shp=io.BytesIO(source.read('GPGP_contours.shp')),
            shx=io.BytesIO(source.read('GPGP_contours.shx')),
            dbf=io.BytesIO(source.read('GPGP_contours.dbf')), encoding='iso8859_15')
        if reader.shapeType != shapefile.POLYLINE:
            raise ValueError('Expected contour lines.')
        features = []
        for record in reader.iterShapeRecords():
            properties = record.record.as_dict()
            if properties['ELEV'] not in (1, 2, 3):
                raise ValueError('Unexpected contour level.')
            features.append({'type': 'Feature', 'properties': properties,
                             'geometry': record.shape.__geo_interface__})
        return {'type': 'FeatureCollection', 'bbox': list(reader.bbox),
                'metadata': {'source': SOURCE, 'download': DOWNLOAD,
                             'archive_md5': MD5, 'research_year': 2018,
                             'citation': 'Lebreton et al. (2018), Scientific Reports 8, 4666',
                             'paper_doi': '10.1038/s41598-018-22939-w',
                             'dataset_doi': '10.6084/m9.figshare.5873142.v2',
                             'license': 'CC BY 4.0',
                             'license_url': 'https://creativecommons.org/licenses/by/4.0/',
                             'source_crs_wkt': WKT,
                             'output_crs': 'WGS84 longitude, latitude (RFC 7946)',
                             'transformation': 'Format conversion only. All lines, vertices and ID/ELEV fields retained. No simplification or reprojection.',
                             'elev_meaning': {'1': '10 g/km²', '2': '100 g/km²', '3': '1 kg/km²'},
                             'interpretation': 'Historical modelled microplastic mass-concentration contours. Research year is not a measurement timestamp.'},
                'features': features}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--out', type=Path, default=Path('assets/gpgp-contours.json'))
    args = parser.parse_args()
    result = convert(args.archive)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, allow_nan=False) + '\n', encoding='utf8')
    print(len(result['features']), 'features, bounds', result['bbox'])
