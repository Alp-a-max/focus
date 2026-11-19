const {test}=require('node:test'),assert=require('node:assert/strict');
const {locallyUsableScene}=require('../ml/detect-pretrained.cjs'),{PRETRAINED_BANDS}=require('../l2a-grid.cjs');
const before='2026-11-19T00:00:00Z';
function scene(day,tile='36TUM'){return {id:`S2A_${tile}_202611${day}_0_L2A`,properties:{datetime:`2026-11-${day}T08:00:00Z`,'proj:epsg':32636,'eo:cloud_cover':85,'s2:datatake_id':`GS2A_202611${day}T080000_012345_N05.00`},assets:Object.fromEntries([...PRETRAINED_BANDS,'scl'].map(b=>[b,{}]))};}
test('latest locally clear water can be selected despite high whole-scene cloud cover',async()=>{
 let calls=0;const result=await locallyUsableScene(41.6,30.9,{before,search:async(a,b,o)=>{calls++;assert.equal(o.maxCloudCover,100);return scene('18')},read:async()=>({scl:Array(10000).fill(6)})});
 assert.equal(calls,1);assert.equal(result.scene.id,scene('18').id);assert.equal(result.selection.preview_water_pixels,7744);
});
test('locally cloudy images are skipped, and overlapping tiles from the same acquisition remain eligible',async()=>{
 let calls=0,reads=0;
 const result=await locallyUsableScene(41.6,30.9,{before,search:async()=>scene('18',calls++?'36TUN':'36TUM'),read:async()=>({scl:Array(10000).fill(reads++?6:9)})});
 assert.equal(reads,2);assert.equal(result.selection.checked_acquisitions,1);assert.equal(result.selection.checked_scene_tiles,2);
});
test('screening stops at its scene bound or date coverage without fabricating a usable image',async()=>{
 let calls=0;
 await assert.rejects(locallyUsableScene(41.6,30.9,{before,search:async()=>scene(String(18-calls++)),read:async()=>({scl:Array(10000).fill(9)})}),/yeterli açık su/);
 assert.equal(calls,8);
 await assert.rejects(locallyUsableScene(41.6,30.9,{before,search:async()=>({...scene('18'),properties:{...scene('18').properties,datetime:'2020-12-22T00:00:00Z'}}),read:async()=>{throw Error('must not read old data')}}),/yeterli açık su/);
});
