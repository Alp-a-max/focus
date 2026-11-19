const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {initial,refresh}=require('../tools/refresh-monitor.cjs'),core=require('../js/monitor-core.js');
function result(lat,lon,scene='scene-a'){
 return {type:'FeatureCollection',features:[],metadata:{schema_version:1,validation_status:'research_only',score_kind:'uncalibrated neural-network score',source:'https://doi.org/10.1016/j.isci.2023.108402',observed_at:'2026-11-11T08:58:00Z',retrieved_at:new Date().toISOString(),model_id:'unetpp12',scene_id:scene,model_sha256:'a'.repeat(64),checkpoint_sha256:'b'.repeat(64),threshold:.1,eligible_pixels:10000,excluded_pixels:0,candidate_clusters:0,query:{lat,lon}}};
}
function file(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'focus-feed-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return path.join(dir,'feed.json');}
test('unscanned and open-ocean navigation centres never become zero-candidate detections',()=>{
 const feed=core.validate(initial());assert.equal(feed.regions.length,13);assert.equal(feed.regions.filter(r=>r.kind==='open_ocean').length,5);
 for(const r of feed.regions){assert.equal(core.state(r).candidateCount,null);assert.equal(r.result,null);}
});
test('only actual successful inference produces a ready public result, with original acquisition time',async t=>{
 const out=file(t);let calls=0;
 const feed=await refresh({file:out,ids:['black-sea'],choose:async()=>({scene:{id:'scene-a',properties:{updated:'2026-11-12T00:00:00Z'}},selection:{policy:'live'}}),detect:async(lat,lon)=>{calls++;return result(lat,lon);}});
 const r=feed.regions[0];assert.equal(calls,1);assert.equal(r.status,'ready');assert.equal(r.result.metadata.observed_at,'2026-11-11T08:58:00Z');assert.equal(core.state(r).candidateCount,0);assert.equal(r.result.metadata.scene_selection.policy,'live');
});
test('failed update preserves prior source and dates and cannot masquerade as a fresh empty scan',async t=>{
 const out=file(t),feed=initial();feed.regions[0].result=result(41.6,30.9);feed.regions[0].status='ready';fs.writeFileSync(out,JSON.stringify(feed));
 const old=feed.regions[0].result.metadata.retrieved_at;
 const next=await refresh({file:out,ids:['black-sea'],choose:async()=>{throw Error('Provider unavailable with secret URL');}});
 assert.equal(next.regions[0].status,'error');assert.equal(next.regions[0].result.metadata.retrieved_at,old);assert.equal(core.state(next.regions[0]).failed,true);assert(!fs.readFileSync(out,'utf8').includes('secret URL'));
});
test('unchanged source is checked without rerunning inference, and cross-region results are rejected',async t=>{
 const out=file(t),feed=initial(),r=feed.regions[0];r.status='ready';r.result=result(r.lat,r.lon);r.result.metadata.catalogue_updated_at=null;fs.writeFileSync(out,JSON.stringify(feed));
 await refresh({file:out,ids:[r.id],choose:async()=>({scene:{id:'scene-a',properties:{}},selection:{}}),detect:async()=>{throw Error('Must not run');}});
 const saved=JSON.parse(fs.readFileSync(out));assert.equal(saved.regions[0].status,'ready');saved.regions[0].result.metadata.query.lat=0;assert.throws(()=>core.validate(saved));
});
test('global feed rejects duplicate regions, fabricated open-ocean results and future publication dates',()=>{
 const f=initial();f.regions.push(f.regions[0]);assert.throws(()=>core.validate(f));
 const a=initial();a.regions[8].result=result(a.regions[8].lat,a.regions[8].lon);assert.throws(()=>core.validate(a));
 const b=initial();b.generated_at='2099-01-01T00:00:00Z';assert.throws(()=>core.validate(b));
});
