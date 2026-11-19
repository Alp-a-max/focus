"""Keep original positive-scene sample and add preselected MARIDA confusers.
Selection uses official labels and split files only, never model/test predictions.
Only annotation TIFFs are downloaded; L2A reflectance is extracted separately.
"""
import hashlib,json,re,shutil,urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parent
BASE='https://data.source.coop/ntua/marida/'
ORIGINAL=ROOT/'datasets'/'marida-sample'
DEST=ROOT/'datasets'/'marida-l2a-labels'
HARD_CLASSES={2:'Dense Sargassum',3:'Sparse Sargassum',4:'Natural Organic Material',5:'Ship',9:'Foam',12:'Waves',14:'Wakes'}

def read_file(relative):
 cache=DEST/'source-metadata'/relative
 if cache.exists():return cache.read_bytes()
 with urllib.request.urlopen(BASE+relative,timeout=60) as response:data=response.read()
 cache.parent.mkdir(parents=True,exist_ok=True);cache.write_bytes(data)
 return data

def main():
 DEST.mkdir(parents=True,exist_ok=True)
 initial=json.loads((ORIGINAL/'manifest.json').read_text(encoding='utf8'))
 mapping=json.loads(read_file('labels_mapping.txt'))
 selected={};reasons={}
 for split in ('train','val','test'):
  official=read_file('splits/'+split+'_X.txt').decode().split()
  chosen=set(initial['splits'][split]);counts={}
  for class_id,name in HARD_CLASSES.items():
   choices=sorted(p for p in official if not mapping['S2_'+p+'.tif'][0] and mapping['S2_'+p+'.tif'][class_id-1])
   picked=choices[:(3 if split=='train' else 2)]
   chosen.update(picked);counts[name]=len(picked)
  selected[split]=sorted(chosen);reasons[split]=counts
 groups={s:{p.rsplit('_',1)[0] for p in v} for s,v in selected.items()}
 for i,a in enumerate(groups):
  for b in list(groups)[i+1:]:
   if groups[a]&groups[b]:raise ValueError('Official scene overlap: '+a+'/'+b)
 sources=[]
 for split,patches in selected.items():
  for patch in patches:
   if not re.fullmatch(r'\d{1,2}-\d{1,2}-\d{2}_\d{2}[A-Z]{3}_\d+',patch):raise ValueError('Invalid official patch ID')
   scene='S2_'+patch.rsplit('_',1)[0]
   folder=DEST/split/scene;folder.mkdir(parents=True,exist_ok=True)
   for suffix in ('_cl.tif','_conf.tif'):
    name='S2_'+patch+suffix;destination=folder/name;existing=ORIGINAL/split/scene/name
    if not destination.exists():
     if existing.exists():shutil.copyfile(existing,destination)
     else:
      with urllib.request.urlopen(BASE+'patches/'+scene+'/'+name,timeout=60) as response:data=response.read()
      temporary=destination.with_suffix('.tmp');temporary.write_bytes(data);temporary.replace(destination)
    sources.append({'split':split,'file':scene+'/'+name,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()})
  print(split,len(patches),'patches',flush=True)
 (DEST/'manifest.json').write_text(json.dumps({'source':BASE,'selection':'Original enriched subset plus first 3 train / 2 validation and test debris-free patches per prespecified confuser class, sorted by official ID',
  'confuser_selection_counts':reasons,'splits':selected,'files':sources},indent=2),encoding='utf8')
 print('Annotation preparation complete; original dataset and model preserved',flush=True)

if __name__=='__main__':main()
