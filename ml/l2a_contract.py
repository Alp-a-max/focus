"""Shared, explicit Sentinel-2 L2A feature contract for training and inference."""
import numpy as np

SCHEMA = 'focus-sentinel2-l2a-11-v1'
BANDS = ('coastal','blue','green','red','rededge1','rededge2','rededge3','nir','nir08','swir16','swir22')
BAND_IDS = ('B01','B02','B03','B04','B05','B06','B07','B08','B8A','B11','B12')

def reflectance(raw, metadata):
    """Mask raw nodata before scaling; negative valid reflectance stays valid."""
    if not all(k in metadata for k in ('scale','offset','nodata')):
        raise ValueError('Explicit STAC scale, offset and nodata are required')
    scale, offset = float(metadata['scale']), float(metadata['offset'])
    if not np.isfinite([scale,offset]).all() or scale <= 0:
        raise ValueError('Invalid reflectance scale or offset')
    raw = np.asarray(raw, dtype=np.float32)
    missing = ~np.isfinite(raw) | (raw == metadata['nodata'])
    result = raw * scale + offset
    result[missing] = np.nan
    return result

def labelled_mask(labels, confidence):
    if labels.shape != confidence.shape:
        raise ValueError('Label and confidence grids must match')
    return (labels >= 1) & (labels <= 15) & (confidence >= 1) & (confidence <= 2)

def check_contract(contract):
    if contract.get('schema') != SCHEMA or contract.get('bands') != list(BANDS) or contract.get('processing') != 'Sentinel-2 L2A surface reflectance' or contract.get('resampling') != 'nearest' or contract.get('band_ids') != list(BAND_IDS) or contract.get('label_grid_m') != 10:
        raise ValueError('Incompatible model input contract')

def contract():
    return {'schema':SCHEMA,'bands':list(BANDS),'band_ids':list(BAND_IDS),
            'processing':'Sentinel-2 L2A surface reflectance','resampling':'nearest',
            'label_grid_m':10,'score_kind':'uncalibrated random-forest score'}
