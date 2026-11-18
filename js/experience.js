/* Standart / Pro / Max are reversible layout presets. All tools remain available. */
(()=>{
  'use strict';
  const key='odak-experience-v1', modes=['standard','pro','max'];
  const names={standard:'Standart',pro:'Pro',max:'Max'};
  let saved;
  try { const value=JSON.parse(localStorage.getItem(key)); if(value&&modes.includes(value.mode)&&['tr','en'].includes(value.language)&&value.completed===true)saved=value; } catch {}
  let selection={mode:saved?.mode||'standard',language:saved?.language||'tr'};
  const dialog=document.createElement('dialog');
  dialog.id='experienceDialog';dialog.className='experience-dialog';dialog.setAttribute('aria-labelledby','experienceTitle');
  dialog.innerHTML=`<form method="dialog" class="experience-shell">
    <div class="experience-top"><div class="experience-wordmark">ODAK <small>OCEAN RESEARCH</small></div>
    <div class="language-picker" role="group" aria-label="Dil / Language"><button type="button" data-language="tr" lang="tr">Türkçe</button><button type="button" data-language="en" lang="en">English</button></div></div>
    <div class="experience-intro"><div><span class="experience-kicker">BAKIŞ AÇINI SEÇ</span><h2 id="experienceTitle">Okyanus büyük.<br><em>Odağın sana özel.</em></h2><p>Aynı veriler, sana uygun bir çalışma alanı. Dilini ve başlangıç düzenini seç; dilediğinde değiştir.</p></div><div class="experience-orbit" aria-hidden="true"><i></i><i></i><i></i><b></b></div></div>
    <fieldset class="experience-modes"><legend>Nasıl çalışmak istersin?</legend><div class="experience-cards">
    <label class="experience-card"><input type="radio" name="experience" value="standard"><strong data-mode-name="standard">Standart</strong><span class="mode-purpose">Keşfetmeye başla.</span><span class="mode-description">Harita ön planda. Deniz koşulları açık, diğer araçlar ihtiyacın olduğunda elinin altında.</span><span class="mode-detail">SADE BAŞLANGIÇ</span></label>
    <label class="experience-card"><input type="radio" name="experience" value="pro"><strong>Pro</strong><span class="mode-purpose">Veriye yakından bak.</span><span class="mode-description">Araştırma katmanları ve uydu analizi açık. Karşılaştırma ve model araçlarına hızlı geçiş.</span><span class="mode-detail">ANALİZ ODAKLI</span></label>
    <label class="experience-card"><input type="radio" name="experience" value="max"><strong>Max</strong><span class="mode-purpose">Kontrolü genişlet.</span><span class="mode-description">Vektörler, karşılaştırma ve kayıt panelleri de açık. Daha fazla ayrıntı, tek çalışma alanı.</span><span class="mode-detail">GENİŞ ÇALIŞMA ALANI</span></label>
    </div></fieldset><div class="experience-bottom"><p>Üç düzen de tüm araçlara erişir. Seçimin yalnızca başlangıçta açık olan panelleri değiştirir ve bu tarayıcıda hatırlanır.</p><button type="submit" id="experienceStart" class="primary">Çalışma alanını aç</button></div><p class="experience-footnote">Araştırma verileri ve varsayımsal modeller. Anlık çöp konumu veya doğrulanmış atık tespiti değildir.</p>
    </form>`;
  const commit=dialog.querySelector('#experienceStart'), commitGroup=document.createElement('div');commitGroup.className='experience-commit';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='experience-cancel';cancel.id='experienceCancel';cancel.textContent='Geri dön';
  commit.before(commitGroup);commitGroup.append(cancel,commit);
  document.body.append(dialog);
  const toolbar=document.createElement('div');toolbar.className='experience-toolbar';
  toolbar.innerHTML='<p><strong id="experienceMode"></strong> <span id="experienceHint"></span></p><button type="button" id="experienceChange">Düzeni ve dili değiştir</button>';
  document.querySelector('#intelligence .dash-grid').before(toolbar);
  const hints={standard:'Sade başlangıç · Tüm araçlar açılır panellerde.',pro:'Analiz odaklı · Katmanlar ve uydu analizi açık.',max:'Geniş çalışma alanı · İleri kontroller açık.'};
  let opener;
  function refreshChoice(){
    dialog.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===selection.language)));
    dialog.querySelectorAll('[name=experience]').forEach(r=>r.checked=r.value===selection.mode);
    window.OdakI18n.setLanguage(selection.language);
  }
  function applyPreset(){
    document.documentElement.dataset.experience=selection.mode;
    for(const [id,open] of Object.entries({conditionsPanel:true,layerDrawer:selection.mode!=='standard',analysisPanel:selection.mode!=='standard',vectorPanel:selection.mode==='max',recordsPanel:selection.mode==='max',comparisonPanel:selection.mode==='max'})){
      const panel=document.getElementById(id);if(panel)panel.open=open;
    }
    document.getElementById('experienceMode').textContent=selection.language==='en'&&selection.mode==='standard'?'Standard':names[selection.mode];
    document.getElementById('experienceHint').textContent=hints[selection.mode];
    document.getElementById('experienceBadge').textContent=(selection.language==='en'&&selection.mode==='standard'?'Standard':names[selection.mode])+' · '+selection.language.toUpperCase();
    window.OdakI18n.translate(document.body);
    window.dispatchEvent(new Event('resize'));
  }
  function show(event){opener=event?.currentTarget;selection=saved?{...saved}:{mode:'standard',language:'tr'};cancel.hidden=!saved;refreshChoice();dialog.showModal();dialog.scrollTop=0;document.body.classList.add('experience-selecting');}
  cancel.addEventListener('click',()=>{selection={...saved};refreshChoice();dialog.close()});
  dialog.querySelectorAll('[data-language]').forEach(b=>b.addEventListener('click',()=>{selection.language=b.dataset.language;refreshChoice()}));
  dialog.querySelectorAll('[name=experience]').forEach(r=>r.addEventListener('change',()=>{selection.mode=r.value}));
  dialog.querySelector('form').addEventListener('submit',()=>{
    saved={...selection,completed:true};try{localStorage.setItem(key,JSON.stringify(saved))}catch{}
    applyPreset();
  });
  dialog.addEventListener('cancel',event=>{
    if(!saved){event.preventDefault();return;}
    selection={...saved};refreshChoice();
  });
  dialog.addEventListener('close',()=>{document.body.classList.remove('experience-selecting');opener?.focus();});
  document.getElementById('experienceOpen').addEventListener('click',show);
  document.getElementById('experienceChange').addEventListener('click',show);
  refreshChoice();
  if(saved)applyPreset();else show();
})();
