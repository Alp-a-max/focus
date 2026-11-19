"""12-channel L2A inference using the published Russwurm et al. (2023) UNet++.
Source: https://github.com/MarcCoru/marinedebrisdetector . Scores are uncalibrated.
"""
import json,sys,hashlib,struct
from pathlib import Path
import numpy as np
import torch
import segmentation_models_pytorch as smp
from safetensors import safe_open
from safetensors.torch import load_file

ROOT=Path(__file__).resolve().parent
MODEL=ROOT/'output'/'pretrained'/'unetpp1.safetensors'
CHECKPOINT_SHA='3c1219fb1f56561aaef168a8060d8fc591339ff76e6d3740c246f79b02a6079b'
BANDS=['coastal','blue','green','red','rededge1','rededge2','rededge3','nir','nir08','nir09','swir16','swir22']

def load_model():
 if not MODEL.exists():raise ValueError('Published detector weights are not installed')
 with safe_open(MODEL,framework='pt',device='cpu') as file:metadata=file.metadata()
 if metadata.get('upstream_checkpoint_sha256')!=CHECKPOINT_SHA:raise ValueError('Unexpected published checkpoint source')
 threshold=float(metadata['threshold'])
 if not 0<threshold<1:raise ValueError('Invalid published threshold')
 model=smp.UnetPlusPlus(encoder_name='resnet34',encoder_weights=None,in_channels=12,classes=1)
 model.load_state_dict(load_file(MODEL),strict=True);model.eval()
 return model,threshold

def predict(model,request):
 c=request.get('contract',{})
 if c.get('bands')!=BANDS or c.get('processing')!='Sentinel-2 L2A surface reflectance' or c.get('resampling')!='nearest' or c.get('schema')!='focus-russwurm2023-l2a12-v1':raise ValueError('Incompatible 12-band input contract')
 width,height=request['width'],request['height']
 if type(width) is not int or type(height) is not int or not 32<=width<=512 or not 32<=height<=512 or width%32 or height%32:raise ValueError('CNN grid dimensions must be 32..512, divisible by 32')
 values=np.asarray(request['features'],dtype=np.float32)
 if values.shape!=(width*height,12):raise ValueError('Unexpected 12-band grid size')
 missing=~np.isfinite(values).all(axis=1)
 # Already physical reflectance after explicit STAC scale+offset. No second 1e-4 scaling.
 image=np.nan_to_num(values,nan=0,posinf=0,neginf=0).reshape(height,width,12).transpose(2,0,1).copy()
 with torch.inference_mode():scores=torch.sigmoid(model(torch.from_numpy(image).unsqueeze(0)))[0,0].numpy()
 crop=request.get('crop',[0,0,width,height])
 if len(crop)!=4 or any(type(x) is not int for x in crop):raise ValueError('Invalid crop')
 left,top,right,bottom=crop
 if not 0<=left<right<=width or not 0<=top<bottom<=height:raise ValueError('Crop outside grid')
 scores=scores[top:bottom,left:right];missing=missing.reshape(height,width)[top:bottom,left:right]
 return [None if missing.flat[i] else float(value) for i,value in enumerate(scores.flat)]

def read_binary(stream):
 prefix=stream.read(4)
 if len(prefix)!=4:raise ValueError('Missing binary input header')
 size=struct.unpack('<I',prefix)[0]
 if not 1<=size<=4096:raise ValueError('Binary header exceeds bound')
 header=stream.read(size)
 if len(header)!=size:raise ValueError('Truncated input header')
 request=json.loads(header)
 width,height=request.get('width'),request.get('height')
 if type(width) is not int or type(height) is not int or not 32<=width<=512 or not 32<=height<=512 or width%32 or height%32:raise ValueError('Invalid binary grid dimensions')
 count=width*height*12;body=stream.read(count*4+1)
 if len(body)!=count*4:raise ValueError('Unexpected binary grid size')
 request['features']=np.frombuffer(body,dtype='<f4').reshape(width*height,12)
 return request

def main():
 torch.set_num_threads(2)
 if '--binary' in sys.argv:request=read_binary(sys.stdin.buffer)
 else:
  raw=sys.stdin.read(64000001)
  if len(raw)>64000000:raise ValueError('Inference input exceeds bound')
  request=json.loads(raw)
 model,threshold=load_model();scores=predict(model,request)
 result={'schema_version':1,'scores':scores,'threshold':threshold,'score_kind':'uncalibrated neural-network score',
  'model_id':'russwurm2023-unetpp-seed1','model_sha256':hashlib.sha256(MODEL.read_bytes()).hexdigest(),
  'checkpoint_sha256':CHECKPOINT_SHA,'source':'https://doi.org/10.1016/j.isci.2023.108402'}
 print(json.dumps(result,allow_nan=False))

if __name__=='__main__':
 try:main()
 except Exception as error:
  print(str(error),file=sys.stderr);raise SystemExit(1)
