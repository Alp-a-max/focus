'use strict';
/* Published 12-band detector adapter. All locations are unverified research candidates. */
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),proj4=require('proj4');
const {findScene}=require('../scene-search.cjs'),{readGrid,PRETRAINED_BANDS}=require('../l2a-grid.cjs'),{waterMask}=require('../mask.cjs');
const {context}=require('./context-cache.cjs');
const CONTRACT={schema:'focus-russwurm2023-l2a12-v1',bands:PRETRAINED_BANDS,processing:'Sentinel-2 L2A surface reflectance',resampling:'nearest'};
function interpreter(){return process.env.FOCUS_DETECTOR_PYTHON||path.join(__dirname,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');}
function status(){return {available:fs.existsSync(interpreter())&&fs.existsSync(path.join(__dirname,'output/pretrained/unetpp1.safetensors')),model_id:'russwurm2023-unetpp-seed1',validation_status:'research_only'};}
async function predict(request,signal,timeoutMs=60000){
 return new Promise((resolve,reject)=>{
  const child=spawn(interpreter(),[path.join(__dirname,'pretrained_predict.py'),'--binary'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let output='',errors='',done=false;
  const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(result)};
  const abort=()=>{child.kill();finish(Error('Detector request cancelled'))};
  const timer=setTimeout(()=>{child.kill();finish(Error('Detector inference timed out'))},timeoutMs);
  if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});
  child.on('error',error=>finish(error));child.stdin.on('error',error=>finish(error));
  child.stdout.on('data',chunk=>{output+=chunk;if(output.length>8000000){child.kill();finish(Error('Inference output exceeds bound'))}});
  child.stderr.on('data',chunk=>{if(errors.length<8000)errors+=chunk});
  child.on('close',code=>{if(code!==0)finish(Error(errors||'Detector inference failed'));else try{finish(null,JSON.parse(output))}catch{finish(Error('Invalid detector response'))}});
  const header=Buffer.from(JSON.stringify({contract:request.contract,width:request.width,height:request.height,crop:request.crop}));
  const length=Buffer.alloc(4);length.writeUInt32LE(header.length);
  const values=Buffer.allocUnsafe(request.features.length*12*4);let offset=0;
  for(const row of request.features)for(const value of row){values.writeFloatLE(value===null?NaN:value,offset);offset+=4;}
  child.stdin.end(Buffer.concat([length,header,values]));
 });
}
function cluster(scores,eligible,width,height,threshold,grid,scene,utm){
 if(scores.length!==width*height||eligible.length!==scores.length||!Number.isFinite(threshold)||threshold<=0||threshold>=1||scores.some(x=>x!==null&&(!Number.isFinite(x)||x<0||x>1)))throw Error('Invalid detector grid');
 const candidates=[],seen=new Set();let total=0;
 for(let i=0;i<scores.length;i++){
  if(seen.has(i)||!eligible[i]||scores[i]===null||scores[i]<threshold)continue;
  const queue=[i],members=[];seen.add(i);
  while(queue.length){const q=queue.pop();members.push(q);const r=Math.floor(q/width),c=q%width;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const rr=r+dy,cc=c+dx,j=rr*width+cc;
    if(rr<0||rr>=height||cc<0||cc>=width||seen.has(j)||!eligible[j]||scores[j]===null||scores[j]<threshold)continue;
    seen.add(j);queue.push(j);
   }
  }
  if(members.length<2)continue;total++;
  let col=0,row=0,maximum=0;for(const j of members){col+=j%width+.5;row+=Math.floor(j/width)+.5;maximum=Math.max(maximum,scores[j]);}
  const coordinates=proj4(utm,'EPSG:4326',[grid.transform[2]+col/members.length*10,grid.transform[5]-row/members.length*10]);
  candidates.push({type:'Feature',geometry:{type:'Point',coordinates},properties:{candidate_id:scene.id+'-'+i,observed_at:scene.properties.datetime,scene_id:scene.id,grid_pixels:members.length,max_score:maximum,status:'unverified_model_candidate'}});
 }
 candidates.sort((a,b)=>b.properties.max_score-a.properties.max_score);
 return {features:candidates.slice(0,25),total,truncated:total>25};
}
function makeGrid(scene,lat,lon,size=256){
 const epsg=scene.properties['proj:epsg'];
 if(!Number.isInteger(epsg)||!((epsg>=32601&&epsg<=32660)||(epsg>=32701&&epsg<=32760)))throw Error('Desteklenmeyen sahne koordinat sistemi.');
 const utm=`+proj=utm +zone=${epsg%100} ${epsg>=32700?'+south ':''}+datum=WGS84 +units=m +no_defs`;
 const [x,y]=proj4('EPSG:4326',utm,[lon,lat]);
 return {epsg,width:size,height:size,transform:[10,0,Math.floor((x-size*5)/10)*10,0,-10,Math.ceil((y+size*5)/10)*10],indices:Array.from({length:size*size},(_,i)=>i)};
}
async function locallyUsableScene(lat,lon,{before,signal,search=findScene,read=readGrid}){
 const cutoff=Date.parse(before||new Date().toISOString())-45*86400000,seen=new Set(),acquisitions=new Set(),excluded=[];let checked=0;
 for(let attempt=0;attempt<16&&checked<8;attempt++){
  let scene;try{scene=await search(lat,lon,{before,signal,maxCloudCover:100,excludeSceneIds:[...excluded]});}catch(error){if(String(error.message).startsWith('Son 45 günde uygun bulutluluğa'))break;throw error;}
  excluded.push(scene.id);
  const date=Date.parse(scene.properties.datetime);if(date<cutoff)break;
  const acquisition=(scene.properties['s2:datatake_id']||scene.id).replace(/_N[0-9.]+$/,'');
  const tile=scene.id.match(/^S2[A-Z]_([0-9A-Z]+)_/)?.[1]||'';const key=acquisition+'|'+tile;
  if(seen.has(key))continue;seen.add(key);acquisitions.add(acquisition);checked++;
  if(!PRETRAINED_BANDS.every(b=>scene.assets?.[b]))continue;
  const grid=makeGrid(scene,lat,lon,100),sample=await read(scene,grid,{signal,bands:[]});
  const clear=waterMask(sample.scl.map(v=>v===null?0:v),100,100,6).reduce((sum,v)=>sum+v,0);
  if(clear>=1000)return {scene,selection:{policy:'newest locally usable scene among bounded recent acquisitions',checked_acquisitions:acquisitions.size,checked_scene_tiles:checked,preview_water_pixels:clear,minimum_preview_water_pixels:1000}};
 }
 throw Error('Son taranan uydu sahnelerinde yeterli açık su alanı bulunamadı. Başka bir bölge veya daha sonra tekrar deneyin.');
}
async function detect(lat,lon,{before,scene:providedScene,grid:providedGrid,crop:providedCrop,signal:externalSignal,evaluation=false}={}){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>79||Math.abs(lon)>179)throw Error('Geçerli bir deniz koordinatı seçin.');
 if(!status().available)throw Error('Araştırma tespit modeli bu bilgisayarda henüz hazır değil.');
 const signal=externalSignal?AbortSignal.any([externalSignal,AbortSignal.timeout(180000)]):AbortSignal.timeout(180000);
 const chosen=providedScene?{scene:providedScene,selection:{policy:'fixed annotated scene; no live catalogue search'}}:await locallyUsableScene(lat,lon,{before,signal});
 const scene=chosen.scene,epsg=scene.properties['proj:epsg'];
 if(!Number.isInteger(epsg)||!((epsg>=32601&&epsg<=32660)||(epsg>=32701&&epsg<=32760)))throw Error('Desteklenmeyen sahne koordinat sistemi.');
 const utm=`+proj=utm +zone=${epsg%100} ${epsg>=32700?'+south ':''}+datum=WGS84 +units=m +no_defs`;
 const [x,y]=proj4('EPSG:4326',utm,[lon,lat]);
 const grid=providedGrid||makeGrid(scene,lat,lon);
 if(grid.indices.length!==grid.width*grid.height||grid.indices.some((value,index)=>value!==index))throw Error('CNN input must be a dense row-major grid');
 const crop=providedCrop||[78,78,178,178];
 if(!Array.isArray(crop)||crop.length!==4||crop.some(x=>!Number.isInteger(x))||crop[0]<0||crop[1]<0||crop[2]>grid.width||crop[3]>grid.height||crop[2]<=crop[0]||crop[3]<=crop[1])throw Error('Geçersiz analiz penceresi.');
 const sampled=await context(scene,grid,{signal});
 const response=await predict({contract:CONTRACT,width:grid.width,height:grid.height,features:sampled.features,crop},signal,evaluation?180000:60000);
 const width=crop[2]-crop[0],height=crop[3]-crop[1];
 if(!Array.isArray(response.scores)||response.scores.length!==width*height||response.model_id!=='russwurm2023-unetpp-seed1')throw Error('Tespit modeli yanıtı doğrulanamadı.');
 const sourceScl=sampled.scl.map((v,i)=>sampled.features[i].some(x=>x===null)?0:v),fullMask=waterMask(sourceScl,grid.width,grid.height,6),eligible=[];
 for(let r=crop[1];r<crop[3];r++)for(let c=crop[0];c<crop[2];c++)eligible.push(Boolean(fullMask[r*grid.width+c]));
 const resultGrid={epsg,width,height,transform:[10,0,grid.transform[2]+crop[0]*10,0,-10,grid.transform[5]-crop[1]*10]};
 const clusters=cluster(response.scores,eligible,width,height,response.threshold,resultGrid,scene,utm);
 let eligibleCount=0,above=0;response.scores.forEach((s,i)=>{if(eligible[i]&&s!==null){eligibleCount++;if(s>=response.threshold)above++;}});
 const result={type:'FeatureCollection',features:clusters.features,metadata:{schema_version:1,model_id:response.model_id,model_sha256:response.model_sha256,checkpoint_sha256:response.checkpoint_sha256,
  scene_selection:chosen.selection,source:response.source,scene_id:scene.id,observed_at:scene.properties.datetime,retrieved_at:new Date().toISOString(),scene_cloud_percent:scene.properties['eo:cloud_cover'],
  observation_age_hours:Math.max(0,(Date.now()-Date.parse(scene.properties.datetime))/3600000),query:{lat,lon},contract:CONTRACT,grid:resultGrid,
  score_kind:'uncalibrated neural-network score',threshold:response.threshold,eligible_pixels:eligibleCount,excluded_pixels:width*height-eligibleCount,
  above_threshold_pixels:above,candidate_clusters:clusters.total,truncated:clusters.truncated,validation_status:'research_only',
  mask:'SCL water, 60m circular buffer; 780m contextual input surrounds the 1km output',
  warnings:['Atık adayları bağımsız doğrulanmadı; skor plastik olasılığı veya güven yüzdesi değildir.','10m çıktı ızgarası; giriş bantlarının gerçek çözünürlükleri 10m, 20m ve 60m.','Gözlem tarihi güncel atık konumu değildir; geçmişten bugüne takip yapılmadı.','Aday bulunmaması atık bulunmadığını kanıtlamaz.']}};
 if(evaluation)result.evaluation={scores:response.scores,eligible};
 return result;
}
module.exports={detect,status,cluster,CONTRACT,makeGrid,locallyUsableScene};
if(require.main===module){
 detect(Number(process.argv[2]),Number(process.argv[3])).then(result=>{const output=path.join(__dirname,'output/pretrained-live-candidates.json');fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify({output,...result.metadata},null,2))}).catch(error=>{console.error(error.message);process.exitCode=1});
}
