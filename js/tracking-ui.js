window.FocusTrackingUI={mount(map,{coastReady}){
 const tr=(a,b)=>window.OdakI18n?.language==='en'?b:a,group=L.featureGroup().addTo(map),root=document.createElement('section');root.className='tracking-panel';
 root.innerHTML='<h3 id="trackingHeading"></h3><p id="trackingIntro"></p><label><input id="trackingConsent" type="checkbox"><span id="trackingConsentText"></span></label><div class="detection-actions"><button id="trackingRun" type="button" disabled></button><button id="trackingCancel" type="button" disabled></button><button id="trackingExport" type="button" disabled></button></div><p id="trackingStatus" role="status" aria-live="polite"></p><div id="trackingResults"></div>';
 document.getElementById('detectionControls').append(root);const $=id=>root.querySelector('#'+id);let source,controller,sequence=0,result,batches=0,error='';
 const date=v=>new Date(v).toLocaleString(window.OdakI18n?.locale||'tr-TR',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'})+' UTC';
 function render(){
  $('trackingHeading').textContent=tr('Gözlem tarihinden itibaren sürüklenme','Drift from the observation time');
  $('trackingIntro').textContent=tr('Seçili adayın gerçek görüntü zamanından bugüne geçmiş akıntı/rüzgâr modelini, ardından 24 saatlik tahmini kullanır. Bu hesap aynı atığın gözlemlenmiş takibi veya doğrulanmış bugünkü konumu değildir. En fazla 45 günlük gözlem ve sınırlı model alanı desteklenir.','Uses archived current/wind models from the selected candidate’s actual observation time to today, followed by a 24-hour forecast. This is not an observed track or a verified present-day waste position. Supports observations up to 45 days old and bounded model coverage.');
  $('trackingConsentText').textContent=tr('Doğrulanmamış adayı yüzen bir nesne varsayarak model hesabını başlat','Model the unverified candidate as a floating object');
  $('trackingRun').textContent=tr('Gözlemden bugüne ve +24 saate hesapla','Calculate from observation to today and +24h');$('trackingRun').disabled=!source||!$('trackingConsent').checked||!!controller;
  $('trackingCancel').textContent=tr('Hesabı iptal et','Cancel calculation');$('trackingCancel').disabled=!controller;
  $('trackingExport').textContent=tr('Tarihli rotaları indir','Download dated trajectories');$('trackingExport').disabled=!result;
  $('trackingStatus').textContent=controller?tr('Geçmiş ve gelecek model alanları işleniyor · ','Processing archived and forecast fields · ')+batches+tr(' alan sorgusu',' field batches'):error?tr('Hesap tamamlanamadı: ','Calculation could not finish: ')+error:result?tr('Kesikli çizgi geçmiş model hesabı; düz çizgi gelecek tahmini. Konumlar saha doğrulaması değildir.','Dashed line: past model advection; solid line: forecast. Positions are not field-verified.'):source?tr('Başlangıç gözlemi: ','Starting observation: ')+date(source.observation.observed_at):tr('Önce bir uydu adayı seçin.','Select a satellite candidate first.');
 }
 function clear(){sequence++;controller?.abort();controller=null;result=null;error='';group.clearLayers();$('trackingResults').replaceChildren();$('trackingConsent').checked=false;render();}
 function draw(){
  group.clearLayers();$('trackingResults').replaceChildren();
  result.scenarios.forEach((s,i)=>{
   const color=['#72caff','#8ef0b5','#d9aaff'][i],now=Date.parse(result.now),past=s.points.filter(p=>p.time<=now),future=s.points.filter(p=>p.time>=now),to=p=>[p.lat,p.lon];
   if(past.length>1)L.polyline(past.map(to),{color,weight:3,dashArray:'5 7'}).addTo(group);
   if(future.length>1)L.polyline(future.map(to),{color,weight:4}).addTo(group);
   if(s.modelled_now){const el=document.createElement('span');el.textContent=tr('Bugün için hesaplanan konum · doğrulanmadı','Modelled position today · unverified');L.circleMarker(to(s.modelled_now),{radius:6,color}).bindTooltip(el).addTo(group);}
   const row=document.createElement('p');row.textContent='%'+Math.round(s.windage*100)+tr(' rüzgâr · ',' windage · ')+(s.reached_forecast_end?tr('24 saatlik tahmine ulaştı','reached +24h'):tr('Hesap durdu: ','stopped: ')+s.state)+' · '+date(s.points.at(-1).time);$('trackingResults').append(row);
  });
  if(group.getLayers().length)map.fitBounds(group.getBounds(),{padding:[30,30],maxZoom:12});
 }
 $('trackingConsent').onchange=()=>{if(!$('trackingConsent').checked){result=null;group.clearLayers();$('trackingResults').replaceChildren();}render();};
 $('trackingRun').onclick=async()=>{
  if(!source||!$('trackingConsent').checked||controller)return;const seq=++sequence,selected=structuredClone(source);controller=new AbortController();const control=controller;result=null;error='';batches=0;group.clearLayers();$('trackingResults').replaceChildren();render();
  const timer=setTimeout(()=>control.abort(),150000);
  try{let coast=await coastReady;if(!coast)throw Error('COAST_UNAVAILABLE');const origin=selected.observation.geometry.coordinates;if(coast.regional)coast=coast.regional({minLat:origin[1]-2,maxLat:origin[1]+2,minLon:origin[0]-2,maxLon:origin[0]+2});const provider=FocusTrackingCore.provider({signal:control.signal,onProgress:n=>{if(seq===sequence){batches=n;render();}}}),[lon,lat]=selected.observation.geometry.coordinates;
   const value=await FocusTrackingCore.simulate({lat,lon,observedAt:selected.observation.observed_at,getFields:provider.getFields,coast,signal:control.signal});
   if(seq!==sequence)return;result={...value,observation_source:selected.observation,environment_sources:provider.sources,request_batches:provider.requestBatches,validation_status:'unvalidated_model_trajectory',assumptions:{floating_object:true,windages:[0,.01,.03],stokes_drift:false,object_identity_verified:false}};draw();
  }catch(e){if(seq===sequence)error=control.signal.aborted?tr('İptal veya zaman aşımı','Cancelled or timed out'):({INVALID_START:tr('Gözlem tarihi gelecekte veya 45 günden eski; konumu ve tarihi kontrol edin.','The observation is in the future or more than 45 days old; check its position and date.'),LAND_START:tr('Başlangıç yaklaşık kara maskesinde.','Start is inside the approximate land mask.'),COAST_UNAVAILABLE:tr('Kıyı verisi yüklenemedi.','Coastline data could not be loaded.')}[e.message]||e.message);}
  finally{clearTimeout(timer);if(seq===sequence){controller=null;render();}}
 };
 $('trackingCancel').onclick=()=>{sequence++;controller?.abort();controller=null;error=tr('İptal edildi','Cancelled');render();};
 $('trackingExport').onclick=()=>{if(!result)return;const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));a.href=url;a.download='focus-dated-drift.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 window.addEventListener('odak:language',render);render();return {setSource(value){const same=JSON.stringify(source?.observation)===JSON.stringify(value?.observation);source=value?structuredClone(value):null;if(!same)clear();else render();},clear(){source=null;clear();}};
}};
