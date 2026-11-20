'use strict';
// Only inference and dated public data are exposed. No filesystem or user-record routes.
const http=require('node:http'),crypto=require('node:crypto');
const detector=require('../ml/detect-pretrained.cjs'),contract=require('../js/detection-contract.js');
const {isSceneUnavailable}=require('../detection-errors.cjs');
function createApi({detect=detector.detect,status=detector.status,now=Date.now}={}){
 const jobs=new Map(),queue=[],rates=new Map(),cache=new Map();let active=false,dayStart=now(),daily=0;
 function reply(res,code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
 function prune(){for(const [id,j] of jobs)if(now()-j.created>3600000&&j.state!=='running')jobs.delete(id);for(const [ip,r]of rates)if(now()-r.start>3600000)rates.delete(ip);for(const [k,c]of cache)if(now()-c.created>3600000)cache.delete(k);if(now()-dayStart>86400000){dayStart=now();daily=0;}}
 async function work(){if(active||!queue.length)return;active=true;const j=queue.shift();j.state='running';const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),185000);
  try{const result=contract.validate(await detect(j.lat,j.lon,{signal:controller.signal}));if(result.metadata.query?.lat!==j.lat||result.metadata.query?.lon!==j.lon)throw Error('SOURCE_MISMATCH');j.result=result;j.state='done';cache.set(j.key,{created:now(),result});}
  catch(error){j.state='error';j.code=controller.signal.aborted?'DETECTION_TIMEOUT':isSceneUnavailable(error)?'NO_USABLE_SCENE':'DETECTION_FAILED';}
  finally{clearTimeout(timer);active=false;setImmediate(work);}
 }
 return http.createServer(async(req,res)=>{
  prune();const origin=req.headers.origin,allowed=origin==='https://alp-a-max.github.io'||origin==='https://focusocean.xo.je'||/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin||'');
  if(origin&&!allowed){reply(res,403,{code:'ORIGIN_DENIED'});return;}
  if(allowed){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
  let url;try{url=new URL(req.url,'http://localhost');}catch{reply(res,400,{code:'INVALID_URL'});return;}
  if(req.method==='GET'&&url.pathname==='/api/health'){reply(res,200,{service:'focus-public-api',schema_version:1,detection:status(),queue:queue.length,active,temporary_demo:true});return;}
  if(req.method==='GET'&&url.pathname==='/api/feed'){reply(res,200,require('node:fs').existsSync(require('node:path').join(__dirname,'../assets/monitor-feed.json'))?JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../assets/monitor-feed.json'),'utf8')):{});return;}
  const match=url.pathname.match(/^\/api\/jobs\/([a-f0-9]{32})$/);
  if(req.method==='GET'&&match){const j=jobs.get(match[1]);if(!j){reply(res,404,{code:'JOB_EXPIRED'});return;}reply(res,200,{id:match[1],state:j.state,position:j.state==='queued'?queue.indexOf(j)+1:0,result:j.result||null,code:j.code||null});return;}
  if(req.method!=='POST'||url.pathname!=='/api/jobs'){reply(res,404,{code:'NOT_FOUND'});return;}
  if(!allowed){reply(res,403,{code:'ORIGIN_REQUIRED'});return;}
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){reply(res,415,{code:'JSON_REQUIRED'});return;}
  let body='',bytes=0;try{for await(const chunk of req){bytes+=chunk.length;if(bytes>512){reply(res,413,{code:'TOO_LARGE'});return;}body+=chunk;}body=JSON.parse(body);}catch{reply(res,400,{code:'INVALID_JSON'});return;}
  const {lat,lon}=body;if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>79||Math.abs(lon)>179){reply(res,400,{code:'INVALID_COORDINATES'});return;}
  if(!status().available){reply(res,503,{code:'MODEL_UNAVAILABLE'});return;}
  const ip=req.headers['cf-connecting-ip']||req.socket.remoteAddress,key=lat+','+lon,r=rates.get(ip)||{start:now(),count:0};
  if(r.count>=6||daily>=120){reply(res,429,{code:'RATE_LIMITED'});return;}
  if(queue.length>=3){reply(res,429,{code:'QUEUE_FULL'});return;}
  const id=crypto.randomBytes(16).toString('hex'),hit=cache.get(key),job={id,key,lat,lon,created:now(),state:hit?'done':'queued',result:hit?.result};
  jobs.set(id,job);r.count++;rates.set(ip,r);daily++;if(!hit)queue.push(job);reply(res,202,{id,state:job.state,position:queue.indexOf(job)+1});setImmediate(work);
 });
}
module.exports={createApi};
if(require.main===module){const port=Number(process.env.FOCUS_PUBLIC_PORT||8780);if(!Number.isInteger(port)||port<1||port>65535)throw Error('INVALID_PORT');const api=createApi();api.requestTimeout=15000;api.listen(port,'127.0.0.1',()=>console.log('FOCUS public inference gateway: '+port));}
