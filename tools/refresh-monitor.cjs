'use strict';
/* Refresh public satellite results. Does not read user records, Earthdata tokens or photos. */
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),core=require('../js/monitor-core.js'),detector=require('../ml/detect-pretrained.cjs');
const catalogue=require('../assets/monitor-regions.json');
function initial(now=new Date().toISOString()){
 return {schema_version:1,generated_at:now,refresh_interval_hours:6,scope:'bounded 1km2 watch points; not a scan of the whole ocean',regions:catalogue.regions.map(r=>({...r,status:r.kind==='open_ocean'?'reference_only':'not_scanned',checked_at:null,result:null}))};
}
function atomic(file,value){const tmp=file+'.'+process.pid+'.tmp';fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(tmp,JSON.stringify(value)+'\n');fs.renameSync(tmp,file);}
async function refresh({file=path.join(root,'assets/monitor-feed.json'),ids,force=false,detect=detector.detect,choose=detector.locallyUsableScene,now=()=>new Date().toISOString(),onProgress=()=>{}}={}){
 let feed=initial(now());
 if(fs.existsSync(file))feed=core.validate(JSON.parse(fs.readFileSync(file,'utf8')));
 for(const r of feed.regions){
  if(r.kind!=='coastal'||(ids&&!ids.includes(r.id)))continue;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),170000);
  r.checked_at=now();
  try{
   const chosen=await choose(r.lat,r.lon,{signal:controller.signal});
   const updated=chosen.scene.properties.updated||null;
   if(force||!r.result||r.result.metadata.scene_id!==chosen.scene.id||r.result.metadata.catalogue_updated_at!==updated){
    const result=await detect(r.lat,r.lon,{scene:chosen.scene,signal:controller.signal});
    result.metadata.scene_selection=chosen.selection;result.metadata.catalogue_updated_at=updated;
    r.result=result;
   }
   r.status='ready';delete r.error_code;
  }catch(error){
   r.status=/Son (45|taranan)|uygun bulutluluğa|açık su alanı/.test(String(error.message))?'no_scene':'error';
   r.error_code=controller.signal.aborted?'TIMEOUT':r.status==='no_scene'?'NO_USABLE_SCENE':'PROCESSING_FAILED';
   // Retain the last actual result with its original dates on failures.
  }finally{clearTimeout(timer);}
  feed.generated_at=now();core.validate(feed);atomic(file,feed);
  onProgress({id:r.id,status:r.status,observed_at:r.result?.metadata.observed_at||null,candidates:r.result?.features.length??null});
 }
 core.validate(feed);atomic(file,feed);return feed;
}
module.exports={initial,refresh};
if(require.main===module){
 const args=process.argv.slice(2),at=args.indexOf('--region'),id=at>=0?args[at+1]:null;
 if(id&&!catalogue.regions.some(r=>r.id===id)){console.error('Unknown monitoring region');process.exitCode=1;}
 else refresh({ids:id?[id]:undefined,force:args.includes('--force'),onProgress:p=>console.log(JSON.stringify(p))}).then(feed=>console.log(JSON.stringify({regions:feed.regions.length,ready:feed.regions.filter(r=>r.status==='ready').length}))).catch(()=>{console.error('Monitoring feed could not be refreshed');process.exitCode=1;});
}
