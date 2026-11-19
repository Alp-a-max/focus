"""Train a separate L2A baseline. Validation selects threshold; test is evaluated once.
This is a small research benchmark, not a calibrated plastic detection service.
"""
import argparse, hashlib, json
from pathlib import Path
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import average_precision_score, confusion_matrix, precision_score, recall_score, f1_score
from l2a_contract import BANDS, check_contract, contract

ROOT=Path(__file__).resolve().parent
DATA=ROOT/'datasets'/'marida-l2a'
OUTPUT=ROOT/'output'

def metrics(y,scores,threshold):
    predicted=scores>=threshold
    return {'pixels':int(len(y)),'positive_pixels':int(y.sum()),'negative_pixels':int((y==0).sum()),
      'precision':float(precision_score(y,predicted,zero_division=0)),'recall':float(recall_score(y,predicted,zero_division=0)),
      'f1':float(f1_score(y,predicted,zero_division=0)),'average_precision':float(average_precision_score(y,scores)),
      'confusion_matrix_tn_fp_fn_tp':confusion_matrix(y,predicted,labels=[0,1]).ravel().tolist()}

def load(manifest,split):
    records=[r for r in manifest['records'] if r['split']==split]
    features=[];classes=[];scls=[];groups=[];tiles=[]
    for record in records:
        check_contract(record['contract'])
        path=DATA/split/(record['patch'][:-7]+'.npz')
        if hashlib.sha256(path.read_bytes()).hexdigest()!=record['samples_sha256']:raise ValueError('Sample checksum mismatch')
        with np.load(path,allow_pickle=False) as sample:
            x=sample['features'];c=sample['classes'];scl=sample['scl']
            if x.shape!=(len(c),len(BANDS)) or not np.isfinite(x).all() or not ((c>=1)&(c<=15)).all():raise ValueError('Invalid labelled L2A sample')
            features.append(x);classes.append(c);scls.append(scl)
            groups.extend([record['original_scene']]*len(c));tiles.extend([record['original_scene'].rsplit('_',1)[1]]*len(c))
    if not features:raise ValueError('Empty split '+split)
    x=np.concatenate(features);c=np.concatenate(classes);scl=np.concatenate(scls)
    return x,(c==1).astype('uint8'),c,scl,np.array(groups),np.array(tiles)

def validate_splits(splits):
    for name,(_,y,_,_,groups,_) in splits.items():
        if len(np.unique(y))!=2:raise ValueError('Both classes required in '+name)
    names=list(splits)
    for i,a in enumerate(names):
        for b in names[i+1:]:
            if set(splits[a][4])&set(splits[b][4]):raise ValueError('Scene leakage between '+a+' and '+b)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--allow-missing',action='store_true',help='Explicitly accept catalogue coverage gaps and include them in the report')
    args=parser.parse_args()
    manifest_path=DATA/'manifest.json';manifest=json.loads(manifest_path.read_text(encoding='utf8'))
    check_contract(manifest['contract'])
    if (not manifest.get('complete') or manifest.get('failures') or len(manifest['records'])!=manifest['expected_patches']) and not args.allow_missing:
        raise ValueError('Complete extraction required; missing scenes must not silently change the benchmark')
    accepted_errors=('No same-day, same-tile L2A scene','Multiple same-day acquisitions','Ambiguous acquisition without datatake identifier')
    if any(not str(item.get('error','')).startswith(accepted_errors) for item in manifest.get('failures',[])):
        raise ValueError('Extraction errors must be fixed; allow-missing only accepts documented catalogue coverage gaps')
    splits={name:load(manifest,name) for name in ('train','val','test')};validate_splits(splits)
    x,y,*_=splits['train']
    model=RandomForestClassifier(n_estimators=160,max_depth=18,min_samples_leaf=3,class_weight='balanced_subsample',n_jobs=2,random_state=42)
    model.fit(x,y)
    val= model.predict_proba(splits['val'][0])[:,list(model.classes_).index(1)]
    thresholds=np.arange(.05,.951,.025)
    # Threshold is fixed using validation only, with higher precision as a tie-breaker.
    threshold=float(max(thresholds,key=lambda t:(f1_score(splits['val'][1],val>=t,zero_division=0),precision_score(splits['val'][1],val>=t,zero_division=0),t)))
    scores=model.predict_proba(splits['test'][0])[:,list(model.classes_).index(1)]
    _,y,c,scl,groups,tiles=splits['test']
    report={'purpose':'Same-processing L2A research feasibility; no deployment or Black Sea accuracy claim',
      'contract':contract(),'source':'https://doi.org/10.1371/journal.pone.0262247','manifest_sha256':hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
      'label_manifest_sha256':manifest.get('label_manifest_sha256'),
      'parameters':model.get_params(),
      'coverage':{'expected_patches':manifest['expected_patches'],'included_patches':len(manifest['records']),'missing_patches':manifest['failures'],'explicitly_accepted_gaps':bool(args.allow_missing)},
      'threshold_selected_on_validation':threshold,'selection':'Original small positive-scene-enriched MARIDA subset; all labelled finite pixels',
      'validation':metrics(splits['val'][1],val,threshold),'test':metrics(y,scores,threshold),
      'by_original_class':{str(int(k)):{'pixels':int((c==k).sum()),'predicted_debris':int(((c==k)&(scores>=threshold)).sum())} for k in np.unique(c)},
      'split_coverage':{name:{'scenes':len(set(data[4])),'tiles':sorted(set(data[5])),'labelled_pixels':len(data[1]),'debris_pixels':int(data[1].sum()),'class_counts':{str(int(k)):int((data[2]==k).sum()) for k in np.unique(data[2])}} for name,data in splits.items()},
      'test_scl6_gate':{'labelled_debris':int(y.sum()),'surviving_debris':int(((y==1)&(scl==6)).sum()),
        'note':'SCL=6 gate alone, before the existing 60m buffer. This is an upper bound on debris retention, not end-to-end detector recall.'},
      'warnings':manifest['limits']+['Pixel scores are not calibrated confidence.','No independent field or trajectory validation.','Marine-debris labels do not identify plastic polymer or waste age.']}
    OUTPUT.mkdir(exist_ok=True)
    joblib.dump({'model':model,'threshold':threshold,'contract':contract(),'report':report},OUTPUT/'l2a_baseline.joblib')
    (OUTPUT/'l2a_evaluation.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    print(json.dumps(report,indent=2),flush=True)

if __name__=='__main__':main()
