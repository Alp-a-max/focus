(()=>{
  'use strict';
  let language='tr';try{language=localStorage.getItem('focus-public-language')==='en'?'en':'tr';}catch{}
  const text=(tr,en)=>language==='en'?en:tr;
  const money=cents=>'$'+(cents/100).toLocaleString(language==='en'?'en-US':'tr-TR',{minimumFractionDigits:cents%100?2:0,maximumFractionDigits:2});
  const dialog=document.getElementById('planDialog');let chosen;
  function renderPlans(){
    document.getElementById('pricingRate').textContent=text('Temel birim: tahmin edilen 1 saat = ','Base unit: 1 forecast hour = ')+money(FocusPlans.centsPerForecastHour)+text(' USD. Platformda geçirilen saat değildir.',' USD. This is not time spent on the platform.');
    const grid=document.getElementById('planGrid');grid.replaceChildren();
    for(const plan of FocusPlans.plans){
      const card=document.createElement('article');card.dataset.plan=plan.id;card.className='plan-card'+(plan.id==='starter'?' highlight':'');
      const title=document.createElement('h3');title.className='plan-name';title.textContent=plan.name[language];
      const tag=document.createElement('p');tag.className='plan-tag';tag.textContent=text('Planlanan kapsam','Planned scope');
      const price=document.createElement('p');price.className='plan-price';price.textContent=money(plan.id==='payg'?FocusPlans.centsPerForecastHour:plan.monthlyCents);
      const unit=document.createElement('span');unit.textContent=plan.id==='payg'?text('USD / tahmin edilen saat','USD / forecast hour'):plan.id==='free'?text('Ücretsiz','Free'):text('USD / ay','USD / month');price.append(unit);
      const billing=document.createElement('p');billing.className='plan-billing';billing.textContent=plan.annualCents?text('Yıllık toplam: ','Annual total: ')+money(plan.annualCents)+' USD · '+FocusPlans.annualFreeMonths+text(' ay ücretsiz. Aylık hak sayısı korunur.',' months free. Monthly allowance unchanged.'):plan.id==='payg'?text('Tahmin ufku × saatlik fiyat. Platformda geçirilen süre ücretlenmez.','Forecast horizon × hourly price. Time spent on the platform is not billed.'):text('Günlük ücretsiz hak; ticari hesap altyapısı henüz açık değil.','Daily free allowance; commercial accounts are not open yet.');
      const features=[plan.maxHours+text(' saate kadar tahmin','-hour forecast limit'),plan.id==='free'?text('Günde ','Per day: ')+plan.dailyForecasts+text(' tahmin',' forecasts'):plan.id==='payg'?text('1–72 tahmin saati','1–72 forecast hours'):text('Ayda ','Per month: ')+plan.monthlyForecasts+text(' tahmin hakkı',' forecast credits'),text('Tek kaynak kesimi + üç rüzgâr senaryosu = bir tahmin','One source section + three wind scenarios = one forecast')];
      if(plan.maxHours>24)features.push(text('48/72 saatlik motor planlanıyor; henüz çalışmıyor.','48/72-hour engine planned; not available yet.'));
      const list=document.createElement('ul');for(const feature of features){const item=document.createElement('li');item.textContent=feature;list.append(item);}
      const button=document.createElement(plan.id==='free'?'a':'button');button.className='button'+(plan.id==='starter'?'':' secondary');
      if(plan.id==='free'){button.href='platform.html';button.dataset.platformLink='';button.textContent=text('Ücretsiz demoyu aç ↗','Open the free demo ↗');}
      else{button.type='button';button.textContent=text('Planı incele →','Explore plan →');button.addEventListener('click',()=>showPlan(plan));}
      card.append(title,tag,price,billing,list,button);grid.append(card);
    }
    const examples=document.getElementById('pricingExamples');examples.replaceChildren();
    for(const h of [12,24,48,72]){const item=document.createElement('span');item.textContent=h+text(' saat = ','h = ')+money(FocusPlans.paygCents(h))+' USD';examples.append(item);}
    document.getElementById('pricingScope').textContent=text('Bir tahmin, tek kaynak kesiminden üç rüzgâr senaryosunu birlikte kapsar; üç ayrı hak düşmez. Paket ufkunu aşmayan 12 saat de 24 saat de bir haktır. Hak biterse veya ufuk paket sınırını aşarsa ek tahmin kullandıkça öde tarifesinden hesaplanır; bu sayfa tahsilat yapmaz. Hatalı/başarısız tahmin ve aynı sonucu yeniden açmak ücret veya hak tüketmez.','One forecast includes one source section and all three wind scenarios; it does not consume three credits. Both 12h and 24h use one credit when within the plan horizon. If credits run out or the horizon exceeds the plan limit, an additional forecast is priced at the pay-as-you-go rate; this page collects no payments. Invalid/failed forecasts and reopening the same result use no fee or credit.');
    document.getElementById('pricingLimits').textContent=text('Fiyat ve hak hesaplama önizlemesi. Çalışan demo ufukları: ','Pricing and credit preview. Working demo horizons: ')+FocusPlans.engineHorizons.join(' / ')+text(' saat. 48/72 saat, üyelik hakları, ödeme ve paket geçişleri planlanıyor; aktif değiller. Abonelik her kullanımda daha ucuz değildir: 100 × 12 saat kullandıkça öde ','h. 48/72h, membership entitlements, payments and plan changes are planned, not active. Subscriptions are not always cheaper: 100 × 12h pay-as-you-go costs ')+money(FocusPlans.paygCents(12)*100)+text(' USD, Başlangıç ise ',' USD, versus ')+money(FocusPlans.plans.find(p=>p.id==='starter').monthlyCents)+text(' USD/aydır.',' USD/month for Starter.');
    document.getElementById('pricingFAQ').textContent=text('Abonelikte aylık ücret veya yıllık toplam seçenekleri planlanır; yıllık toplamlar paket kartlarında gösterilir. Tahmin ufku paket sınırı içindeyse tek hak kullanılır. Bu demo sunucuda abonelik hakkı veya ödeme oluşturmaz.','Subscriptions are planned with monthly or annual-total options; annual totals are shown on the plan cards. One credit is used when the forecast stays within the plan horizon. This demo creates no server-side subscription entitlement or payment.');
    updateEstimate();
  }
  function updateEstimate(){const value=Number(document.getElementById('pricingHours').value);try{const cents=FocusPlans.paygCents(value);document.getElementById('pricingEstimate').textContent=money(cents)+' USD'+text(' · Yalnız fiyat örneği; tahsilat yapılmaz.',' · Price example only; no payment collected.')+(FocusPlans.engineHorizons.includes(value)?'':text(' Bu ufuk çalışan demoda sunulmuyor.',' This horizon is not available in the working demo.'));}catch{document.getElementById('pricingEstimate').textContent=text('1–72 arasında tam saat girin.','Enter a whole number of hours from 1 to 72.');}}
  document.getElementById('pricingHours').addEventListener('input',updateEstimate);
  function showPlan(plan){chosen=plan;document.getElementById('planDialogTitle').textContent=plan.name[language]+' · '+money(plan.id==='payg'?FocusPlans.centsPerForecastHour:plan.monthlyCents)+text(plan.id==='payg'?' USD / tahmin saati':' USD / ay',plan.id==='payg'?' USD / forecast hour':' USD / month');
    document.getElementById('planDialogCopy').textContent=text('Bu, planlanan fiyatlandırma kapsamıdır. Ödeme, hesap etkinleştirme ve paket geçişi henüz açılmadı. 48/72 saatlik motor planlanıyor. Bu seçim üyelik başlatmaz ve ücret almaz.','This is planned pricing. Payments, account activation and plan changes are not open yet. The 48/72-hour engine is planned. This selection starts no membership and collects no payment.');if(!dialog.open)dialog.showModal();}
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
