/* Shared presentation preference; does not change data, models or memberships. */
(()=>{
 'use strict';
 const key='focus-theme';let theme='dark',button;
 try{if(localStorage.getItem(key)==='light')theme='light';}catch{}
 function label(){
  if(!button)return;
  const en=document.documentElement.lang==='en';
  const action=theme==='dark'?(en?'Switch to light theme':'Açık temaya geç'):(en?'Switch to dark theme':'Koyu temaya geç');
  button.setAttribute('aria-label',action);button.title=action;button.dataset.currentTheme=theme;
  button.innerHTML=theme==='dark'?'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>';
 }
 function apply(){
  document.documentElement.dataset.theme=theme;
  const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content=theme==='light'?'#f4f7fa':'#080d13';
  label();
 }
 apply();
 function mount(){
  const target=document.querySelector('.nav-actions')||document.querySelector('body > header');if(!target)return;
  button=document.createElement('button');button.id='themeToggle';button.type='button';button.className='theme-toggle';button.setAttribute('translate','no');
  const languages=target.querySelector('.language-control');if(languages)languages.after(button);else target.append(button);
  button.addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';try{localStorage.setItem(key,theme);}catch{}apply();});label();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 new MutationObserver(label).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 window.addEventListener('storage',event=>{if(event.key===key){theme=event.newValue==='light'?'light':'dark';apply();}});
})();
