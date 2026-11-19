/* Public multi-region feed. A monitored point is not an observed pollution hotspot. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./detection-contract.js'));else root.FocusMonitorCore=factory(root.FocusDetectionContract);})(typeof globalThis!=='undefined'?globalThis:this,function(contract){
 'use strict';
 const validDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
 function validate(feed){
  if(feed?.schema_version!==1||!validDate(feed.generated_at)||Date.parse(feed.generated_at)>Date.now()+300000||!Array.isArray(feed.regions)||feed.regions.length>30)throw Error('INVALID_FEED');
  const seen=new Set();
  for(const r of feed.regions){
   if(!/^[a-z0-9-]{1,60}$/.test(r?.id)||seen.has(r.id)||!['coastal','open_ocean'].includes(r.kind)||
    !Number.isFinite(r.lat)||!Number.isFinite(r.lon)||Math.abs(r.lat)>79||Math.abs(r.lon)>179||
    !['ready','no_scene','error','not_scanned','reference_only'].includes(r.status)||
    typeof r.name_tr!=='string'||typeof r.name_en!=='string'||r.name_tr.length>150||r.name_en.length>150||
    (r.checked_at!==null&&(!validDate(r.checked_at)||Date.parse(r.checked_at)>Date.now()+300000)))throw Error('INVALID_FEED');
   seen.add(r.id);
   if(r.result){const m=contract.validate(r.result).metadata;if(m.query?.lat!==r.lat||m.query?.lon!==r.lon)throw Error('INVALID_FEED');}
   if(r.status==='ready'&&!r.result)throw Error('INVALID_FEED');
   if(r.kind==='open_ocean'&&(r.status!=='reference_only'||r.result))throw Error('INVALID_FEED');
  }
  return feed;
 }
 function state(region,now=Date.now()){
  const m=region.result?.metadata;
  return {hasResult:Boolean(m),candidateCount:region.result?.features.length??null,
   observationAgeHours:m?Math.max(0,(now-Date.parse(m.observed_at))/3600000):null,
   checkAgeHours:region.checked_at?Math.max(0,(now-Date.parse(region.checked_at))/3600000):null,
   failed:region.status==='error'||region.status==='no_scene',stale:Boolean(m)&&(now-Date.parse(m.retrieved_at)>48*3600000)};
 }
 return {validate,state};
});
