"""Install the author's published checkpoint as safe tensors, never execute a downloaded pickle.
Run inside ml/.venv after requirements-pretrained.txt is installed.
"""
import argparse,hashlib,json,urllib.request
from pathlib import Path
import torch
import segmentation_models_pytorch as smp
from safetensors.torch import save_file

ROOT=Path(__file__).resolve().parent/'output'/'pretrained'
URL='https://marinedebrisdetector.s3.eu-central-1.amazonaws.com/checkpoints/unet%2B%2B1/epoch=54-val_loss=0.50-auroc=0.987.ckpt'
EXPECTED_SHA='3c1219fb1f56561aaef168a8060d8fc591339ff76e6d3740c246f79b02a6079b'

def sha(path):
 digest=hashlib.sha256()
 with path.open('rb') as file:
  while chunk:=file.read(1024**2):digest.update(chunk)
 return digest.hexdigest()

def main():
 ROOT.mkdir(parents=True,exist_ok=True);checkpoint=ROOT/'unetpp1.ckpt'
 if not checkpoint.exists():
  temporary=checkpoint.with_suffix('.partial')
  with urllib.request.urlopen(URL,timeout=60) as source,temporary.open('wb') as destination:
   while chunk:=source.read(1024**2):destination.write(chunk)
  if sha(temporary)!=EXPECTED_SHA:raise ValueError('Published checkpoint checksum mismatch')
  temporary.replace(checkpoint)
 if sha(checkpoint)!=EXPECTED_SHA:raise ValueError('Unexpected checkpoint checksum')
 if set(torch.serialization.get_unsafe_globals_in_checkpoint(checkpoint))-{'argparse.Namespace'}:raise ValueError('Unexpected checkpoint globals')
 with torch.serialization.safe_globals([argparse.Namespace]):bundle=torch.load(checkpoint,map_location='cpu',weights_only=True)
 args=bundle['hyper_parameters']['args']
 if args.model!='unet++' or args.hr_only:raise ValueError('Unexpected model architecture')
 weights={k.removeprefix('model.'):v for k,v in bundle['state_dict'].items() if k.startswith('model.')}
 threshold=float(bundle['state_dict']['threshold'])
 if not 0<threshold<1:raise ValueError('Invalid published threshold')
 model=smp.UnetPlusPlus(encoder_name='resnet34',encoder_weights=None,in_channels=12,classes=1)
 model.load_state_dict(weights,strict=True);model.eval()
 output=ROOT/'unetpp1.safetensors';temporary=output.with_suffix('.partial')
 save_file({k:v.detach().cpu().contiguous() for k,v in weights.items()},temporary,metadata={
  'upstream_checkpoint_sha256':EXPECTED_SHA,'threshold':str(threshold),'source':'https://github.com/MarcCoru/marinedebrisdetector','architecture':'smp.UnetPlusPlus resnet34 12 channels'})
 temporary.replace(output)
 (ROOT/'unetpp1-source.json').write_text(json.dumps({'url':URL,'bytes':checkpoint.stat().st_size,'sha256':EXPECTED_SHA,
   'tensor_sha256':sha(output),'threshold':threshold,'torch':torch.__version__,'segmentation_models_pytorch':smp.__version__,
   'source':'https://github.com/MarcCoru/marinedebrisdetector/blob/main/doc/models.md'},indent=2),encoding='utf8')
 print('Published L2A model ready:',output)

if __name__=='__main__':main()
