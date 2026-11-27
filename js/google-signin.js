/* "Google ile giriş" düğmesi. İstemci kimliği yönetici panelinden gelir; boşsa düğme hiç görünmez.
   Google'ın verdiği kimlik jetonu sunucuda doğrulanır (api/lib/google.php). */
(()=>{
 'use strict';
 const box=document.getElementById('googleSignIn');
 if(!box)return;
 const next=()=>{try{const u=new URL(new URLSearchParams(location.search).get('next')||'hesap.html',location.href);return u.origin===location.origin?u.pathname.split('/').pop()+u.search:'hesap.html';}catch{return 'hesap.html';}};
 function load(src){return new Promise((ok,bad)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=ok;s.onerror=bad;document.head.append(s);});}
 document.addEventListener('DOMContentLoaded',async()=>{
  let s;try{s=await window.FocusAPI.session();}catch{return;}
  const id=s.settings?.google_client_id;if(!id||s.user)return;
  try{await load('https://accounts.google.com/gsi/client');}catch{return;}
  const alert=box.querySelector('.alert');
  window.google.accounts.id.initialize({client_id:id,ux_mode:'popup',callback:async r=>{
   try{await window.FocusAPI.post('google',{credential:r.credential});location.assign(next());}
   catch(e){alert.className='alert bad';alert.textContent=e.message;}
  }});
  window.google.accounts.id.renderButton(box.querySelector('.g-button'),{theme:'outline',size:'large',text:'continue_with',shape:'rectangular',locale:window.FocusSite?.lang==='en'?'en':'tr',width:300});
  box.hidden=false;
 });
})();
