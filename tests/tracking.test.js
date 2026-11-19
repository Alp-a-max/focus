const {test}=require('node:test'),assert=require('node:assert/strict'),core=require('../js/tracking-core.js');
const H=3600000,now=Date.parse('2026-11-19T08:34:56.789Z'),observed=Date.parse('2026-11-17T00:17:11.333Z'),coast={pointOnLand:()=>false,crossing:()=>null};
function values(speed,direction){const m=new Map();for(let t=Math.floor(observed/H)*H-H;t<now+26*H;t+=H)m.set(t,[speed*Math.sin(direction*Math.PI/180),speed*Math.cos(direction*Math.PI/180)]);return m;}
const getFields=async p=>({marineCells:[{...p,values:values(1,90)}],windCells:[{...p,values:values(10,0)}]});
test('dated advection starts at the exact acquisition time, reaches now and +24h, and samples along the moving path',async()=>{
 const seen=[];const r=await core.simulate({lat:0,lon:0,observedAt:new Date(observed).toISOString(),now,getFields:async p=>{seen.push(p.lon);return getFields(p);},coast});
 assert.equal(r.observed_at,new Date(observed).toISOString());assert.equal(r.observational_tracking,false);assert.equal(r.historical_advection,true);assert.equal(r.scenarios.length,3);
 const hours=(now+24*H-observed)/H,first=r.scenarios[0];assert.equal(first.points[0].time,observed);assert.equal(first.modelled_now.time,now);assert.equal(first.points.at(-1).time,now+24*H);assert.equal(first.reached_forecast_end,true);assert(Math.abs(first.points.at(-1).lon-hours/111.32)<1e-8);assert(seen.some(l=>l>.3));
 assert(r.scenarios[2].points.at(-1).lat>.1);
});
test('missing historical vectors stop the route instead of inventing a present-day point; zero current remains valid',async()=>{
 const missing=async p=>({marineCells:[{...p,values:new Map()}],windCells:[]});const r=await core.simulate({lat:0,lon:0,observedAt:new Date(observed).toISOString(),now,getFields:missing,coast});
 assert(r.scenarios.every(s=>s.state==='MISSING_HOUR'&&s.modelled_now===null&&s.points.length===1));
 const zero=async p=>({marineCells:[{...p,values:values(0,0)}],windCells:[{...p,values:values(0,0)}]});const z=await core.simulate({lat:0,lon:0,observedAt:new Date(observed).toISOString(),now,getFields:zero,coast});assert(z.scenarios.every(s=>s.reached_forecast_end&&s.points.at(-1).lon===0));
});
test('coast contact keeps the fractional stop time and never reports arrival at the forecast horizon',async()=>{
 const coast2={pointOnLand:()=>false,crossing:(a,b)=>a.lon<.1&&b.lon>=.1?{lat:0,lon:.1}:null};const r=await core.simulate({lat:0,lon:0,observedAt:new Date(observed).toISOString(),now,getFields,coast:coast2});assert.equal(r.scenarios[0].state,'coast');assert(Math.abs((r.scenarios[0].points.at(-1).time-observed)/H-11.132)<1e-5);assert.equal(r.scenarios[0].modelled_now,null);
});
test('future, too-old, nonfinite starts and cancellation fail explicitly',async()=>{
 for(const args of [{observedAt:'2027-01-01T00:00:00Z'},{observedAt:'2020-01-01T00:00:00Z'},{futureHours:NaN},{now:NaN}])await assert.rejects(core.simulate({lat:0,lon:0,observedAt:new Date(observed).toISOString(),now,getFields,coast,...args}),/INVALID_START/);
 const c=new AbortController();c.abort();await assert.rejects(core.simulate({lat:0,lon:0,observedAt:new Date(observed).toISOString(),now,getFields,coast,signal:c.signal}),/CANCELLED/);
});
test('provider preserves UTC, rejects missing units/duplicate hours, reverses wind and caches one batch for neighbouring points',async()=>{
 const raw=(wind=false)=>({latitude:0,longitude:0,utc_offset_seconds:0,hourly_units:wind?{wind_speed_10m:'km/h',wind_direction_10m:'°'}:{ocean_current_velocity:'km/h',ocean_current_direction:'°'},hourly:{time:['2026-11-19T00:00','2026-11-19T01:00'],...(wind?{wind_speed_10m:[10,10],wind_direction_10m:[180,180]}:{ocean_current_velocity:[1,1],ocean_current_direction:[90,90]})}});
 const wind=core.normalize(raw(true),'wind');assert(core.vector(wind,{lat:0,lon:0},Date.parse('2026-11-19T00:30Z'))[1]>9.99);
 const bad=raw();bad.hourly.time[1]=bad.hourly.time[0];assert.throws(()=>core.normalize(bad,'current'));
 const bad2=raw();bad2.hourly_units.ocean_current_velocity='m/s';assert.throws(()=>core.normalize(bad2,'current'));
 let calls=0;const p=core.provider({fetchImpl:async url=>{calls++;return {ok:true,json:async()=>raw(url.includes('wind_speed'))};}});await p.getFields({lat:0,lon:0},observed,now);await p.getFields({lat:.01,lon:.01},observed,now);assert.equal(calls,2);assert.equal(p.requestBatches,1);assert.equal(p.sources.length,1);
});
