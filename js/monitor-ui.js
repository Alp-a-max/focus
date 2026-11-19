/* Public results work on GitHub Pages without exposing the local inference/record server. */
window.FocusMonitorUI={mount(map,{open}){
 const tr=(a,b)=>window.OdakI18n?.language==='en'?b:a;
 const date=v=>v?new Date(v).toLocaleString(window.OdakI18n?.locale||'tr-TR',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'})+' UTC':tr('Henüz yok','Not yet');
 const root=document.createElement('section');root.className='monitor-panel';root.setAttribute('aria-labelledby','monitorHeading');
 root.innerHTML='<div class="monitor-head"><h2 id="monitorHeading"></h2><button id="monitorWorld" type="button"></button><button id="monitorReload" type="button"></button></div><p id="monitorScope"></p><p id="monitorStatus" role="status" aria-live="polite"></p><div id="monitorRegions" class="monitor-regions"></div>';
 document.querySelector('.map-wrap').before(root);
 const $=id=>root.querySelector('#'+id),layer=L.featureGroup().addTo(map);
 let feed,loading=false,failed=false;
 const labels=()=>({ready:tr('Sonuç hazır','Result available'),no_scene:tr('Uygun görüntü yok','No usable scene'),error:tr('Son kontrol başarısız','Last check failed'),not_scanned:tr('Henüz taranmadı','Not scanned yet'),reference_only:tr('Açık okyanus · görüntü kapsamı ayrı','Open ocean · separate image coverage')});
 function render(){
  $('monitorHeading').textContent=tr('Küresel izleme ağı','Global monitoring network');
  $('monitorWorld').textContent=tr('Dünya görünümü','World view');$('monitorReload').textContent=tr('Yayını yenile','Refresh published feed');$('monitorReload').disabled=loading;
  $('monitorScope').textContent=tr('Farklı kıtalarda seçilmiş izleme noktaları. Uydu tespiti her kıyı noktasında yaklaşık 1 km² inceler; tüm okyanuslar taranmış değildir. Açık okyanus merkezleri gezinme içindir, çöp tespiti değildir.','Selected watch points across continents. Satellite detection examines about 1 km² at each coastal point; the whole ocean has not been scanned. Open-ocean centres are navigation references, not debris detections.');
  $('monitorStatus').textContent=loading?tr('Yayımlanmış sonuçlar yükleniyor…','Loading published results…'):failed?tr('Yayın alınamadı. Varsa son yüklenen sonuçlar korunuyor.','Feed could not be loaded. Previously loaded results are retained.'):feed?tr('Yayın oluşturma: ','Feed generated: ')+date(feed.generated_at)+tr(' · Hedef kontrol aralığı 6 saat; yeni uydu görüntüsü gelmesi garanti değildir.',' · Target check interval: 6 hours; new satellite imagery is not guaranteed.'):'';
  $('monitorRegions').replaceChildren();layer.clearLayers();
  for(const r of feed?.regions||[]){
   const state=FocusMonitorCore.state(r),card=document.createElement('article');card.className='monitor-card';
   const name=document.createElement('h3');name.textContent=tr(r.name_tr,r.name_en);card.append(name);
   const status=document.createElement('p');status.textContent=labels()[r.status];card.append(status);
   if(state.hasResult){const info=document.createElement('p');info.textContent=tr('Gözlem: ','Observed: ')+date(r.result.metadata.observed_at)+' · '+state.candidateCount+tr(' aday',' candidates')+(state.stale?tr(' · eski işlem sonucu',' · older inference result'):'');card.append(info);}
   const checked=document.createElement('p');checked.textContent=tr('Katalog kontrolü: ','Catalogue checked: ')+date(r.checked_at);card.append(checked);
   if(state.hasResult&&state.failed){const warning=document.createElement('p');warning.textContent=tr('Son kontrol sonuçlanmadı; önceki tarihli sonuç gösteriliyor.','Latest check failed; showing the previous dated result.');card.append(warning);}
   const button=document.createElement('button');button.type='button';button.textContent=state.hasResult?tr('Sonucu haritada aç','Open result on map'):tr('Bölgeye git','Go to region');
   button.onclick=()=>{open(r,state.hasResult?r.result:null);map.setView([r.lat,r.lon],state.hasResult?11:4);document.querySelector('.map-wrap').scrollIntoView({behavior:'auto',block:'start'});map.getContainer().focus({preventScroll:true});};card.append(button);$('monitorRegions').append(card);
   const dot=L.circleMarker([r.lat,r.lon],{radius:6,color:state.hasResult?'#8dddc8':'#a4adbd',fillOpacity:.7,weight:2});
   const tip=document.createElement('span');tip.textContent=tr(r.name_tr,r.name_en)+' · '+labels()[r.status];dot.bindTooltip(tip);dot.on('click',()=>button.click());dot.addTo(layer);
  }
 }
 async function load(){if(loading)return;loading=true;render();
  try{const url=location.hostname.endsWith('.github.io')?`https://raw.githubusercontent.com/Alp-a-max/focus/main/assets/monitor-feed.json?v=${Date.now()}`:'assets/monitor-feed.json';
   const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('feed');const value=FocusMonitorCore.validate(await response.json());feed=value;failed=false;
  }catch{failed=true;}finally{loading=false;render();}}
 $('monitorReload').onclick=load;$('monitorWorld').onclick=()=>{map.setView([8,0],2);document.querySelector('.map-wrap').scrollIntoView({behavior:'auto',block:'start'});map.getContainer().focus({preventScroll:true});};
 window.addEventListener('odak:language',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
 const timer=setInterval(()=>{if(!document.hidden)load();},60000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});load();
}};
