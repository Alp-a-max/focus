/*
 * Çalışma alanı ile hesap sistemi bağlantısı.
 * - Hesap API'si bu adreste çalışmıyorsa (yerel demo, kurulum öncesi) hiçbir şeyi engellemez.
 * - Çalışıyorsa: "Tahmini başlat" için giriş gerekir ve her tahmin sunucuda bir hak düşer.
 *   Hata sonrası "Tekrar dene" aynı istek kimliğini kullanır, ikinci kez hak düşmez.
 * - "Örnek tahmini göster" hesapsız ve ücretsizdir.
 * Not: Tahmin hesabı tarayıcıda yapıldığı için bu kapı bir kullanım sözleşmesi uygulamasıdır;
 * tam zorlama için hesabın sunucuda yapılması gerekir (bkz. tools/GUVENLIK.md).
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const tr=(a,b)=>window.OdakI18n?.language==='en'?b:a;
 let enabled=false,session=null,allowOnce=false,exampleRun=false,lastId=null,busy=false;

 const randomId=()=>[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');

 function chip(){
  const host=document.querySelector('.simple-header-actions');
  if(!host)return;
  let a=$('focusAccountChip');
  if(!a){a=document.createElement('a');a.id='focusAccountChip';a.className='focus-account-chip';a.setAttribute('translate','no');host.prepend(a)}
  if(session?.user){
   const e=session.entitlement;a.href='hesap.html';
   a.textContent=tr(`${e.remaining} tahmin hakkı`,`${e.remaining} forecasts left`);
   a.title=tr(`${session.user.name}: hesabım`,`${session.user.name}: my account`);
  }else{a.href='giris.html?next=platform.html';a.textContent=tr('Giriş yap','Sign in');a.removeAttribute('title')}
 }

 function notice(html,kind='info'){
  let box=$('focusGateNotice');
  const anchor=$('releaseRun')?.closest('.simple-control')||$('releaseRun')?.parentElement;
  if(!box){box=document.createElement('div');box.id='focusGateNotice';box.className='focus-gate-notice';box.setAttribute('role','status');box.setAttribute('aria-live','polite');anchor?.append(box)}
  box.dataset.kind=kind;box.replaceChildren();
  for(const part of html){
   if(typeof part==='string'){box.append(document.createTextNode(part))}
   else{const a=document.createElement('a');a.href=part.href;a.textContent=part.text;box.append(a)}
  }
  box.hidden=false;
 }
 const clearNotice=()=>{const b=$('focusGateNotice');if(b)b.hidden=true};

 async function gate(ev){
  if(!enabled)return;
  if(allowOnce){allowOnce=false;return}
  if(exampleRun){exampleRun=false;return}
  const btn=ev.currentTarget;
  if(btn.disabled)return;
  ev.stopImmediatePropagation();ev.preventDefault();
  if(busy)return;
  if(!session?.user){
   notice([tr('Gerçek tahmin için ücretsiz bir hesap gerekir (günde 5 tahmin). ','A free account is needed for live forecasts (5 a day). '),{href:'kayit.html?next=platform.html',text:tr('Hesap aç','Create account')},' · ',{href:'giris.html?next=platform.html',text:tr('Giriş yap','Sign in')},tr('. Hesapsız denemek için "Örnek tahmini göster"i kullanın.','. To try without an account, use "Show example forecast".')],'warn');
   return;
  }
  const retry=/Tekrar dene|Try again/.test(btn.textContent||'');
  const id=retry&&lastId?lastId:randomId();lastId=id;
  busy=true;
  try{
   const r=await window.FocusAPI.post('consume',{hours:24,request_id:id});
   session={...session,entitlement:{...session.entitlement,...r}};chip();clearNotice();
   allowOnce=true;btn.click();
  }catch(e){
   if(e.code==='auth_required'){session=null;chip()}
   const upgrade=e.code==='quota_exhausted'||e.code==='horizon_not_included';
   notice(upgrade?[e.message+' ',{href:'hesap.html',text:tr('Paketleri gör','See plans')}]:[e.message],'bad');
  }finally{busy=false}
 }

 async function init(){
  if(!window.FocusAPI||!$('releaseRun'))return;
  try{session=await window.FocusAPI.session()}catch{return} // API yok: demo modu, kapı kapalı
  enabled=true;chip();
  $('releaseRun').addEventListener('click',gate,true);
  $('releaseExample')?.addEventListener('click',()=>{exampleRun=true;setTimeout(()=>{exampleRun=false},0)},true);
  document.addEventListener('odak:language',chip);
  new MutationObserver(chip).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
