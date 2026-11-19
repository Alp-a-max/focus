'use strict';
/* Cache immutable public scene windows locally; no observations or credentials are stored. */
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {readGrid,PRETRAINED_BANDS}=require('../l2a-grid.cjs');
const DIRECTORY=path.join(__dirname,'datasets','pretrained-context');
function fingerprint(scene,grid){return crypto.createHash('sha256').update(JSON.stringify({schema:1,id:scene.id,updated:scene.properties?.updated,
 epsg:grid.epsg,width:grid.width,height:grid.height,transform:grid.transform,bands:PRETRAINED_BANDS,
 assets:PRETRAINED_BANDS.concat('scl').map(name=>[name,scene.assets?.[name]?.href,scene.assets?.[name]?.['raster:bands']])})).digest('hex');}
function valid(data,size){return Array.isArray(data.features)&&data.features.length===size&&Array.isArray(data.scl)&&data.scl.length===size
 &&data.features.every(row=>Array.isArray(row)&&row.length===12&&row.every(v=>v===null||Number.isFinite(v)))&&data.scl.every(v=>v===null||Number.isFinite(v));}
async function context(scene,grid,{signal}={}){
 const key=fingerprint(scene,grid),file=path.join(DIRECTORY,key+'.json.gz'),size=grid.width*grid.height;
 try{const stat=await fs.stat(file);if(Date.now()-stat.mtimeMs<7*86400000){const cache=JSON.parse(zlib.gunzipSync(await fs.readFile(file),{maxOutputLength:64000000}).toString());if(cache.key===key&&valid(cache.data,size))return cache.data;}}catch{}
 const data=await readGrid(scene,grid,{signal,bands:PRETRAINED_BANDS});
 if(!valid(data,size))throw Error('Invalid full-context grid');
 try{await fs.mkdir(DIRECTORY,{recursive:true});const temporary=file+'.'+process.pid+'.'+crypto.randomBytes(4).toString('hex')+'.tmp';await fs.writeFile(temporary,zlib.gzipSync(JSON.stringify({key,data})));await fs.rename(temporary,file);}catch{}
 return data;
}
module.exports={context,fingerprint,valid};
