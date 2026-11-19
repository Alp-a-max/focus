/* Local service health and human-readable failures; no account or payment state. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {root.FocusService=api;api.mount();}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const unavailable='İnceleme servisine ulaşılamıyor. Tam çalışma alanını açın veya bağlantıyı yeniden kontrol edin.';
  async function json(url,options={}) {
    let response;
    const timeout=AbortSignal.timeout(125000),signal=options.signal?AbortSignal.any([options.signal,timeout]):timeout;
    try {response=await fetch(url,{...options,signal});}
    catch(error){if(error.name==='AbortError')throw error;if(error.name==='TimeoutError')throw Error('İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.');throw Error(unavailable);}
    if(!/application\/(?:[\w.+-]*\+)?json\b/i.test(response.headers.get('content-type')||''))throw Error(unavailable);
    let value;try{value=await response.json();}catch{throw Error('Servis yanıtı okunamadı. Lütfen tekrar deneyin.');}
    if(!response.ok)throw Error(typeof value?.error==='string'?value.error:'İşlem tamamlanamadı. Lütfen tekrar deneyin.');
    return value;
  }
  async function health(url) {
    try {const value=await json(url,{signal:AbortSignal.timeout(2500)});return value.service==='focus-local-api'&&value.schema_version===1;}
    catch{return false;}
  }
  async function platformUrl() {
    if(await health('/api/health'))return new URL('platform.html',location.href).href;
    if(!['127.0.0.1','localhost'].includes(location.hostname))return new URL('platform.html',location.href).href;
    try {
      const config=await json('assets/focus-runtime.json',{signal:AbortSignal.timeout(2500)}),origin=new URL(config.local_api_origin);
      if(origin.protocol==='http:'&&['127.0.0.1','localhost'].includes(origin.hostname)&&origin.pathname==='/'&&await health(origin.origin+'/api/health'))return origin.origin+'/platform.html';
    }catch{}
    return new URL('platform.html',location.href).href;
  }
  function mount() {
    const workspace=document.getElementById('intelligence');if(!workspace)return;
    const box=document.createElement('aside');box.className='service-notice';box.hidden=true;box.setAttribute('aria-label','Çalışma alanı bağlantısı');
    const message=document.createElement('p');message.id='serviceMessage';message.setAttribute('role','status');
    const link=document.createElement('a');link.className='ghost';link.id='serviceOpen';link.textContent='Tam çalışma alanını aç';
    const retry=document.createElement('button');retry.type='button';retry.textContent='Bağlantıyı kontrol et';retry.id='serviceRetry';
    box.append(message,link,retry);workspace.prepend(box);
    if(!['127.0.0.1','localhost'].includes(location.hostname)){
      document.body.classList.add('public-feed-mode');box.classList.add('public-feed-notice');box.hidden=false;link.hidden=true;
      message.textContent='Ortak uydu sonuçları küresel izleme ağında yayımlanır. Yeni isteğe bağlı tarama ve kişisel kayıtlar yerel çalışma alanındadır. Tarihli sürüklenme hesabı bu yayında kullanılabilir.';
      retry.textContent='İzleme ağına git';retry.onclick=()=>document.getElementById('monitorHeading')?.scrollIntoView({behavior:'smooth',block:'start'});return;
    }
    async function update(){
      retry.disabled=true;
      const available=await health('/api/health');box.hidden=available;
      if(!available){const target=await platformUrl();link.href=target;link.hidden=new URL(target).origin===location.origin;
        message.textContent=link.hidden?'Uydu inceleme ve kayıt servisi şu anda bağlı değil. FOCUS başlatıldıktan sonra bağlantıyı yeniden kontrol edin.':'Harita ve modeller açık. Uydu incelemesi ve kayıtlar için tam çalışma alanına geçin.';}
      retry.disabled=false;
    }
    retry.addEventListener('click',update);update();
  }
  return {json,health,platformUrl,mount,unavailable};
});
