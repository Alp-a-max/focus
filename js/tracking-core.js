/* Date-aware model advection. This is a model trajectory, not an observed object track. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./drift.js'));else root.FocusTrackingCore=factory(root.PelagicDrift);})(typeof globalThis!=='undefined'?globalThis:this,function(drift){
 'use strict';const HOUR=3600000,DEG=111.32;
 const distance=(a,b)=>DEG*Math.hypot(a.lat-b.lat,(a.lon-b.lon)*Math.cos(a.lat*Math.PI/180));
 function point(p){return Number.isFinite(p?.lat)&&Number.isFinite(p?.lon)&&Math.abs(p.lat)<=79&&Math.abs(p.lon)<=178.5;}
 function normalize(raw,kind){
  const list=Array.isArray(raw)?raw:[raw],speed=kind==='current'?'ocean_current_velocity':'wind_speed_10m',direction=kind==='current'?'ocean_current_direction':'wind_direction_10m';
  if(!list.length||list.length>9)throw Error('INVALID_FIELDS');
  return list.map(item=>{
   if(!point({lat:item.latitude,lon:item.longitude})||item.utc_offset_seconds!==0||item.hourly_units?.[speed]!=='km/h'||item.hourly_units?.[direction]!=='°'||!Array.isArray(item.hourly?.time))throw Error('INVALID_FIELDS');
   const values=new Map();
   item.hourly.time.forEach((text,i)=>{
    if(typeof text!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:00(?::00)?Z?$/.test(text))throw Error('INVALID_FIELDS');
    const time=Date.parse(text.replace(/Z$/,'')+'Z'),s=item.hourly[speed]?.[i],d=item.hourly[direction]?.[i];
    if(!Number.isFinite(time)||values.has(time))throw Error('INVALID_FIELDS');
    values.set(time,Number.isFinite(s)&&s>=0&&Number.isFinite(d)&&d>=0&&d<=360?drift.vector(s,d,kind==='wind'):null);
   });
   return {lat:item.latitude,lon:item.longitude,values};
  });
 }
 function vector(cells,p,time){
  let best=null,km=Infinity;
  for(const cell of cells){const d=distance(p,cell);if(d<km){km=d;best=cell;}}
  if(!best||km>25)throw Error('DISTANT_FIELD');
  const start=Math.floor(time/HOUR)*HOUR,frac=(time-start)/HOUR,a=best.values.get(start),b=best.values.get(start+HOUR);
  if(!a||(frac>0&&!b))throw Error('MISSING_HOUR');
  return frac>0?a.map((v,i)=>v*(1-frac)+b[i]*frac):a;
 }
 function move(p,v,h){return {lat:p.lat+v[1]*h/DEG,lon:p.lon+v[0]*h/(DEG*Math.cos(p.lat*Math.PI/180))};}
 async function simulate({lat,lon,observedAt,now=Date.now(),futureHours=24,getFields,coast,signal}){
  const observed=Date.parse(observedAt),end=now+futureHours*HOUR;
  if(!point({lat,lon})||!Number.isFinite(now)||!Number.isFinite(futureHours)||!Number.isFinite(observed)||observed>now||now-observed>45*86400000||futureHours<0||futureHours>24||typeof getFields!=='function'||typeof coast?.pointOnLand!=='function'||typeof coast?.crossing!=='function')throw Error('INVALID_START');
  if(coast.pointOnLand(lat,lon))throw Error('LAND_START');
  const scenarios=[];
  for(const windage of [0,.01,.03]){
   let current={lat,lon,time:observed},state='complete',steps=0;const points=[current];
   try{
    while(current.time<end){
     if(signal?.aborted)throw Error('CANCELLED');if(++steps%32===0)await new Promise(resolve=>setTimeout(resolve,0));
     const step=Math.min(.25,(end-current.time)/HOUR,current.time<now?(now-current.time)/HOUR:Infinity),fields=await getFields(current,observed,end),v=vector(fields.marineCells,current,current.time);
     if(windage){const w=vector(fields.windCells,current,current.time);v.forEach((_,i)=>v[i]+=windage*w[i]);}
     const middle=move(current,v,step/2),middleTime=current.time+step*HOUR/2,nextFields=await getFields(middle,observed,end),mv=vector(nextFields.marineCells,middle,middleTime);
     if(windage){const w=vector(nextFields.windCells,middle,middleTime);mv.forEach((_,i)=>mv[i]+=windage*w[i]);}
     const next={...move(current,mv,step),time:current.time+step*HOUR};if(!point(next))throw Error('OUTSIDE_DOMAIN');
     const hit=coast.crossing(current,next);
     if(hit){const ratio=Math.min(1,distance(current,hit)/(distance(current,next)||1));points.push({...hit,time:current.time+step*HOUR*ratio});state='coast';break;}
     if(coast.pointOnLand(next.lat,next.lon))throw Error('COAST_UNKNOWN');
     points.push(next);current=next;
    }
   }catch(error){if(signal?.aborted||error.message==='CANCELLED')throw Error('CANCELLED');state=['DISTANT_FIELD','MISSING_HOUR','OUTSIDE_DOMAIN','COAST_UNKNOWN','FIELD_BUDGET','INVALID_FIELDS'].includes(error.message)?error.message:'FIELD_UNAVAILABLE';}
   const nowPoint=points.findLast(p=>p.time<=now);
   scenarios.push({windage,state,points,modelled_now:nowPoint&&nowPoint.time>=now-15*60000?nowPoint:null,reached_forecast_end:state==='complete'&&points.at(-1).time===end});
  }
  return {schema_version:1,method:'15-minute midpoint; adaptive nearest archived/forecast model cells',observed_at:new Date(observed).toISOString(),now:new Date(now).toISOString(),forecast_end:new Date(end).toISOString(),historical_advection:true,observational_tracking:false,scenarios};
 }
 function provider({fetchImpl=fetch,signal,onProgress=()=>{}}={}){
  const cache=new Map(),sources=[];let requests=0;
  async function getFields(p,start,end){
   if(!point(p))throw Error('OUTSIDE_DOMAIN');
   const lat=Math.round(p.lat/.4)*.4,lon=Math.round(p.lon/.4)*.4,key=[lat.toFixed(2),lon.toFixed(2),start,end].join(':');
   if(cache.has(key))return cache.get(key);
   if(requests>=16)throw Error('FIELD_BUDGET');requests++;onProgress(requests);
   const operation=(async()=>{
    const coords=[];for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)coords.push([lat+y*.2,lon+x*.2]);
    const params=new URLSearchParams({latitude:coords.map(p=>p[0].toFixed(4)).join(','),longitude:coords.map(p=>p[1].toFixed(4)).join(','),timezone:'UTC',start_date:new Date(start).toISOString().slice(0,10),end_date:new Date(end+HOUR).toISOString().slice(0,10)});
    const urls=['https://marine-api.open-meteo.com/v1/marine?'+params+'&hourly=ocean_current_velocity,ocean_current_direction&cell_selection=nearest','https://api.open-meteo.com/v1/forecast?'+params+'&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh'];
    const timed=AbortSignal.timeout(30000),combined=signal?AbortSignal.any([signal,timed]):timed;
    const raw=await Promise.all(urls.map(async url=>{const r=await fetchImpl(url,{signal:combined});if(!r.ok)throw Error('FIELD_UNAVAILABLE');return r.json();}));
    const value={marineCells:normalize(raw[0],'current'),windCells:normalize(raw[1],'wind')};sources.push({centre:{lat,lon},retrieved_at:new Date().toISOString(),start_date:params.get('start_date'),end_date:params.get('end_date')});return value;
   })();cache.set(key,operation);return operation;
  }
  return {getFields,sources,get requestBatches(){return requests;}};
 }
 return {simulate,provider,normalize,vector,distance};
});
