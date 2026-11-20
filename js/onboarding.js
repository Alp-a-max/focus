/* Opening splash + first-visit "Getting started" tour. Automated browsers skip both unless ?intro=1. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),tr=(a,b)=>window.OdakI18n?.language==='en'?b:a;
 const params=new URLSearchParams(location.search),forced=params.get('intro')==='1',automated=navigator.webdriver&&!forced;
 const store={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
 const TOUR_KEY='focus-tour-v1';

 // ---- Splash ----
 const splash=$('focusSplash');
 const splashDone=new Promise(resolve=>{
  if(!splash||automated){splash?.remove();resolve();return;}
  const started=performance.now(),MIN=1500,MAX=6000;let finished=false;
  const finish=()=>{if(finished)return;finished=true;splash.classList.add('is-leaving');setTimeout(()=>{splash.remove();resolve();},600);};
  const ready=()=>setTimeout(finish,Math.max(0,MIN-(performance.now()-started)));
  if(document.readyState==='complete')ready();else window.addEventListener('load',ready,{once:true});
  setTimeout(finish,MAX);
  splash.addEventListener('click',finish);
 });
 const status=splash?.querySelector('.focus-splash-status');
 if(status&&!automated){const lines=[tr('Uydu katmanları hazırlanıyor…','Preparing satellite layers…'),tr('Akıntı ve rüzgâr modelleri bağlanıyor…','Connecting current and wind models…'),tr('Harita açılıyor…','Opening the map…')];let i=0;status.textContent=lines[0];const t=setInterval(()=>{if(!status.isConnected)return clearInterval(t);i=Math.min(i+1,lines.length-1);status.textContent=lines[i];},700);}

 // ---- Tour ----
 const steps=[
  {title:['FOCUS\'a hoş geldin','Welcome to FOCUS'],text:['Denizde bir noktadan bırakılan nesnenin akıntı ve rüzgârla 6, 12 ve 24 saat içinde nereye sürükleneceğini tahmin eder. 30 saniyelik turla nasıl kullanılacağını göstereyim.','It forecasts where an object released at sea drifts with currents and wind over 6, 12 and 24 hours. Let me show you how it works in 30 seconds.']},
  {target:()=>document.querySelector('.map-search'),title:['1 · Yeri bul','1 · Find a place'],text:['Bir bölge adı (ör. Antalya) ya da koordinat yaz ve Bul\'a bas.','Type an area name (e.g. Antalya) or coordinates and press Find.']},
  {target:()=>$('map'),title:['…ya da haritaya dokun','…or tap the map'],text:['Denizde bir noktaya dokun. Seçtiğin nokta yanıp sönen turuncu işaretle haritada kalır, kaybolmaz.','Tap a point at sea. Your point stays on the map with a pulsing orange marker.']},
  {target:()=>$('releaseRun'),title:['2 · Tahmini başlat','2 · Start the forecast'],text:['Bunun bir model senaryosu olduğunu onayla ve Tahmini başlat\'a bas. Harita seçtiğin bölgeye yumuşakça yakınlaşır.','Confirm it is a model scenario and press Start forecast. The map glides smoothly to your area.']},
  {target:()=>$('releaseExample'),title:['Denemek mi istiyorsun?','Just want to try it?'],text:['Örnek tahmini göster, Antalya açıklarında hazır bir tahmini tek tıkla çalıştırır.','Show an example forecast runs a ready-made forecast off Antalya in one click.']},
  {target:()=>$('simpleAiScan'),title:['Uydudan atık ara','Scan satellites for debris'],text:['Yapay zekâ, Sentinel-2 uydu görüntüsünde olası atık adaylarını işaretler. Adaylar doğrulanmamıştır.','AI marks possible debris candidates in Sentinel-2 imagery. Candidates are not verified.']},
  {target:()=>$('simpleToolsOpen'),title:['Tüm araçlar','All tools'],text:['Harita katmanları, deniz koşulları, raporlar ve kayıtlar burada.','Map layers, sea conditions, reports and records live here.']},
  {target:()=>$('focusTourOpen'),title:['Hazırsın!','You are ready!'],text:['Haritada noktanı kaybedersen sol alttaki "Noktama dön" butonu seni geri götürür. Bu turu istediğin zaman buradan tekrar açabilirsin.','If you lose your point, the "Back to my point" button at the bottom left brings you back. You can replay this tour here anytime.']}
 ];
 let layer,spot,card,index=0,opener=null;
 const visible=el=>el&&el.isConnected&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
 function build(){
  layer=document.createElement('div');layer.className='focus-tour';layer.setAttribute('translate','no');
  spot=document.createElement('div');spot.className='focus-tour-spot';
  card=document.createElement('div');card.className='focus-tour-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','focusTourTitle');
  card.innerHTML='<p class="focus-tour-count"></p><h2 id="focusTourTitle"></h2><p class="focus-tour-text"></p><div class="focus-tour-dots" aria-hidden="true"></div><div class="focus-tour-actions"><button type="button" data-tour="skip"></button><span></span><button type="button" data-tour="back"></button><button type="button" data-tour="next" class="primary"></button></div>';
  layer.append(spot,card);document.body.append(layer);
  card.addEventListener('click',e=>{const b=e.target.closest('[data-tour]');if(!b)return;const a=b.dataset.tour;if(a==='skip')end();else if(a==='back')go(index-1,-1);else go(index+1,1);});
  layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();end();}else if(e.key==='ArrowRight')go(index+1,1);else if(e.key==='ArrowLeft')go(index-1,-1);else if(e.key==='Tab'){const f=[...card.querySelectorAll('button')];const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus();}}});
  window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
 }
 function place(){
  if(!layer)return;const step=steps[index],el=step.target?.();
  if(!visible(el)){layer.classList.add('is-center');spot.style.cssText='';return;}
  layer.classList.remove('is-center');const r=el.getBoundingClientRect(),pad=8;
  const big=r.height>innerHeight*.5;
  spot.style.cssText=`left:${r.left-pad}px;top:${big?r.top+12:r.top-pad}px;width:${r.width+pad*2}px;height:${big?Math.min(r.height,innerHeight-r.top)-24:r.height+pad*2}px`;
  if(innerWidth<=640){card.style.cssText='';return;}
  const cw=Math.min(360,innerWidth-32),ch=card.offsetHeight||220;let left=r.right+20,top=r.top;
  if(big||left+cw>innerWidth-16){left=Math.min(Math.max(16,r.left+r.width/2-cw/2),innerWidth-cw-16);top=big?r.top+40:r.bottom+16;if(top+ch>innerHeight-16)top=Math.max(16,r.top-ch-16);}
  top=Math.min(Math.max(16,top),innerHeight-ch-16);card.style.cssText=`left:${left}px;top:${top}px;width:${cw}px`;
 }
 function go(i,dir=1){
  if(i<0)return;if(i>=steps.length)return end();
  while(i>0&&i<steps.length&&steps[i].target&&!visible(steps[i].target()))i+=dir;
  if(i>=steps.length)return end();if(i<0)i=0;index=i;const step=steps[i],el=step.target?.();
  if(visible(el)&&el.id!=='map')el.scrollIntoView({block:'nearest',behavior:'smooth'});
  card.querySelector('.focus-tour-count').textContent=tr('Başlarken','Getting started')+' · '+(i+1)+'/'+steps.length;
  card.querySelector('h2').textContent=tr(...step.title);card.querySelector('.focus-tour-text').textContent=tr(...step.text);
  const dots=card.querySelector('.focus-tour-dots');dots.replaceChildren(...steps.map((_,k)=>{const d=document.createElement('i');if(k===i)d.className='on';return d;}));
  const [skip,,back,next]=card.querySelector('.focus-tour-actions').children;
  skip.textContent=tr('Turu atla','Skip tour');skip.hidden=i===steps.length-1;back.textContent=tr('Geri','Back');back.hidden=i===0;
  next.textContent=i===0?tr('Turu başlat','Start tour'):i===steps.length-1?tr('Başla','Let\'s go'):tr('İleri','Next');
  place();setTimeout(place,350);next.focus({preventScroll:true});
 }
 function start(){if(layer)return;opener=document.activeElement;document.querySelector('#simpleTools[open]')?.close();build();document.body.classList.add('focus-touring');go(0);}
 function end(){store.set(TOUR_KEY,'done');if(!layer)return;layer.classList.add('is-leaving');const old=layer;layer=null;document.body.classList.remove('focus-touring');window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);setTimeout(()=>old.remove(),250);(opener&&opener.isConnected&&opener!==document.body?opener:$('focusTourOpen'))?.focus?.({preventScroll:true});}

 // Replay button in the header.
 function mountButton(){
  const actions=document.querySelector('.simple-header-actions');if(!actions||$('focusTourOpen'))return;
  const b=document.createElement('button');b.type='button';b.id='focusTourOpen';b.className='focus-tour-open';b.setAttribute('translate','no');
  const label=()=>{b.innerHTML='<span aria-hidden="true">?</span><em></em>';b.querySelector('em').textContent=tr('Başlarken','Getting started');b.setAttribute('aria-label',tr('Başlarken turunu aç','Open the getting started tour'));};
  label();window.addEventListener('odak:language',()=>{label();if(layer)go(index);});b.onclick=start;actions.prepend(b);
 }
 mountButton();
 window.FocusTour={start,end};
 splashDone.then(()=>{if(forced||(!automated&&!store.get(TOUR_KEY)))setTimeout(start,250);});
})();
