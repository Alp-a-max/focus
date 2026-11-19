const {test}=require('node:test'),assert=require('node:assert/strict');
const {positions,scale,readGrid}=require('../l2a-grid.cjs');
test('L2A reader samples 10m pixel centres and rejects unsupported rotated or oversized grids',()=>{
 assert.deepEqual(positions({width:2,height:2,transform:[10,0,700000,0,-10,9400000],indices:[0,3]}),[{x:700005,y:9399995},{x:700015,y:9399985}]);
 assert.throws(()=>positions({width:513,height:2,transform:[10,0,0,0,-10,0],indices:[0]}));
 assert.throws(()=>positions({width:2,height:2,transform:[10,1,0,0,-10,0],indices:[0]}));
});
test('raw nodata is excluded before offsets; negative valid reflectance remains usable',()=>{
 const metadata={scale:.0001,offset:-.1,nodata:0};
 assert.equal(scale(0,metadata),null);assert.ok(Math.abs(scale(100,metadata)+.09)<1e-9);assert.equal(scale(1000,metadata),0);
 assert.throws(()=>scale(10,{scale:.0001,nodata:0}));
});
test('label and image coordinate systems must match before remote access',async()=>{
 await assert.rejects(readGrid({properties:{'proj:epsg':32617}},{epsg:32616,width:2,height:2,transform:[10,0,0,0,-10,0],indices:[0]}),/CRS/);
});
