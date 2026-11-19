"""Local inference for a locally trained, contract-matched L2A model."""
import hashlib,json,sys
from pathlib import Path
import joblib
import numpy as np
from l2a_contract import BANDS,check_contract

MODEL=Path(__file__).resolve().parent/'output'/'l2a_baseline.joblib'

def score_features(bundle,request):
 check_contract(bundle['contract']);check_contract(request['contract'])
 x=np.asarray(request['features'],dtype=np.float32)
 if x.ndim!=2 or x.shape[1]!=len(BANDS) or len(x)>10000:raise ValueError('Expected at most 10000 rows of 11 L2A reflectances')
 eligible=request.get('eligible')
 if not isinstance(eligible,list) or len(eligible)!=len(x) or any(type(v) is not bool for v in eligible):raise ValueError('Explicit boolean eligibility mask required')
 valid=np.isfinite(x).all(axis=1)&np.asarray(eligible,dtype=bool)
 model=bundle['model']
 if model.n_features_in_!=len(BANDS) or list(model.classes_)!=[0,1]:raise ValueError('Unexpected classifier feature or class mapping')
 threshold=float(bundle['threshold'])
 if not 0<threshold<1:raise ValueError('Invalid model threshold')
 scores=[None]*len(x)
 if valid.any():
  values=model.predict_proba(x[valid])[:,1]
  if not np.isfinite(values).all() or ((values<0)|(values>1)).any():raise ValueError('Invalid model scores')
  for index,value in zip(np.flatnonzero(valid),values):scores[index]=float(value)
 return {'schema_version':1,'threshold':threshold,'score_kind':'uncalibrated random-forest score','scores':scores,
         'eligible_pixels':int(valid.sum()),'excluded_pixels':int((~valid).sum()),'above_threshold_pixels':sum(v is not None and v>=threshold for v in scores)}

def main():
 raw=sys.stdin.read(5000001)
 if len(raw)>5000000:raise ValueError('Input exceeds bound')
 if not MODEL.exists():raise ValueError('Train the L2A model first: py ml/train_l2a.py')
 # This fixed artifact is produced locally by train_l2a.py; uploaded/passed-in pickle files are not accepted.
 bundle=joblib.load(MODEL)
 result=score_features(bundle,json.loads(raw));result['model_sha256']=hashlib.sha256(MODEL.read_bytes()).hexdigest()
 print(json.dumps(result,allow_nan=False))

if __name__=='__main__':
 try:main()
 except Exception as error:
  print(str(error),file=sys.stderr);raise SystemExit(1)
