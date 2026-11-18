const {test}=require('node:test'),assert=require('node:assert/strict');
const coast=require('../js/coast-source.cjs'),topology=require('../assets/land-50m.json');
const regional=require('../js/ensemble-coast.js'),ensemble=require('../js/ensemble-drift.js');
const index=coast.prepare(topology);
test('regional segment index matches original coast intersections on Mediterranean and Black Sea routes',()=>{
  for(const [lat,lon] of [[36.45,31.3],[41.6,30.9]]) {
    const fast=regional.create(index,{minLat:lat-.2,maxLat:lat+.2,minLon:lon-.2,maxLon:lon+.2},coast);
    assert.ok(fast.segmentCount<1000);
    for(let i=0;i<40;i++) {
      const a={lat:lat-.9+(i%8)*.2,lon:lon-.8+Math.floor(i/8)*.3};
      const b={lat:a.lat+.3,lon:a.lon+.2};
      const expected=coast.crossing(index,a,b),actual=fast.crossing(a,b);
      assert.equal(Boolean(actual),Boolean(expected));
      if(actual)assert.ok(ensemble.distance(actual,expected)<1e-7);
      assert.equal(fast.pointOnLand(a.lat,a.lon),coast.pointOnLand(index,a.lat,a.lon));
    }
  }
});
