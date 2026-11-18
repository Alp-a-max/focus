"""Small scene-separated MARIDA feasibility baseline. Not a deployed detector."""
import json
import importlib.metadata
from pathlib import Path
import joblib
import numpy as np
import tifffile
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import average_precision_score, confusion_matrix, precision_score, recall_score, f1_score

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'datasets' / 'marida-sample'
OUTPUT = ROOT / 'output'
RNG = np.random.default_rng(20261118)

def load_split(name, training=False):
    features, targets, groups, original_classes = [], [], [], []
    for label_path in sorted((DATA / name).rglob('*_cl.tif')):
        stem = str(label_path)[:-7]
        image = tifffile.imread(stem + '.tif')
        labels = tifffile.imread(label_path)
        confidence = tifffile.imread(stem + '_conf.tif')
        if image.shape != (256, 256, 11) or labels.shape != (256, 256):
            raise ValueError('Unexpected MARIDA shape: ' + str(label_path))
        # Class 0 means unlabelled, not a negative example. Exclude low-confidence labels.
        valid = (labels >= 1) & (labels <= 15) & (confidence >= 1) & (confidence <= 2) & np.isfinite(image).all(axis=2)
        y = (labels[valid] == 1).astype(np.uint8)
        classes = labels[valid].astype(np.uint8)
        x = image[valid].astype(np.float32)
        if training and len(y):
            ids = []
            for class_id in (0, 1):
                candidates = np.flatnonzero(y == class_id)
                if len(candidates) > 2000:
                    candidates = RNG.choice(candidates, 2000, replace=False)
                ids.extend(candidates.tolist())
            x, y, classes = x[ids], y[ids], classes[ids]
        features.append(x); targets.append(y); original_classes.append(classes); groups.extend([label_path.parent.name] * len(y))
    if not features:
        raise ValueError('No patches available for ' + name)
    return np.concatenate(features), np.concatenate(targets), np.array(groups), np.concatenate(original_classes)

def evaluate(y, scores, threshold):
    pred = scores >= threshold
    return {'pixels':len(y),'positive_pixels':int(y.sum()),'negative_pixels':int((y == 0).sum()),
            'precision':float(precision_score(y,pred,zero_division=0)),
            'recall':float(recall_score(y,pred,zero_division=0)),
            'f1':float(f1_score(y,pred,zero_division=0)),
            'average_precision':float(average_precision_score(y,scores)),
            'confusion_matrix_tn_fp_fn_tp':confusion_matrix(y,pred,labels=[0,1]).ravel().tolist()}

def main():
    x_train,y_train,g_train,_=load_split('train',True)
    x_val,y_val,g_val,_=load_split('val')
    x_test,y_test,g_test,test_classes=load_split('test')
    if any(set(a)&set(b) for a,b in ((g_train,g_val),(g_train,g_test),(g_val,g_test))):
        raise ValueError('Scene overlap between splits')
    if any(len(np.unique(y)) != 2 for y in (y_train,y_val,y_test)):
        raise ValueError('Each split needs positive and negative labelled pixels')
    print('Labelled pixels:',len(y_train),len(y_val),len(y_test),flush=True)
    model=RandomForestClassifier(n_estimators=80,max_depth=18,min_samples_leaf=3,class_weight='balanced_subsample',n_jobs=2,random_state=42)
    model.fit(x_train,y_train)
    val_scores=model.predict_proba(x_val)[:,1]
    thresholds=np.linspace(.1,.9,17)
    threshold=float(max(thresholds,key=lambda t:f1_score(y_val,val_scores>=t,zero_division=0)))
    test_scores=model.predict_proba(x_test)[:,1]
    report={'purpose':'Research feasibility only; not validated for real-world detection',
            'dataset':'MARIDA, selected positive-scene sample, CC BY 4.0',
            'source':'https://doi.org/10.5281/zenodo.5151941',
            'bands':'11 MARIDA multispectral bands; Rayleigh corrected input',
            'split':'Original MARIDA scene-disjoint splits; small enriched subset',
            'versions':{name:importlib.metadata.version(name) for name in ('numpy','scikit-learn','tifffile','joblib')},
            'warnings':['Weak labels are not independent field confirmation.','Sample enriched with positive scenes; metrics are not representative of deployment.',
                        'Distinct scenes can still be from the same geographic region.',
                        'Training on Rayleigh-corrected MARIDA imagery is not equivalent to the site’s Sentinel-2 L2A inputs.',
                        'Pixel scores are not calibrated confidence or plastic-specific detection.'],
            'threshold_selected_on_validation':threshold,
            'scenes':{'train':len(set(g_train)),'val':len(set(g_val)),'test':len(set(g_test))},
            'train_labelled_pixels_sampled':int(len(y_train)),
            'validation':evaluate(y_val,val_scores,threshold),'test':evaluate(y_test,test_scores,threshold),
            'test_by_original_class':{str(int(c)):{'pixels':int((test_classes==c).sum()),'predicted_debris':int(((test_classes==c)&(test_scores>=threshold)).sum())} for c in np.unique(test_classes)}}
    OUTPUT.mkdir(exist_ok=True)
    joblib.dump({'model':model,'threshold':threshold,'report':report},OUTPUT/'marida_baseline.joblib')
    (OUTPUT/'evaluation.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf8')
    print(json.dumps(report,indent=2,ensure_ascii=False),flush=True)

if __name__=='__main__':
    main()
