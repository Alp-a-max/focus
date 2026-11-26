/* Yönetim paneli: ilk yönetici kurulumu, kullanıcılar ve kullanım, ayarlar, abonelik talepleri.
   Yetki her istekte sunucuda kontrol edilir; bu dosya yalnızca arayüzdür. Kullanıcı verisi her zaman textContent ile yazılır. */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s);
 const t=(tr,en)=>window.FocusSite?.t(tr,en)??tr;
 const loc=()=>window.FocusSite?.lang==='en'?'en-GB':'tr-TR';
 const when=v=>v?new Date(String(v).includes('T')?v:String(v).replace(' ','T')+'Z').toLocaleString(loc(),{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
 const money=c=>(c/100).toLocaleString('tr-TR',{maximumFractionDigits:2})+' TL';
 const PLAN={trial:['Deneme','Trial'],payg:['Kullandıkça öde','Pay as you go'],team:['Ekip','Team'],institution:['Kurum','Institution'],admin:['Yönetici','Admin'],none:['Süresi doldu','Expired']};
 const planLabel=id=>t(...(PLAN[id]||[id,id]));
 const state=$('#adminState');
 const say=(msg,kind='bad')=>{state.className='alert '+kind;state.textContent=msg;};
 const el=(tag,props={},...kids)=>{const n=Object.assign(document.createElement(tag),props);n.append(...kids.filter(k=>k!=null));return n;};
 let users=[];

 // ---- Kullanıcılar ----
 function stats(){
  const box=$('#userStats');box.replaceChildren();
  const now=Date.now(),day=86400000;
  const items=[
   [users.length,t('kayıtlı kullanıcı','registered users')],
   [users.filter(u=>u.last_login_at&&now-new Date(u.last_login_at.replace(' ','T')+'Z')<7*day).length,t('son 7 günde giriş','signed in last 7 days')],
   [users.reduce((a,u)=>a+u.uses_30d,0),t('son 30 günde tahmin','forecasts in last 30 days')]
  ];
  for(const [n,l] of items)box.append(el('li',{},el('b',{textContent:String(n)}),el('span',{textContent:l})));
 }
 function drawUsers(){
  const q=($('#userFilter').value||'').toLocaleLowerCase('tr');
  const body=$('#userRows');body.replaceChildren();
  for(const u of users.filter(u=>!q||[u.name,u.email,u.organization].join(' ').toLocaleLowerCase('tr').includes(q))){
   const who=el('td',{},el('b',{textContent:u.name}),el('br'),document.createTextNode(u.email),u.organization?el('br'):null,u.organization?el('span',{className:'muted',textContent:u.organization}):null);
   const method=el('td',{textContent:(u.google?'Google':t('Şifre','Password'))+(u.email_verified_at?' ✓':' · '+t('doğrulanmadı','unverified'))});
   const plan=el('td',{},el('b',{textContent:planLabel(u.plan)}),u.plan_end?el('br'):null,u.plan_end?el('span',{className:'muted',textContent:t('bitiş ','ends ')+when(u.plan_end)}):null);
   const actions=el('td');
   if(u.role!=='admin'){
    const btn=(label,fn,cls='btn ghost small')=>{const b=el('button',{type:'button',className:cls,textContent:label});b.style.margin='2px';b.addEventListener('click',fn);return b;};
    actions.append(btn(t('+24 sa deneme','+24 h trial'),()=>update(u,'trial',24)));
    const sel=el('select',{ariaLabel:t('Paket','Plan')});for(const id of ['team','institution'])sel.append(el('option',{value:id,textContent:planLabel(id)}));sel.style.cssText='min-height:34px;margin:2px;border-radius:6px';
    actions.append(sel,btn(t('1 ay ver','Grant 1 month'),()=>update(u,'grant',{plan:sel.value,months:1})));
    if(['team','institution'].includes(u.plan))actions.append(btn(t('Paketi geri al','Revoke'),()=>confirm(t('Paket geri alınsın mı?','Revoke this plan?'))&&update(u,'revoke',null),'btn danger small'));
    if(!u.email_verified_at)actions.append(btn(t('Doğrulanmış say','Mark verified'),()=>update(u,'verify',null)));
   }
   body.append(el('tr',{},who,method,el('td',{textContent:when(u.created_at)}),el('td',{textContent:when(u.last_login_at)}),el('td',{textContent:when(u.last_use_at)}),el('td',{textContent:u.uses_30d+' / '+u.uses_total}),plan,actions));
  }
 }
 async function update(u,action,value){
  try{const r=await FocusAPI.post('admin_user_update',{id:u.id,action,value});users=r.items;stats();drawUsers();say(t('Güncellendi: ','Updated: ')+u.email,'ok');}
  catch(e){say(e.message);}
 }
 async function loadUsers(){try{users=(await FocusAPI.get('admin_users')).items;stats();drawUsers();}catch(e){say(e.message);}}

 // ---- Ayarlar ----
 const form=$('#settingsForm');
 async function loadSettings(){
  try{
   const s=(await FocusAPI.get('admin_settings')).settings;
   form.trial_hours.value=s.trial_hours;form.subscriptions_enabled.checked=s.subscriptions_enabled==='1';form.verification_required.checked=s.verification_required==='1';
   for(const k of ['google_client_id','smtp_user','mail_from_name','mail_from','mail_subject','mail_body','smtp_host'])form[k].value=s[k]||'';
   form.smtp_port.value=s.smtp_port||'465';form.smtp_pass.value='';
   $('#sPassHint').textContent=s.smtp_pass_set?t('Kayıtlı. Değiştirmek için yenisini yazın; boş bırakırsanız korunur.','Saved. Type a new one to replace it; leave empty to keep it.'):t('Google hesabı > Güvenlik > 2 adımlı doğrulama > Uygulama şifreleri bölümünden 16 haneli şifre oluşturun.','Create a 16-character app password in Google Account > Security > 2-Step Verification > App passwords.');
  }catch(e){say(e.message);}
 }
 form.addEventListener('submit',async ev=>{
  ev.preventDefault();const box=form.querySelector('.alert');box.className='alert';box.textContent='';
  const settings={trial_hours:Number(form.trial_hours.value),subscriptions_enabled:form.subscriptions_enabled.checked,verification_required:form.verification_required.checked,smtp_port:Number(form.smtp_port.value)};
  for(const k of ['google_client_id','smtp_user','mail_from_name','mail_from','mail_subject','mail_body','smtp_host'])settings[k]=form[k].value;
  if(form.smtp_pass.value)settings.smtp_pass=form.smtp_pass.value;
  try{await FocusAPI.post('admin_settings_save',{settings});box.className='alert ok';box.textContent=t('Ayarlar kaydedildi.','Settings saved.');loadSettings();}
  catch(e){box.className='alert bad';box.textContent=e.message;box.focus();}
 });
 $('#testMail').addEventListener('click',async()=>{
  const box=form.querySelector('.alert');
  try{const r=await FocusAPI.post('admin_test_mail',{});box.className='alert ok';box.textContent=t('Deneme e-postası gönderildi: ','Test email sent to: ')+r.sent_to;}
  catch(e){box.className='alert bad';box.textContent=e.message;}
 });

 // ---- Abonelik talepleri ----
 async function loadSubs(){
  try{
   const items=(await FocusAPI.get('admin_list','&status=pending')).items,body=$('#subRows');body.replaceChildren();$('#subEmpty').hidden=items.length>0;
   for(const i of items){
    const td=el('td');
    for(const [d,label,cls] of [['approve',t('Ödeme alındı, onayla','Payment received, approve'),'btn small'],['reject',t('Reddet','Reject'),'btn danger small']]){
     const b=el('button',{type:'button',className:cls,textContent:label});b.style.margin='2px';
     b.addEventListener('click',async()=>{if(!confirm(i.reference+(d==='approve'?t(' onaylansın mı?',' approve?'):t(' reddedilsin mi?',' reject?'))))return;try{await FocusAPI.post('admin_decide',{id:+i.id,decision:d});loadSubs();loadUsers();}catch(e){say(e.message);}});
     td.append(b);
    }
    body.append(el('tr',{},el('td',{textContent:i.reference}),el('td',{textContent:i.name+' · '+i.email}),el('td',{textContent:planLabel(i.plan_id)+' / '+(i.billing==='year'?t('yıllık','yearly'):t('aylık','monthly'))}),el('td',{textContent:money(+i.amount_cents)}),el('td',{textContent:when(i.created_at)}),td));
   }
  }catch(e){say(e.message);}
 }

 // ---- Sekmeler ve kurulum ----
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));
  document.querySelectorAll('.admin-tab').forEach(s=>s.hidden=s.id!=='tab-'+b.dataset.tab);
 }));
 $('#userFilter').addEventListener('input',drawUsers);
 document.addEventListener('focus:language',()=>{if(users.length){stats();drawUsers();}});

 $('#setupForm').addEventListener('submit',async ev=>{
  ev.preventDefault();const f=ev.target,box=f.querySelector('.alert');
  const d=Object.fromEntries(new FormData(f));
  try{await FocusAPI.post('setup_admin',{token:d.token,name:d.name,email:d.email,password:d.password});location.reload();}
  catch(e){box.className='alert bad';box.textContent=e.message;box.focus();}
 });

 document.addEventListener('DOMContentLoaded',async()=>{
  let s;
  try{s=await FocusAPI.session(true);}catch(e){say(e.message);return;}
  if(s.needs_setup){state.hidden=true;$('#setupForm').hidden=false;return;}
  if(!s.user){location.replace('giris.html?next=yonetim.html');return;}
  if(!s.user.admin){say(t('Bu sayfa yalnızca yöneticiler içindir.','Admins only.'));return;}
  state.className='alert';state.textContent='';$('#adminBody').hidden=false;
  loadUsers();loadSettings();loadSubs();
 });
})();
