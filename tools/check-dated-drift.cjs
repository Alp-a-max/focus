'use strict';
// Explicit hypothetical start used only for an actual-provider smoke test; no waste detection is fabricated.
const fs=require('node:fs'),path=require('node:path'),core=require('../js/tracking-core.js'),coast=require('../js/coast-source.cjs');
async function main(){
 const index=coast.prepare(JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/land-50m.json'),'utf8'))),mask={pointOnLand:(lat,lon)=>coast.pointOnLand(index,lat,lon),crossing:(a,b)=>coast.crossing(index,a,b)};
 const control=AbortSignal.timeout(150000),provider=core.provider({signal:control,onProgress:n=>console.log('model field batches:',n)});
 const result=await core.simulate({lat:41.6,lon:30.9,observedAt:'2026-11-11T08:58:42.716Z',getFields:provider.getFields,coast:mask,signal:control});
 result.start_source='explicit hypothetical floating-object start; not a detected waste object';result.environment_sources=provider.sources;
 const out=path.join(__dirname,'../ml/output/dated-drift-live-check.json');fs.writeFileSync(out,JSON.stringify(result));console.log(JSON.stringify({output:out,observed_at:result.observed_at,now:result.now,batches:provider.requestBatches,scenarios:result.scenarios.map(s=>({windage:s.windage,state:s.state,points:s.points.length,modelled_now:s.modelled_now,reached_forecast_end:s.reached_forecast_end}))}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
