/* Paket kartları: aylık/yıllık fiyat, deneme süresi ve ücretli paketlerin açık olup olmadığı (yönetici panelinden). */
(()=>{
 'use strict';
 let billing='month',settings=null;
 const t=(a,b)=>window.FocusSite?.t(a,b)??a;
 function render(){
  const en=window.FocusSite?.lang==='en',key=billing+(en?'En':'');
  document.querySelectorAll('.plan .price:not(.fixed)').forEach(p=>{p.querySelector('.amount').textContent=p.dataset[key]||p.dataset[billing];const per=p.querySelector('.per');per.textContent=per.dataset[key]||per.dataset[billing];});
  document.querySelectorAll('.plan a.plan-cta').forEach(a=>{
   const open=settings?.subscriptions_enabled===true;
   if(!a.dataset.href)a.dataset.href=a.getAttribute('href');
   if(open){const u=new URL(a.dataset.href,location.href);u.searchParams.set('billing',billing);a.setAttribute('href','hesap.html'+u.search);a.removeAttribute('aria-disabled');a.textContent=t('Seç','Choose');}
   else{a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.textContent=t('Yakında','Coming soon');}
  });
  document.querySelectorAll('[data-billing]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.billing===billing)));
  const hours=settings?.trial_hours??24,title=document.getElementById('trialTitle');
  if(title)title.textContent=hours%24===0&&hours>=48?t(`${hours/24} gün ücretsiz`,`${hours/24} days free`):t(`${hours} saat ücretsiz`,`${hours} hours free`);
 }
 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-billing]').forEach(b=>b.addEventListener('click',()=>{billing=b.dataset.billing;render()}));
  render();
  window.FocusAPI?.session().then(s=>{settings=s.settings;render();const id=s.entitlement?.plan;if(id)document.querySelector(`.plan[data-plan="${CSS.escape(id)}"]`)?.classList.add('current');}).catch(()=>{});
 });
 document.addEventListener('focus:language',render);
})();
