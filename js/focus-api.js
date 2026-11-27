/* FOCUS hesap API istemcisi. Haklar sunucuda hesaplanır; burada yalnızca istek gönderilir ve yanıt gösterilir. */
(()=>{
 'use strict';
 const base=new URL('api/index.php',document.baseURI).href;
 let csrf=null,last=null,pending=null;
 async function request(action,{method='GET',body,query=''}={}){
  const headers={'Accept':'application/json'};
  if(method==='POST'){headers['Content-Type']='application/json';if(csrf)headers['X-CSRF-Token']=csrf;}
  let res;
  try{res=await fetch(`${base}?a=${encodeURIComponent(action)}${query}`,{method,headers,credentials:'same-origin',body:body===undefined?undefined:JSON.stringify(body)});}
  catch{throw Object.assign(new Error('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.'),{code:'network'});}
  const type=res.headers.get('content-type')||'';
  if(!type.includes('application/json'))throw Object.assign(new Error('Hesap sistemi bu adreste henüz çalışmıyor.'),{code:'unavailable'});
  const data=await res.json();
  if(data.csrf)csrf=data.csrf;
  if(!res.ok||data.ok===false)throw Object.assign(new Error(data.message||'İşlem tamamlanamadı.'),{code:data.error,field:data.field,status:res.status});
  return data;
 }
 async function session(force=false){
  if(last&&!force)return last;
  if(pending&&!force)return pending;
  pending=request('session').then(d=>(last=d)).finally(()=>{pending=null;});
  return pending;
 }
 async function post(action,body={}){
  if(!csrf)await session();
  try{const d=await request(action,{method:'POST',body});if(d.user!==undefined)last=d;return d;}
  catch(e){
   if(e.code==='csrf'){await session(true);const d=await request(action,{method:'POST',body});if(d.user!==undefined)last=d;return d;}
   throw e;
  }
 }
 const get=(action,query='')=>request(action,{query});
 window.FocusAPI=Object.freeze({session,post,get});
})();
