'use strict';
/* Same 11-band L2A contract as training. Outputs research candidates, never confirmed plastic. */
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),proj4=require('proj4');
const {findScene}=require('../scene-search.cjs'),{readGrid,BANDS}=require('../l2a-grid.cjs'),{waterMask}=require('../mask.cjs');
async function infer(lat,lon){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>79||Math.abs(lon)>179)throw Error('Valid sea coordinates are required');
 if(!fs.existsSync(path.join(__dirname,'output/l2a_baseline.joblib')))throw Error('L2A model has not been trained');
 const signal=AbortSignal.timeout(120000),scene=await findScene(lat,lon,{signal}),epsg=scene.properties['proj:epsg'];
 if(!((epsg>=32601&&epsg<=32660)||(epsg>=32701&&epsg<=32760)))throw Error('Unsupported scene CRS');
 const utm=`+proj=utm +zone=${epsg%100} ${epsg>=32700?'+south ':''}+datum=WGS84 +units=m +no_defs`;
 const [x,y]=proj4('EPSG:4326',utm,[lon,lat]);
 const grid={epsg,width:100,height:100,transform:[10,0,Math.floor((x-500)/10)*10,0,-10,Math.ceil((y+500)/10)*10],indices:Array.from({length:10000},(_,i)=>i)};
 const sampled=await readGrid(scene,grid,{signal}),mask=waterMask(sampled.scl.map(x=>x===null?0:x),100,100,6);
 const contract={schema:'focus-sentinel2-l2a-11-v1',bands:BANDS,band_ids:['B01','B02','B03','B04','B05','B06','B07','B08','B8A','B11','B12'],processing:'Sentinel-2 L2A surface reflectance',resampling:'nearest',label_grid_m:10,score_kind:'uncalibrated random-forest score'};
 const prediction=await new Promise((resolve,reject)=>{
  const child=spawn(process.env.FOCUS_PYTHON||'py',[path.join(__dirname,'infer_l2a.py')],{windowsHide:true,stdio:['pipe','pipe','pipe']});let output='',errors='',done=false;
  const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);error?reject(error):resolve(result)};
  const timer=setTimeout(()=>{child.kill();finish(Error('L2A inference timed out'))},30000);
  child.on('error',error=>finish(error));child.stdin.on('error',error=>finish(error));
  child.stdout.on('data',chunk=>{output+=chunk;if(output.length>2000000){child.kill();finish(Error('Inference output exceeds bound'))}});
  child.stderr.on('data',chunk=>{if(errors.length<8000)errors+=chunk});
  child.on('close',code=>{if(code!==0)finish(Error(errors||'Inference failed'));else try{finish(null,JSON.parse(output))}catch{finish(Error('Invalid inference response'))}});
  child.stdin.end(JSON.stringify({contract,features:sampled.features,eligible:Array.from(mask,Boolean)}));
 });
 const candidates=[],seen=new Set();let allClusters=0;
 for(let i=0;i<prediction.scores.length;i++){
  if(seen.has(i)||prediction.scores[i]===null||prediction.scores[i]<prediction.threshold)continue;
  const queue=[i],members=[];seen.add(i);
  while(queue.length){const q=queue.pop();members.push(q);const r=Math.floor(q/100),c=q%100;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const rr=r+dy,cc=c+dx,j=rr*100+cc;if(rr<0||rr>=100||cc<0||cc>=100||seen.has(j)||prediction.scores[j]===null||prediction.scores[j]<prediction.threshold)continue;seen.add(j);queue.push(j)}
  }
  if(members.length<2)continue;allClusters++;
  const col=members.reduce((sum,j)=>sum+j%100+.5,0)/members.length,row=members.reduce((sum,j)=>sum+Math.floor(j/100)+.5,0)/members.length;
  const coordinate=proj4(utm,'EPSG:4326',[grid.transform[2]+col*10,grid.transform[5]-row*10]);
  candidates.push({type:'Feature',geometry:{type:'Point',coordinates:coordinate},properties:{observed_at:scene.properties.datetime,scene_id:scene.id,pixels:members.length,max_score:Math.max(...members.map(j=>prediction.scores[j])),status:'unverified_model_candidate'}});
 }
 candidates.sort((a,b)=>b.properties.max_score-a.properties.max_score);
 return {type:'FeatureCollection',features:candidates.slice(0,25),metadata:{scene_id:scene.id,observed_at:scene.properties.datetime,query:{lat,lon},grid,contract,
   model_sha256:prediction.model_sha256,threshold:prediction.threshold,eligible_pixels:prediction.eligible_pixels,excluded_pixels:prediction.excluded_pixels,above_threshold_pixels:prediction.above_threshold_pixels,
   candidate_clusters:allClusters,truncated:allClusters>25,mask:'SCL water only, 60m circular buffer and image edge exclusion',
   warnings:['Research candidates, not confirmed plastic or calibrated probabilities.','10m output grid; input bands have native 10m, 20m and 60m resolutions.','Small MARIDA-derived benchmark; no independent Black Sea or field validation.','Observation time is not a current waste position; no automatic past-to-present tracking.']}};
}
module.exports={infer};
if(require.main===module){
 const lat=Number(process.argv[2]),lon=Number(process.argv[3]);
 infer(lat,lon).then(result=>{const out=path.join(__dirname,'output/l2a-live-candidates.json');fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({output:out,...result.metadata,grid:undefined},null,2))}).catch(error=>{console.error(error.message);process.exitCode=1});
}
