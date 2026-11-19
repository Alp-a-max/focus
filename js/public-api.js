window.FocusPublicAPI=(()=>{
 let origin=null;const local=['localhost','127.0.0.1'].includes(location.hostname);
 const ready=(async()=>{if(local)return false;try{const r=await fetch('assets/public-api.json?v='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!r.ok)return false;const c=await r.json(),url=new URL(c.origin);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/')return false;const h=await fetch(url.origin+'/api/health',{signal:AbortSignal.timeout(7000)});const v=await h.json();if(h.ok&&v.service==='focus-public-api'&&v.detection?.available){origin=url.origin;return true;}}catch{}return false;})();
 async function detect(query,{signal,onProgress=()=>{}}={}){
  if(!await ready)throw Error('SERVICE_UNAVAILABLE');
  const request=async(path,options={})=>{const r=await fetch(origin+path,{...options,signal:AbortSignal.any([signal,AbortSignal.timeout(15000)]),cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.code||'SERVICE_UNAVAILABLE');return data;};
  const job=await request('/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(query)});const start=Date.now();
  while(Date.now()-start<240000){if(signal.aborted)throw signal.reason;const j=await request('/api/jobs/'+job.id);onProgress(j);if(j.state==='done')return j.result;if(j.state==='error')throw Error(j.code||'DETECTION_FAILED');await new Promise((resolve,reject)=>{const cancel=()=>{clearTimeout(timer);reject(signal.reason);};const timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve();},2000);signal.addEventListener('abort',cancel,{once:true});});}
  throw Error('DETECTION_TIMEOUT');
 }
 return {ready,detect,get available(){return Boolean(origin);}};
})();
