import unittest
from datetime import datetime,timezone
import numpy as np
from l2a_contract import reflectance,labelled_mask,check_contract,contract,BANDS
from build_l2a_samples import choose_scene
from train_l2a import validate_splits
from infer_l2a import score_features

class L2AContractTests(unittest.TestCase):
 def test_nodata_is_masked_before_offset_and_valid_negative_is_preserved(self):
  values=reflectance([0,100,1000],{'nodata':0,'scale':.0001,'offset':-.1})
  self.assertTrue(np.isnan(values[0]));self.assertAlmostEqual(values[1],-.09,places=6);self.assertAlmostEqual(values[2],0,places=6)
 def test_missing_scaling_and_wrong_contract_are_rejected(self):
  with self.assertRaises(ValueError):reflectance([1],{'scale':.0001,'nodata':0})
  bad=contract();bad['bands']=list(reversed(BANDS))
  with self.assertRaises(ValueError):check_contract(bad)
  bad=contract();bad['processing']='Rayleigh corrected'
  with self.assertRaises(ValueError):check_contract(bad)
 def test_unlabelled_and_low_confidence_pixels_are_not_negative_examples(self):
  self.assertEqual(labelled_mask(np.array([0,1,7,1]),np.array([1,1,2,3])).tolist(),[False,True,True,False])
 def test_scene_must_match_exact_tile_date_and_crs(self):
  def item(tile,date='20201212',epsg=32616):
   return {'id':f'S2A_{tile}_{date}_0_L2A','properties':{'proj:epsg':epsg,'datetime':'2020-12-12T16:00:00Z'},'assets':{b:{} for b in (*BANDS,'scl')}}
  scene=choose_scene([item('16PCD'),item('16PCC')],'16PCC',datetime(2020,12,12,tzinfo=timezone.utc),32616)
  self.assertIn('16PCC',scene['id'])
  with self.assertRaises(ValueError):choose_scene([item('16PCC',epsg=32617)],'16PCC',datetime(2020,12,12),32616)
 def test_reprocessing_is_same_acquisition_but_different_datatakes_are_not(self):
  def item(number,datatake,time):
   return {'id':f'S2A_16PCC_20201212_{number}_L2A','properties':{'proj:epsg':32616,'datetime':'2020-12-12T'+time+'Z','s2:datatake_id':datatake,'s2:processing_baseline':'05.00' if number else '00.01'},'assets':{b:{} for b in (*BANDS,'scl')}}
  old=item(0,'GS2A_20201212T160000_012345_N00.01','16:25:00')
  new=item(1,'GS2A_20201212T160000_012345_N05.00','16:29:00')
  self.assertEqual(choose_scene([old,new],'16PCC',datetime(2020,12,12),32616)['id'],new['id'])
  new['properties']['s2:datatake_id']='GS2A_20201212T180000_012346_N05.00'
  with self.assertRaises(ValueError):choose_scene([old,new],'16PCC',datetime(2020,12,12),32616)
 def test_scene_overlap_is_rejected_even_if_patch_names_differ(self):
  def split(group):return (None,np.array([0,1]),None,None,np.array([group,group]),None)
  with self.assertRaises(ValueError):validate_splits({'train':split('same-day-tile'),'val':split('same-day-tile'),'test':split('other')})

class InferenceContractTests(unittest.TestCase):
 def test_masked_or_missing_pixels_are_not_scored_as_zero(self):
  class Model:
   n_features_in_=11;classes_=np.array([0,1])
   def predict_proba(self,x):return np.tile([.2,.8],(len(x),1))
  bundle={'contract':contract(),'model':Model(),'threshold':.7}
  request={'contract':contract(),'features':[[.1]*11,[None]*11,[.1]*11],'eligible':[True,True,False]}
  result=score_features(bundle,request)
  self.assertEqual(result['scores'],[.8,None,None]);self.assertEqual(result['above_threshold_pixels'],1)
 def test_rayleigh_model_and_nonboolean_mask_are_rejected(self):
  bad=contract();bad['processing']='Rayleigh corrected'
  with self.assertRaises(ValueError):score_features({'contract':bad},{'contract':contract()})
  with self.assertRaises(ValueError):score_features({'contract':contract()},{'contract':contract(),'features':[[.1]*11],'eligible':[1]})

if __name__=='__main__':unittest.main()
