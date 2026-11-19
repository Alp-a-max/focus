import unittest,io,json,struct
import numpy as np
import torch
from pretrained_predict import predict,BANDS,read_binary

class ConstantModel(torch.nn.Module):
 def forward(self,x):return torch.zeros(x.shape[0],1,x.shape[2],x.shape[3])

class PretrainedInputTests(unittest.TestCase):
 def request(self):return {'contract':{'schema':'focus-russwurm2023-l2a12-v1','bands':BANDS,'processing':'Sentinel-2 L2A surface reflectance','resampling':'nearest'},'width':32,'height':32,'features':[[.1]*12 for _ in range(1024)],'crop':[1,1,3,3]}
 def test_crop_retains_row_major_pixels_and_missing_is_not_zero_probability(self):
  r=self.request();r['features'][33]=[None]*12
  self.assertEqual(predict(ConstantModel(),r),[None,.5,.5,.5])
 def test_wrong_processing_band_order_and_grid_size_are_rejected(self):
  for key,value in [('processing','Rayleigh corrected'),('bands',list(reversed(BANDS)))]:
   r=self.request();r['contract'][key]=value
   with self.assertRaises(ValueError):predict(ConstantModel(),r)
  r=self.request();r['width']=33
  with self.assertRaises(ValueError):predict(ConstantModel(),r)
 def test_crop_outside_input_is_rejected(self):
  r=self.request();r['crop']=[0,0,40,32]
  with self.assertRaises(ValueError):predict(ConstantModel(),r)

class BinaryInputTests(unittest.TestCase):
 def test_float32_transport_retains_grid_order_and_missing_values(self):
  header=json.dumps({'width':32,'height':32}).encode();values=np.zeros((1024,12),dtype='<f4');values[1,2]=np.nan;values[9,0]=.15
  result=read_binary(io.BytesIO(struct.pack('<I',len(header))+header+values.tobytes()))
  self.assertTrue(np.isnan(result['features'][1,2]));self.assertAlmostEqual(result['features'][9,0],.15,places=6)
 def test_truncated_and_unbounded_inputs_are_rejected(self):
  for data in [b'',struct.pack('<I',5000),struct.pack('<I',2)+b'{}']:
   with self.assertRaises(ValueError):read_binary(io.BytesIO(data))

if __name__=='__main__':unittest.main()
