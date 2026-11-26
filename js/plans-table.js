/* Paket tablosu: aylık/yıllık fiyat gösterimi ve oturumdaki geçerli paketin vurgulanması. */
(()=>{
 'use strict';
 let billing='month';
 function render(){
  const en=window.FocusSite?.lang==='en';
  document.querySelectorAll('.plans-table td.price').forEach(td=>{
   const v=td.dataset[billing+(en?'En':'')]||td.dataset[billing];td.textContent=v;
  });
  document.querySelectorAll('.plans-table a[href^="hesap.html?plan="]').forEach(a=>{
   const u=new URL(a.getAttribute('href'),location.href);u.searchParams.set('billing',billing);a.setAttribute('href','hesap.html'+u.search);
  });
  document.querySelectorAll('[data-billing]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.billing===billing)));
 }
 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-billing]').forEach(b=>b.addEventListener('click',()=>{billing=b.dataset.billing;render()}));
  render();
  window.FocusAPI?.session().then(s=>{
   const id=s.entitlement?.plan;if(!id)return;
   document.querySelector(`.plans-table tr[data-plan="${CSS.escape(id)}"]`)?.classList.add('current');
  }).catch(()=>{});
 });
 document.addEventListener('focus:language',render);
})();
