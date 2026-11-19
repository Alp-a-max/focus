(()=>{
  'use strict';
  let language='tr';try{language=localStorage.getItem('focus-public-language')==='en'?'en':'tr';}catch{}
  const text=(tr,en)=>language==='en'?en:tr;
  const translatedFeatures={
    'Temel harita ve deniz koşulları':'Base map and sea conditions','6 saate kadar tek rota':'Single trajectory up to 6 hours','Kaynak ve tarih bilgileri':'Sources and dates',
    'Standart kapsamı':'Standard features','12 saate kadar yayılım senaryoları':'Spread scenarios up to 12 hours','CSV ve JSON dışa aktarma':'CSV and JSON export',
    'Pro kapsamı':'Pro features','24 saat ve 75 sanal parçacık':'24 hours and 75 virtual particles','Uydu tarihlerini karşılaştırma':'Compare satellite dates','Deneysel spektral inceleme':'Experimental spectral inspection'
  };
  const dialog=document.getElementById('planDialog');let chosen;
  function renderPlans(){
    const grid=document.getElementById('planGrid');grid.replaceChildren();
    for(const plan of FocusPlans.plans){
      const card=document.createElement('article');card.className='plan-card'+(plan.id==='pro'?' highlight':'');
      const title=document.createElement('h3');title.className='plan-name';title.textContent=plan.id==='standard'?text('Standart','Standard'):plan.name;
      const tag=document.createElement('p');tag.className='plan-tag';tag.textContent=plan.id==='standard'?text('Keşfetmek için','For exploration'):plan.id==='pro'?text('Daha derin inceleme','For deeper investigation'):text('Genişletilmiş çalışma','For expanded research');
      const price=document.createElement('p');price.className='plan-price';price.textContent='$'+plan.annualPrice;
      const unit=document.createElement('span');unit.textContent=plan.annualPrice?text('USD / yıl','USD / year'):text('Ücretsiz','Free');price.append(unit);
      const billing=document.createElement('p');billing.className='plan-billing';billing.textContent=plan.annualPrice?text('Yıllık toplam tutar. Aylık ücret değildir.','Annual total. Not a monthly fee.'):text('Kart bilgisi gerekmez.','No card required.');
      const list=document.createElement('ul');for(const feature of plan.features){const item=document.createElement('li');item.textContent=language==='en'?translatedFeatures[feature]:feature;list.append(item);}
      const button=document.createElement(plan.id==='standard'?'a':'button');button.className='button'+(plan.id==='pro'?'':' secondary');
      if(plan.id==='standard'){button.href='platform.html';button.dataset.platformLink='';button.textContent=text('Ücretsiz demoyu aç ↗','Open the free demo ↗');}
      else{button.type='button';button.textContent=text('Planı incele →','Explore plan →');button.addEventListener('click',()=>showPlan(plan));}
      card.append(title,tag,price,billing,list,button);grid.append(card);
    }
  }
  function showPlan(plan){chosen=plan;document.getElementById('planDialogTitle').textContent=plan.name+' · $'+plan.annualPrice+text(' USD / yıl',' USD / year');
    document.getElementById('planDialogCopy').textContent=text('Bu paket, planlanan yıllık üyelik kapsamını gösterir. Ödeme ve hesap etkinleştirme henüz açılmadı. Şu anda araştırma demosunda araçları inceleyebilirsiniz; bu seçim ücretli üyelik başlatmaz.','This package describes a planned annual membership. Payments and account activation are not open yet. You can explore the research demo now; this selection does not start a paid membership.');dialog.showModal();}
  function apply(){document.documentElement.lang=language;document.title=text('FOCUS — Deniz atığı araştırması ve rota senaryoları','FOCUS — Marine debris research and drift scenarios');
    document.querySelectorAll('[data-tr][data-en]').forEach(el=>el.textContent=el.dataset[language]);
    document.querySelectorAll('[data-public-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.publicLanguage===language)));
    renderPlans();if(dialog.open&&chosen)showPlan(chosen);
  }
  document.querySelectorAll('[data-public-language]').forEach(button=>button.addEventListener('click',()=>{language=button.dataset.publicLanguage;try{localStorage.setItem('focus-public-language',language);}catch{}apply();}));
  document.getElementById('planDialogClose').addEventListener('click',()=>dialog.close());
  let targetPromise;
  document.addEventListener('click',async event=>{
    const link=event.target.closest('a[data-platform-link]');if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();const original=link.textContent;link.setAttribute('aria-busy','true');
    targetPromise ||= FocusService.platformUrl();const url=await targetPromise;link.removeAttribute('aria-busy');link.textContent=original;location.href=url+(link.dataset.targetHash||'');
  });
  apply();
  if(['#intelligence','#laboratory','#method'].includes(location.hash))FocusService.platformUrl().then(url=>location.replace(url+location.hash));
})();
