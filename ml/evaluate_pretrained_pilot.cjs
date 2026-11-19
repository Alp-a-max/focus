'use strict';
/* Prespecified positive/foam pilot from the held-out MARIDA subset; not operational validation. */
const fs=require('node:fs'),path=require('node:path'),proj4=require('proj4');
const {detect}=require('./detect-pretrained.cjs');
const ROOT=path.join(__dirname,'datasets'),DATA=path.join(ROOT,'marida-l2a'),LABELS=path.join(ROOT,'marida-l2a-labels');
async function annotation(record){
 const {fromFile}=await import('geotiff'),base=path.join(LABELS,record.split,record.original_scene,record.patch);
 async function read(file){const t=await fromFile(file);try{const image=await t.getImage();if(image.getWidth()!==256||image.getHeight()!==256)throw Error('Invalid label grid');return Array.from((await image.readRasters({samples:[0]}))[0]);}finally{await t.close();}}
 return {labels:await read(base),confidence:await read(base.replace('_cl.tif','_conf.tif'))};
}
async function main(){
 const records=JSON.parse(fs.readFileSync(path.join(DATA,'manifest.json'))).records.filter(x=>x.split==='test');
 const candidates=[];
 for(const record of records){const a=await annotation(record);let debris=0,foam=0;for(let i=0;i<a.labels.length;i++)if(a.confidence[i]>=1&&a.confidence[i]<=2){if(a.labels[i]===1)debris++;if(a.labels[i]===9)foam++;}candidates.push({record,...a,debris,foam});}
 const positive=[...candidates].sort((a,b)=>b.debris-a.debris||a.record.patch.localeCompare(b.record.patch))[0];
 const negative=candidates.filter(x=>x.debris===0).sort((a,b)=>b.foam-a.foam||a.record.patch.localeCompare(b.record.patch))[0];
 if(!positive?.debris||!negative?.foam)throw Error('Pilot requires available labelled debris and foam controls');
 const selection=[{name:'debris_positive',...positive},{name:'foam_negative',...negative}];
 const report={purpose:'Two prespecified examples; NOT regional accuracy or plastic verification',selection:'Maximum labelled debris positive and maximum labelled foam debris-free negative; chosen before neural predictions',cases:[]};
 fs.writeFileSync(path.join(__dirname,'output/pretrained-pilot-selection.json'),JSON.stringify(selection.map(x=>({name:x.name,patch:x.record.patch,debris:x.debris,foam:x.foam})),null,2));
 for(const item of selection){
  const {record}=item,scene=JSON.parse(fs.readFileSync(path.join(DATA,'catalog',record.original_scene+'.json'))).find(x=>x.id===record.scene_id);
  const epsg=Number(record.crs.split(':')[1]),t=record.transform,utm=`+proj=utm +zone=${epsg%100} ${epsg>=32700?'+south ':''}+datum=WGS84 +units=m +no_defs`;
  const [lon,lat]=proj4(utm,'EPSG:4326',[t[2]+1280,t[5]-1280]);
  const grid={epsg,width:384,height:384,transform:[10,0,t[2]-640,0,-10,t[5]+640],indices:Array.from({length:384*384},(_,i)=>i)};
  console.log('Evaluating',item.name,record.patch);
  const result=await detect(lat,lon,{scene,grid,crop:[64,64,320,320],evaluation:true});
  let tp=0,fp=0,fn=0,tn=0,unlabelledAbove=0;
  for(let i=0;i<65536;i++){
   const labelled=item.labels[i]>=1&&item.labels[i]<=15&&item.confidence[i]>=1&&item.confidence[i]<=2;
   const predicted=result.evaluation.eligible[i]&&result.evaluation.scores[i]!==null&&result.evaluation.scores[i]>=result.metadata.threshold;
   if(!labelled){if(predicted)unlabelledAbove++;continue;}
   const actual=item.labels[i]===1;if(actual&&predicted)tp++;else if(actual)fn++;else if(predicted)fp++;else tn++;
  }
  const summary={name:item.name,patch:record.patch,scene_id:result.metadata.scene_id,observed_at:result.metadata.observed_at,threshold:result.metadata.threshold,
   labelled_pixels:tp+fp+fn+tn,counts:{tp,fp,fn,tn},recall:tp+fn?tp/(tp+fn):null,precision:tp+fp?tp/(tp+fp):null,
   unlabelled_above_threshold_not_evaluated:unlabelledAbove,candidate_clusters:result.metadata.candidate_clusters,model_sha256:result.metadata.model_sha256};
  report.cases.push(summary);
  fs.writeFileSync(path.join(__dirname,'output/pretrained-pilot-'+item.name+'.json'),JSON.stringify(result));
  fs.writeFileSync(path.join(__dirname,'output/pretrained-pilot-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(summary));
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
