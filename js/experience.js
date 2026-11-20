/* One workspace, with a language switch. Research tools live in the tools dialog. */
(()=>{
 const control=document.getElementById('experienceOpen');
 let language='tr';try{const saved=localStorage.getItem('focus-public-language');if(['tr','en'].includes(saved))language=saved;}catch{}
 control.removeAttribute('aria-haspopup');control.className='simple-language';control.setAttribute('translate','no');
 function apply(){window.OdakI18n.setLanguage(language);control.textContent=language==='tr'?'EN':'TR';control.setAttribute('aria-label',language==='tr'?'Switch to English':'Türkçeye geç');try{localStorage.setItem('focus-public-language',language);}catch{}}
 control.onclick=()=>{language=window.OdakI18n.language==='tr'?'en':'tr';apply();};apply();
})();
