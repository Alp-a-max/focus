const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalize,load} = require('../js/forecast-data.js');
const start = Date.UTC(2026,10,18,12);
function response(type, lat=41.6, lon=30.9) {
  const sk=type==='current'?'ocean_current_velocity':'wind_speed_10m', dk=type==='current'?'ocean_current_direction':'wind_direction_10m';
  return {latitude:lat,longitude:lon,utc_offset_seconds:0,hourly_units:{[sk]:'km/h',[dk]:'°'},
    hourly:{time:Array.from({length:25},(_,h)=>new Date(start+h*3600000).toISOString().slice(0,16)),
      [sk]:Array(25).fill(1),[dk]:Array(25).fill(90)}};
}
test('aligns explicit UTC timestamps; missing remains null and zero remains valid',()=>{
  const data=response('current'); data.hourly.ocean_current_velocity[0]=null;data.hourly.ocean_current_velocity[1]=0;
  const cell=normalize(data,'current',start)[0];
  assert.equal(cell.samples[0].speed,null);assert.equal(cell.samples[1].speed,0);
  assert.equal(normalize(data,'current',start+3600000)[0].samples.at(-1).speed,null);
});
test('rejects incorrect units, timezone, duplicate hours and conflicting duplicate model cells',()=>{
  const a=response('current');a.hourly_units.ocean_current_velocity='m/s';assert.throws(()=>normalize(a,'current',start));
  const b=response('current');b.utc_offset_seconds=10800;assert.throws(()=>normalize(b,'current',start));
  const c=response('current');c.hourly.time[1]=c.hourly.time[0];assert.throws(()=>normalize(c,'current',start));
  const d=response('current');d.hourly.ocean_current_velocity[0]=5;
  assert.throws(()=>normalize([response('current'),d],'current',start),/tutarsız/);
});
test('batches all particles into two field requests and reuses a bounded cache',async()=>{
  let calls=0;
  const fetchImpl=async url=>{calls++;const u=new URL(url),isMarine=u.hostname.startsWith('marine-');
    assert.equal(u.searchParams.get('latitude').split(',').length,9);
    return {ok:true,json:async()=>response(isMarine?'current':'wind')};};
  const a=await load(41.6,30.9,{now:start,fetchImpl});
  assert.equal(calls,2);assert.equal(a.startTime,'2026-11-18T12:00:00.000Z');
  assert.equal(await load(41.6,30.9,{now:start+60000,fetchImpl}),a);assert.equal(calls,2);
  await load(41.6,30.9,{now:start+16*60000,fetchImpl});assert.equal(calls,4);
});
