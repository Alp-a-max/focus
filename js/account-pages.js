/* Giriş, kayıt, hesap ve yönetim sayfaları. Tüm kararlar sunucuda verilir; bu dosya yalnızca formları yönetir. */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s);
 const t=(tr,en)=>window.FocusSite?.t(tr,en)??tr;
 const EN={bad_credentials:'Email or password is incorrect.',locked:'Too many failed attempts. Try again in 15 minutes.',rate_limited:'Too many attempts. Please wait a few minutes and try again.',email_taken:'An account with this email already exists. Try signing in.',invalid_email:'Enter a valid email address.',weak_password:'Choose a password of 10+ characters that does not contain your email or repeated characters.',invalid_name:'Name must be 2–80 characters.',terms_required:'Please accept the privacy notice to continue.',try_again:'Sign-up could not be completed. Wait a few seconds and try again.',csrf:'Session check failed. Refresh the page and try again.',pending_exists:'You already have a pending request. Cancel it first.',already_active:'This plan is already active.',network:'Could not reach the server. Check your connection.',unavailable:'The account system is not running on this address yet.',not_configured:'The account system has not been set up yet.',db_unavailable:'The database is unreachable right now. Try again shortly.',auth_required:'Please sign in.',forbidden:'Admins only.',server_error:'Something went wrong. Please try again.'};
 const message=e=>window.FocusSite?.lang==='en'&&EN[e.code]?EN[e.code]:e.message;
 const money=c=>'$'+(c/100).toLocaleString(window.FocusSite?.lang==='en'?'en-US':'tr-TR',{maximumFractionDigits:2});
 const date=s=>new Date(s.includes('T')?s:s.replace(' ','T')+'Z').toLocaleDateString(window.FocusSite?.lang==='en'?'en-GB':'tr-TR',{day:'numeric',month:'long',year:'numeric'});
 const planName=(id,plans)=>{const p=plans.find(x=>x.id===id);if(!p)return id;return window.FocusSite?.lang==='en'?({free:'Free',starter:'Starter',professional:'Professional',enterprise:'Institutional'}[id]||p.name):p.name};
 const safeNext=v=>{try{const u=new URL(v||'hesap.html',location.href);return u.origin===location.origin?u.pathname.split('/').pop()+u.search:'hesap.html'}catch{return 'hesap.html'}};

 function clearErrors(form){form.querySelectorAll('[aria-invalid]').forEach(i=>i.removeAttribute('aria-invalid'));form.querySelectorAll('.err').forEach(e=>e.remove())}
 function showError(form,e){
  const box=form.querySelector('.alert');
  const input=e.field&&form.querySelector(`[name="${CSS.escape(e.field)}"]`);
  if(input){input.setAttribute('aria-invalid','true');const p=document.createElement('p');p.className='err';p.id=input.id+'-err';p.textContent=message(e);input.closest('.field,.check')?.append(p);input.setAttribute('aria-describedby',p.id);input.focus();if(box)box.textContent='';}
  else if(box){box.className='alert bad';box.textContent=message(e);box.focus?.()}
 }
 async function submit(form,fn){
  const btn=form.querySelector('button[type="submit"]');clearErrors(form);
  btn.disabled=true;const label=btn.textContent;btn.textContent=t('Gönderiliyor…','Sending…');
  try{return await fn(Object.fromEntries(new FormData(form)))}
  catch(e){showError(form,e);return null}
  finally{btn.disabled=false;btn.textContent=label}
 }

 const pages={
  async login(){
   const form=$('#loginForm'),next=safeNext(new URLSearchParams(location.search).get('next'));
   try{const s=await FocusAPI.session();if(s.user){location.replace(next);return}}catch(e){showError(form,e)}
   form.addEventListener('submit',async ev=>{ev.preventDefault();
    const ok=await submit(form,d=>FocusAPI.post('login',{email:d.email,password:d.password}));
    if(ok)location.assign(next);
   });
  },
  async register(){
   const form=$('#registerForm'),next=safeNext(new URLSearchParams(location.search).get('next'));
   try{const s=await FocusAPI.session();if(s.user){location.replace(next);return}}catch(e){showError(form,e)}
   form.addEventListener('submit',async ev=>{ev.preventDefault();
    if(form.password.value!==form.password2.value){showError(form,{field:'password2',message:t('Şifreler aynı değil.','Passwords do not match.')});return}
    const ok=await submit(form,d=>FocusAPI.post('register',{email:d.email,name:d.name,organization:d.organization||'',password:d.password,website:d.website||'',accept:form.accept.checked}));
    if(ok)location.assign(next);
   });
  },
  async account(){
   let s;
   try{s=await FocusAPI.session(true)}catch(e){$('#accountState').className='alert bad';$('#accountState').textContent=message(e);return}
   if(!s.user){location.replace('giris.html?next='+encodeURIComponent('hesap.html'+location.search));return}
   $('#accountState').remove();$('#accountBody').hidden=false;
   const render=s=>{
    $('#who').textContent=s.user.name;
    $('#email').textContent=s.user.email;
    $('#org').textContent=s.user.organization||'—';
    $('#since').textContent=date(s.user.since);
    $('#adminLink').hidden=!s.user.admin;
    const e=s.entitlement;
    $('#planName').textContent=planName(e.plan,s.plans);
    $('#usage').textContent=t(`${e.used} / ${e.limit} tahmin kullanıldı`,`${e.used} of ${e.limit} forecasts used`)+(e.period==='day'?t(' (bugün)',' (today)'):t(' (bu dönem)',' (this period)'));
    $('#meter').style.width=Math.min(100,e.limit?e.used/e.limit*100:0)+'%';
    $('#meterWrap').setAttribute('aria-valuenow',String(e.used));$('#meterWrap').setAttribute('aria-valuemax',String(e.limit));
    $('#resets').textContent=t('Yenilenme: ','Resets: ')+date(e.resets_at);
    $('#horizon').textContent=t(`Tahmin ufku: en fazla ${Math.min(24,e.max_hours)} saat`,`Forecast horizon: up to ${Math.min(24,e.max_hours)} hours`);
    const sub=e.subscription;
    $('#activeSub').hidden=!sub;
    if(sub){$('#subEnd').textContent=(sub.cancel_at_period_end?t('Sona eriyor: ','Ends: '):t('Yenileme tarihi: ','Renews: '))+date(sub.period_end);$('#cancelSub').hidden=sub.cancel_at_period_end;$('#subRef').textContent=sub.reference}
    $('#pending').hidden=!s.pending;$('#requestForm').hidden=Boolean(s.pending);
    if(s.pending){
     $('#pendingPlan').textContent=planName(s.pending.plan,s.plans)+', '+(s.pending.billing==='year'?t('yıllık','yearly'):t('aylık','monthly'));
     $('#pendingAmount').textContent=money(s.pending.amount_cents)+' USD';
     $('#pendingRef').textContent=s.pending.reference;
     $('#paymentNote').textContent=s.payment_note||'';
    }
   };
   render(s);
   const q=new URLSearchParams(location.search);
   if(['starter','professional','enterprise'].includes(q.get('plan')))$('#reqPlan').value=q.get('plan');
   if(['month','year'].includes(q.get('billing')))$('#reqBilling').value=q.get('billing');
   if(q.get('plan')&&!s.pending)$('#requestForm').scrollIntoView({block:'center'});
   const priceHint=()=>{const p=s.plans.find(x=>x.id===$('#reqPlan').value);if(p)$('#reqPrice').textContent=money($('#reqBilling').value==='year'?p.month_cents*10:p.month_cents)+' USD'};
   $('#reqPlan').addEventListener('change',priceHint);$('#reqBilling').addEventListener('change',priceHint);priceHint();
   document.addEventListener('focus:language',()=>{render(s);priceHint()});

   $('#requestForm').addEventListener('submit',async ev=>{ev.preventDefault();const r=await submit(ev.target,d=>FocusAPI.post('subscribe',{plan:d.plan,billing:d.billing}));if(r){s=r;render(s);$('#pending').focus()}});
   $('#cancelRequest').addEventListener('click',async()=>{if(!confirm(t('Abonelik talebiniz iptal edilsin mi?','Cancel your subscription request?')))return;try{s=await FocusAPI.post('cancel_request');render(s)}catch(e){alert(message(e))}});
   $('#cancelSub').addEventListener('click',async()=>{if(!confirm(t('Aboneliğiniz dönem sonunda bitsin mi? Kalan süreyi kullanmaya devam edersiniz.','End your subscription at the end of the period? You keep access until then.')))return;try{s=await FocusAPI.post('cancel_subscription');render(s)}catch(e){alert(message(e))}});
   $('#passwordForm').addEventListener('submit',async ev=>{ev.preventDefault();const f=ev.target;const r=await submit(f,d=>FocusAPI.post('password',{current:d.current,new:d.new}));if(r){s=r;f.reset();const a=f.querySelector('.alert');a.className='alert ok';a.textContent=t('Şifre değişti. Diğer cihazlardaki oturumlar kapatıldı.','Password changed. Other devices were signed out.')}});
   $('#deleteForm').addEventListener('submit',async ev=>{ev.preventDefault();if(!confirm(t('Hesabınız ve kullanım kayıtlarınız kalıcı olarak silinecek. Emin misiniz?','Your account and usage records will be permanently deleted. Are you sure?')))return;const r=await submit(ev.target,d=>FocusAPI.post('delete_account',{password:d.password}));if(r)location.assign('index.html')});
   $('#logout').addEventListener('click',async()=>{try{await FocusAPI.post('logout')}finally{location.assign('index.html')}});
  },
  async admin(){
   const state=$('#adminState');let s;
   try{s=await FocusAPI.session(true)}catch(e){state.className='alert bad';state.textContent=message(e);return}
   if(!s.user){location.replace('giris.html?next=yonetim.html');return}
   if(!s.user.admin){state.className='alert bad';state.textContent=t('Bu sayfa yalnızca yöneticiler içindir.','Admins only.');return}
   state.textContent='';
   let filter='pending';
   const body=$('#adminRows');
   const draw=items=>{
    body.replaceChildren();
    $('#adminEmpty').hidden=items.length>0;
    for(const i of items){
     const tr=document.createElement('tr');
     const cells=[i.reference,`${i.name}\n${i.email}${i.organization?'\n'+i.organization:''}`,planName(i.plan_id,s.plans)+' / '+(i.billing==='year'?t('yıllık','yearly'):t('aylık','monthly')),money(+i.amount_cents),date(i.created_at),{pending:t('Bekliyor','Pending'),active:t('Etkin','Active'),rejected:t('Reddedildi','Rejected'),cancelled:t('İptal','Cancelled'),expired:t('Süresi doldu','Expired')}[i.status]+(i.period_end&&i.status==='active'?' → '+date(i.period_end):'')];
     for(const c of cells){const td=document.createElement('td');td.style.whiteSpace='pre-line';td.textContent=c;tr.append(td)}
     const td=document.createElement('td');
     if(i.status==='pending')for(const [d,label,cls] of [['approve',t('Ödeme alındı, onayla','Payment received, approve'),'btn small'],['reject',t('Reddet','Reject'),'btn small danger']]){
      const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.style.margin='2px';
      b.addEventListener('click',async()=>{if(!confirm(d==='approve'?t(`${i.reference} onaylansın mı? Paket hemen etkinleşir.`,`Approve ${i.reference}? The plan activates immediately.`):t(`${i.reference} reddedilsin mi?`,`Reject ${i.reference}?`)))return;try{await FocusAPI.post('admin_decide',{id:+i.id,decision:d});load()}catch(e){state.className='alert bad';state.textContent=message(e)}});
      td.append(b);
     }
     tr.append(td);body.append(tr);
    }
   };
   const load=async()=>{try{const r=await FocusAPI.get('admin_list','&status='+filter);draw(r.items)}catch(e){state.className='alert bad';state.textContent=message(e)}};
   document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));load()}));
   $('#adminBody').hidden=false;load();
  }
 };
 document.addEventListener('DOMContentLoaded',()=>{const p=document.body.dataset.page;if(pages[p])pages[p]()});
})();
