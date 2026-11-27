/* Kamuya açık sayfalar: tema, dil ve hesap bağlantısı. Tercihler yalnızca bu tarayıcıda saklanır. */
(()=>{
 'use strict';
 const store={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
 const root=document.documentElement;

 // Tema: kayıtlı seçim yoksa işletim sistemi tercihi.
 const savedTheme=store.get('focus-theme');
 if(savedTheme==='light'||savedTheme==='dark')root.dataset.theme=savedTheme;
 function currentTheme(){return root.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}

 // Dil: TR metin HTML'de, EN karşılığı data-en özniteliğinde.
 let lang=store.get('focus-public-language')==='en'?'en':'tr';
 const attrs=['placeholder','aria-label','title','content','alt'];
 function applyLanguage(){
  root.lang=lang;
  document.querySelectorAll('[data-en]').forEach(el=>{
   if(el.dataset.tr===undefined)el.dataset.tr=el.innerHTML;
   el.innerHTML=lang==='en'?el.dataset.en:el.dataset.tr;
  });
  for(const a of attrs)document.querySelectorAll(`[data-en-${a}]`).forEach(el=>{
   const k='tr'+a.replace(/-./g,m=>m[1].toUpperCase());
   if(el.dataset[k]===undefined)el.dataset[k]=el.getAttribute(a)||'';
   el.setAttribute(a,lang==='en'?el.getAttribute(`data-en-${a}`):el.dataset[k]);
  });
  const t=document.querySelector('title[data-en-text]');
  if(t){if(!t.dataset.trText)t.dataset.trText=t.textContent;t.textContent=lang==='en'?t.dataset.enText:t.dataset.trText;}
  document.querySelectorAll('[data-lang-toggle]').forEach(b=>{b.textContent=lang==='en'?'TR':'EN';b.setAttribute('aria-label',lang==='en'?'Türkçeye geç':'Switch to English')});
  document.querySelectorAll('[data-theme-toggle]').forEach(labelTheme);
  document.dispatchEvent(new CustomEvent('focus:language',{detail:lang}));
 }
 function labelTheme(b){
  const dark=currentTheme()==='dark';
  const text=lang==='en'?(dark?'Switch to light theme':'Switch to dark theme'):(dark?'Açık temaya geç':'Koyu temaya geç');
  b.setAttribute('aria-label',text);b.title=text;
  b.innerHTML=dark?'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>';
 }
 window.FocusSite=Object.freeze({get lang(){return lang},t:(tr,en)=>lang==='en'?en:tr,theme:currentTheme});

 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-theme-toggle]').forEach(b=>b.addEventListener('click',()=>{
   const next=currentTheme()==='dark'?'light':'dark';root.dataset.theme=next;store.set('focus-theme',next);
   document.querySelectorAll('[data-theme-toggle]').forEach(labelTheme);
   document.dispatchEvent(new CustomEvent('focus:theme',{detail:next}));
  }));
  document.querySelectorAll('[data-lang-toggle]').forEach(b=>b.addEventListener('click',()=>{lang=lang==='en'?'tr':'en';store.set('focus-public-language',lang);applyLanguage()}));
  applyLanguage();

  // Hesap bağlantısı: oturum varsa "Hesabım". Hesap sistemi kurulmamışsa bağlantı olduğu gibi kalır.
  const link=document.querySelector('[data-account-link]');
  if(link&&window.FocusAPI)window.FocusAPI.session().then(s=>{
   if(!s.user)return;
   link.href='hesap.html';link.dataset.tr='Hesabım';link.dataset.en='My account';link.setAttribute('data-en','My account');
   link.innerHTML=lang==='en'?'My account':'Hesabım';
  }).catch(()=>{});
 });
})();
