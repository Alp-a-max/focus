const {test}=require('node:test'),assert=require('node:assert/strict');
const {cluster}=require('../ml/detect-pretrained.cjs'),{fingerprint,valid}=require('../ml/context-cache.cjs');
const scene={id:'S2_TEST',properties:{datetime:'2020-12-22T15:37:50Z'},assets:{coastal:{href:'https://example.invalid/a', 'raster:bands':[{scale:.0001,offset:0}]}}};
const grid={epsg:32618,width:3,height:3,transform:[10,0,500000,0,-10,2000000]};
const utm='+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs';
test('adjacent eligible candidates keep observation provenance without a probability claim',()=>{
 const result=cluster([.9,.8,null,0,0,0,0,0,0],[true,true,true,true,true,true,true,true,true],3,3,.5,grid,scene,utm);
 assert.equal(result.features.length,1);assert.equal(result.features[0].properties.grid_pixels,2);assert.equal(result.features[0].properties.observed_at,scene.properties.datetime);
 assert.equal(result.features[0].properties.status,'unverified_model_candidate');assert.equal(result.features[0].properties.probability,undefined);
});
test('masked, missing and isolated scores do not produce candidate clusters',()=>{
 const result=cluster([.9,.9,null,0,0,0,0,0,.9],[true,false,true,true,true,true,true,true,true],3,3,.5,grid,scene,utm);
 assert.equal(result.features.length,0);
});
test('invalid scores and mismatched masks are rejected before mapping',()=>{
 assert.throws(()=>cluster([NaN],[],1,1,.5,grid,scene,utm));assert.throws(()=>cluster([1.1],[true],1,1,.5,grid,scene,utm));
});
test('public-image cache keys change with source calibration or location; 11-band data is never reused as 12-band input',()=>{
 const original=fingerprint(scene,grid),changed=JSON.parse(JSON.stringify(scene));changed.assets.coastal['raster:bands'][0].offset=-.1;
 assert.notEqual(fingerprint(changed,grid),original);assert.notEqual(fingerprint(scene,{...grid,transform:[10,0,500010,0,-10,2000000]}),original);
 assert.equal(valid({features:[[0,0,0,0,0,0,0,0,0,0,0]],scl:[6]},1),false);
});
