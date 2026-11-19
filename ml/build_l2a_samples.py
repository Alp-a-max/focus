"""Re-extract MARIDA-labelled pixels from same-day Sentinel-2 L2A COGs.
The ACOLITE input images are not reused as L2A training features.
Outputs and public-data caches stay under ignored ml/datasets/.
"""
import argparse, concurrent.futures, hashlib, json, re, subprocess, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.vrt import WarpedVRT
from rasterio.warp import transform
from l2a_contract import BANDS, contract, labelled_mask, reflectance

ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'datasets'/'marida-sample'
OUTPUT=ROOT/'datasets'/'marida-l2a'
CATALOG='https://earth-search.aws.element84.com/v1/search'
ASSET_HOST='sentinel-cogs.s3.us-west-2.amazonaws.com'

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def choose_scene(features, tile, date, epsg):
    matched=[]
    for item in features:
        props=item.get('properties',{})
        match=re.fullmatch(r'S2[ABC]_(\d{2}[A-Z]{3})_(\d{8})_\d+_L2A',item.get('id',''))
        if not match or match[1]!=tile or match[2]!=date.strftime('%Y%m%d') or props.get('proj:epsg')!=epsg: continue
        if props.get('datetime','')[:10]!=date.strftime('%Y-%m-%d'): continue
        if not all(name in item.get('assets',{}) for name in (*BANDS,'scl')): continue
        matched.append(item)
    if not matched: raise ValueError('No same-day, same-tile L2A scene with all required bands')
    # Deterministic choice; labels/performance are never used to pick a reprocessing.
    # Reprocessed products can have different catalogue datetime fields for the SAME datatake.
    # Ignore only the processing-baseline suffix of its acquisition identifier.
    datatakes=[re.sub(r'_N[0-9.]+$','',x['properties'].get('s2:datatake_id','')) for x in matched]
    if all(datatakes):
        if len(set(datatakes))!=1:raise ValueError('Multiple same-day acquisitions; original acquisition identifier required')
    else:
        times=[datetime.fromisoformat(x['properties']['datetime'].replace('Z','+00:00')) for x in matched]
        if (max(times)-min(times)).total_seconds()>60:raise ValueError('Ambiguous acquisition without datatake identifier')
    return sorted(matched,key=lambda x:(str(x['properties'].get('s2:processing_baseline') or ''),x['id']),reverse=True)[0]

def scene_for(label_path, profile):
    match=re.fullmatch(r'S2_(\d{1,2}-\d{1,2}-\d{2})_(\d{2}[A-Z]{3})',label_path.parent.name)
    if not match: raise ValueError('Invalid original scene identifier')
    date=datetime.strptime(match[1],'%d-%m-%y').replace(tzinfo=timezone.utc)
    cache=OUTPUT/'catalog'/(label_path.parent.name+'.json')
    if cache.exists(): features=json.loads(cache.read_text(encoding='utf8'))
    else:
        affine=profile['transform']; x,y=affine*(profile['width']/2,profile['height']/2)
        lon,lat=transform(profile['crs'],'EPSG:4326',[x],[y]);lon,lat=lon[0],lat[0]
        params=urllib.parse.urlencode({'collections':'sentinel-2-l2a','bbox':f'{lon-.001},{lat-.001},{lon+.001},{lat+.001}',
          'datetime':date.isoformat().replace('+00:00','Z')+'/'+(date+timedelta(days=1)).isoformat().replace('+00:00','Z'),'limit':50})
        url=CATALOG+'?'+params;features=[];visited=set()
        for page in range(5):
            if url in visited:raise ValueError('Repeated catalogue page')
            visited.add(url)
            with urllib.request.urlopen(url,timeout=45) as response:data=json.load(response)
            batch=data.get('features')
            if not isinstance(batch,list):raise ValueError('Invalid same-day catalogue response')
            features.extend(batch)
            matched=data.get('numberMatched')
            if not batch or (isinstance(matched,int) and len(features)>=matched):break
            following=next((x for x in data.get('links',[]) if x.get('rel')=='next'),None)
            if not following:break
            destination=urllib.parse.urlsplit(urllib.parse.urljoin(url,following['href']))
            if destination.scheme!='https' or destination.netloc!='earth-search.aws.element84.com' or destination.path!='/v1/search' or following.get('method','GET')!='GET':
                raise ValueError('Invalid catalogue continuation')
            url=destination.geturl()
        else:raise ValueError('Same-day catalogue scan limit reached')
        cache.parent.mkdir(parents=True,exist_ok=True)
        temporary=cache.with_suffix('.'+str(__import__('threading').get_ident())+'.tmp');temporary.write_text(json.dumps(features),encoding='utf8');temporary.replace(cache)
    return choose_scene(features,match[2],date,profile['crs'].to_epsg())

def read_asset(asset, profile):
    url=urllib.parse.urlsplit(asset['href'])
    if url.scheme!='https' or url.hostname!=ASSET_HOST or url.username or url.password or not url.path.endswith('.tif'):
        raise ValueError('Unsupported COG source')
    with rasterio.open(asset['href']) as src:
        # Explicit target grid is the original annotation grid, not an arbitrary crop.
        with WarpedVRT(src,crs=profile['crs'],transform=profile['transform'],width=profile['width'],height=profile['height'],
                       resampling=Resampling.nearest,src_nodata=0,nodata=np.nan,dtype='float32') as vrt:
            values=vrt.read(1)
    return values

def extract(label_path):
    split=label_path.relative_to(SOURCE).parts[0]
    out=OUTPUT/split/(label_path.stem[:-3]+'.npz')
    metadata_path=out.with_suffix('.json')
    confidence_path=label_path.with_name(label_path.name.replace('_cl.tif','_conf.tif'))
    label_sha,confidence_sha=sha(label_path),sha(confidence_path)
    if out.exists() and metadata_path.exists():
        metadata=json.loads(metadata_path.read_text(encoding='utf8'))
        if metadata.get('contract')==contract() and metadata.get('label_sha256')==label_sha and metadata.get('confidence_sha256')==confidence_sha and metadata.get('samples_sha256')==sha(out):
            profile={'crs':rasterio.crs.CRS.from_string(metadata['crs']),'transform':rasterio.Affine(*metadata['transform']),'width':256,'height':256}
            if scene_for(label_path,profile)['id']!=metadata['scene_id']:raise ValueError('Cached scene selection differs')
            return metadata
    with rasterio.open(label_path) as ds:
        labels=ds.read(1);profile=ds.profile
    with rasterio.open(confidence_path) as ds:
        if ds.crs!=profile['crs'] or ds.transform!=profile['transform']:raise ValueError('Confidence georeferencing mismatch')
        confidence=ds.read(1)
    if labels.shape!=(256,256) or profile['crs'] is None:raise ValueError('Unexpected annotation grid')
    labelled=labelled_mask(labels,confidence)
    item=scene_for(label_path,profile);sources=[];arrays=[]
    rows,cols=np.where(labelled)
    request={'scene':item,'grid':{'width':256,'height':256,'transform':list(profile['transform'])[:6],
      'epsg':profile['crs'].to_epsg(),'indices':(rows*256+cols).tolist()}}
    process=subprocess.run(['node',str(ROOT/'read_l2a_grid.cjs')],input=json.dumps(request),text=True,capture_output=True,timeout=125)
    if process.returncode:raise ValueError('COG reader: '+process.stderr.strip()[:300])
    result=json.loads(process.stdout)
    features=np.asarray(result['features'],dtype=np.float32).reshape((-1,len(BANDS)))
    scl=np.asarray(result['scl'],dtype=np.float32)
    if len(features)!=int(labelled.sum()) or len(scl)!=len(features):raise ValueError('COG reader sample count mismatch')
    for band in BANDS:
        asset=item['assets'][band];sources.append({'band':band,'href':asset['href'],'raster':asset['raster:bands'][0]})
    finite=np.isfinite(features).all(axis=1)
    classes=labels[labelled]
    rows,cols=np.where(labelled)
    out.parent.mkdir(parents=True,exist_ok=True)
    # Keep SCL and all labelled finite classes: excluding clouds etc only from evaluation hides false positives.
    np.savez_compressed(out,features=features[finite],classes=classes[finite],scl=scl[finite],rows=rows[finite],cols=cols[finite])
    metadata={'schema_version':1,'contract':contract(),'split':split,'original_scene':label_path.parent.name,
      'patch':label_path.name,'label_sha256':label_sha,'confidence_sha256':confidence_sha,'scene_id':item['id'],
      'datetime':item['properties']['datetime'],'labelled_pixels':int(labelled.sum()),'finite_pixels':int(finite.sum()),
      'labelled_debris':int((classes==1).sum()),'finite_debris':int(((classes==1)&finite).sum()),
      'scl_water_debris':int(((classes==1)&finite&(scl==6)).sum()),'samples_sha256':sha(out),
      'crs':profile['crs'].to_string(),'transform':list(profile['transform'])[:6],'sources':sources}
    metadata_path.write_text(json.dumps(metadata,indent=2),encoding='utf8')
    return metadata

def main():
    global SOURCE
    parser=argparse.ArgumentParser();parser.add_argument('--labels',type=Path,default=SOURCE);parser.add_argument('--workers',type=int,default=2);parser.add_argument('--limit',type=int,default=0)
    args=parser.parse_args()
    SOURCE=args.labels.resolve()
    if not 1<=args.workers<=4 or args.limit<0:parser.error('workers 1..4; nonnegative limit')
    paths=sorted(SOURCE.glob('*/*/*_cl.tif'))
    if not paths:raise SystemExit('Run the original MARIDA subset downloader first')
    if args.limit:paths=paths[:args.limit]
    OUTPUT.mkdir(parents=True,exist_ok=True);records=[];failures=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures={pool.submit(extract,path):path for path in paths}
        for future in concurrent.futures.as_completed(futures):
            path=futures[future]
            try:
                record=future.result();records.append(record)
                print(f"OK {record['split']}/{record['patch']}: {record['finite_debris']}/{record['labelled_debris']} labelled debris pixels covered",flush=True)
            except Exception as error:
                failure={'path':str(path.relative_to(SOURCE)),'error':str(error)}
                try:
                    with rasterio.open(path) as ds:labels=ds.read(1)
                    with rasterio.open(path.with_name(path.name.replace('_cl.tif','_conf.tif'))) as ds:confidence=ds.read(1)
                    mask=labelled_mask(labels,confidence)
                    failure.update(labelled_pixels=int(mask.sum()),labelled_debris=int(((labels==1)&mask).sum()))
                except Exception:pass
                failures.append(failure)
                print('FAILED',path.name,str(error),flush=True)
    report={'contract':contract(),'created_at':datetime.now(timezone.utc).isoformat(),'expected_patches':len(paths),
      'complete':not failures,'records':sorted(records,key=lambda x:(x['split'],x['patch'])),'failures':failures,
      'label_manifest_sha256':sha(SOURCE/'manifest.json'),
      'limits':['Small positive-scene-enriched MARIDA subset with optional prespecified confusers; not an operational benchmark.',
                'Georeferenced weak annotations are reused on same-day L2A data; pixel coregistration and annotation uncertainty remain.',
                'Scene-disjoint original splits can share geographic regions; no Black Sea validation.']}
    (OUTPUT/'manifest.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    print(f'Extracted {len(records)}/{len(paths)} patches; failed {len(failures)}',flush=True)
    if failures:raise SystemExit(1)

if __name__=='__main__':main()
