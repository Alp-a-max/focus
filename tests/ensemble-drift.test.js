const {test} = require('node:test');
const assert = require('node:assert/strict');
const model = require('../js/ensemble-drift.js');
const sea = {pointOnLand:()=>false, crossing:()=>null};
const series = (speed, direction) => Array.from({length:25},()=>({speed,direction}));
function input(options={}) {return {lat:0, lon:0, coast:sea, radiusKm:0,
  bounds:{minLat:-1,maxLat:1,minLon:-1,maxLon:1},
  marineCells:[{lat:0,lon:0,samples:series(1,90)}],
  windCells:[{lat:0,lon:0,samples:series(10,180)}], ...options};}
test('uniform current gives known distance; wind-from south drives north; all snapshots retain 25 particles',()=>{
  const result = model.simulate(input());
  for (const [i,w] of [0,.01,.03].entries()) {
    const p = model.snapshot(result.scenarios[i],12);
    assert.equal(p.total,25); assert.equal(p.counts.active,25);
    assert.ok(Math.abs(p.points[0].lat*111.32-10*w*12)<1e-8);
    assert.ok(Math.abs(p.points[0].lon*111.32-12)<.0001);
  }
  const end = model.snapshot(result.scenarios[0],24).points[0];
  assert.ok(Math.abs(model.distance({lat:0,lon:0},end)-24)<1e-8);
});
test('samples a new spatial cell and interpolates hourly vectors',()=>{
  const result = model.simulate(input({marineCells:[{lat:0,lon:0,samples:series(5,90)},
    {lat:0,lon:.15,samples:series(5,0)}, {lat:.2,lon:.15,samples:series(5,0)}]}));
  const p = model.snapshot(result.scenarios[0],6).points[0];
  assert.ok(p.lat>0); assert.ok(p.lon<.15);
  const values = series(0,90); values[1]={speed:2,direction:90};
  const temporal = model.simulate(input({marineCells:[{lat:0,lon:0,samples:values}]}));
  const atOne=temporal.scenarios[0].particles[0].points.find(p=>p.hour===1);
  assert.ok(Math.abs(atOne.lon*111.32-1)<1e-8);
});
test('missing vectors and domain exits are counted without fabricated endpoints',()=>{
  const missing = model.simulate(input({marineCells:[{lat:0,lon:0,samples:[]}]}));
  const view = model.snapshot(missing.scenarios[0],24);
  assert.equal(view.counts.missing,25); assert.equal(view.points[0].hour,0);
  const exited = model.simulate(input({bounds:{minLat:-.01,maxLat:.01,minLon:-.01,maxLon:.01}}));
  assert.equal(model.snapshot(exited.scenarios[0],24).counts.outside,25);
});
test('coast stops keep actual stop time and are distinguished from initially land particles',()=>{
  const coast={pointOnLand:(lat,lon)=>lon>=.01,crossing:(a,b)=>a.lon<.01&&b.lon>=.01?{lat:0,lon:.01}:null};
  const result=model.simulate(input({coast}));
  const view=model.snapshot(result.scenarios[0],6);
  assert.equal(view.counts.coast,25); assert.ok(Math.abs(view.points[0].hour-1.1132)<1e-8);
  const seeded=model.simulate(input({lon:.009,coast,radiusKm:.5}));
  assert.ok(model.snapshot(seeded.scenarios[0],6).counts.land_start>0);
});
test('invalid inputs fail and northern direction wrap interpolates vectors rather than degrees',()=>{
  assert.throws(()=>model.simulate(input({lat:90})),/Geçersiz/);
  assert.throws(()=>model.simulate(input({radiusKm:10})),/yayılımı/);
  const samples=series(1,0);samples[0]={speed:1,direction:359};samples[1]={speed:1,direction:1};
  const result=model.simulate(input({marineCells:[{lat:0,lon:0,samples}]}));
  const p=result.scenarios[0].particles[0].points.find(p=>p.hour===1);
  assert.ok(p.lat>0);assert.ok(Math.abs(p.lon)<1e-7);
});
