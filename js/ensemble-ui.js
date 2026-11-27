/* Scenario viewer: shares one field per origin, never treats old detections as current positions. */
'use strict';
window.OdakEnsembleUI = function(map, {getOrigin, coastReady}) {
  const panel = document.createElement('section');
  panel.className = 'panel ensemble-panel';
  panel.setAttribute('aria-labelledby','ensembleTitle');
  panel.innerHTML = `<div class="panel-head"><span class="panel-title" id="ensembleTitle">Yayılım senaryoları</span><span class="live">Deneysel · 24 saat</span></div>
    <div class="ensemble-body"><div class="ensemble-intro"><div><h3>Tek rota yerine olası hareketler.</h3>
    <p>Seçilen deniz noktasının çevresinden 25 parçacık başlatın. Akıntı ve rüzgârın farklı etkilerini aynı haritada inceleyin.</p></div>
    <button id="ensembleRun" class="primary" type="button">Senaryoları hesapla ↗</button></div>
    <p class="ensemble-origin" id="ensembleOrigin"></p><p id="ensembleObservation" class="ensemble-observation" translate="no" hidden></p>
    <div class="ensemble-toolbar"><div class="ensemble-times" role="group" aria-label="Senaryo zamanı">
    <button type="button" data-ensemble-hour="6" aria-pressed="true">6 saat</button>
    <button type="button" data-ensemble-hour="12" aria-pressed="false">12 saat</button>
    <button type="button" data-ensemble-hour="24" aria-pressed="false">24 saat</button></div>
    <a href="#intelligence" class="ghost" id="ensembleView">Haritada gör ↑</a>
    <button id="ensembleClear" type="button" disabled>Katmanı temizle</button>
    <button id="ensembleExport" type="button" disabled>Senaryoyu indir</button></div>
    <p id="ensembleStatus" role="status" aria-live="polite">Hesaplanmadı. Başlangıç, seçili noktanın bugün bulunduğu varsayılan konumudur.</p>
    <div class="ensemble-cards" id="ensembleSummary"></div>
    <details class="plain-details"><summary>Varsayımlar ve veri kaynakları</summary>
    <p>Başlangıç noktaları seçili koordinatın doğu–batı ve kuzey–güney yönlerinde ±500 m çevresinde bir kare oluşturur. Bu yayılım ölçülmüş belirsizlik değildir. Her senaryoda aynı 25 başlangıç kullanılır; rüzgâr etkileri %0, %1 ve %3 varsayımlarıdır.</p>
    <p>15 dakikalık orta nokta adımlarında en yakın model hücresi yeniden seçilir, saatlik hız vektörleri zaman içinde ara değerlerle hesaplanır. Akıntı/rüzgâr alanı sınırlı ve kabadır; kıyı maskesi yaklaşık Natural Earth verisidir. Sağlayıcının toplam deniz hızı tanımı dalga ve gelgit katkılarını içerir; ayrıca Stokes hızı eklenmez. Batma ve nesne özellikleri ayrıca modellenmez.</p>
    <p>Boyanan alan, kullanılabilir senaryo noktalarının dış sınırıdır; bir güven aralığı veya olasılık haritası değildir. Nokta bilgileri durma zamanını gösterir. Alan dışına çıkan ve verisi eksilen parçacıklar için son bilinen hesaplama konumu gösterilir.</p>
    <p>Eski uydu görüntüleri, CYGNSS ve GPGP katmanları güncel başlangıç konumu sağlamaz. Bu özellik geçmişten bugüne takip yapmaz; sahada atık bulunduğunu doğrulamaz. Tahminler bağımsız saha verisiyle henüz doğrulanmadı.</p>
    <p><a href="https://open-meteo.com/en/docs/marine-weather-api" target="_blank" rel="noopener noreferrer">Open-Meteo Marine</a> · <a href="https://open-meteo.com/en/docs" target="_blank" rel="noopener noreferrer">Open-Meteo Weather</a> · <a href="https://www.mdpi.com/2073-4441/17/22/3318" target="_blank" rel="noopener noreferrer">Yöntem referansı · DEEP-PLAST</a></p>
    <p id="ensembleMetadata"></p></details></div>`;
  document.querySelector('#laboratory .lab-grid').prepend(panel);
  const $ = id => panel.querySelector('#'+id), group = L.featureGroup().addTo(map);
  const colors = ['#8bd1ff','#80e4bc','#d2b5ff'];
  const reasons = {active:'Hesaplanan konum',coast:'Yaklaşık kıyı maskesinde durdu',land_start:'Başlangıç kara maskesinde',
    missing:'Model verisi yetersiz; son hesaplanan konum',outside:'Sorgulanan alanın dışına çıkacak; son hesaplanan konum',
    coast_unknown:'Kıyı geçişi doğrulanamadı; son hesaplanan konum',invalid:'Hesaplama tamamlanamadı'};
  let result, data, provenance, hour = 6, sequence = 0, controller;
  function sourceLabel(){
    const context=provenance||getOrigin().detection;
    $('ensembleObservation').hidden=!context;
    $('ensembleObservation').textContent=window.FocusDetectionUI?.describeContext(context)||'';
  }
  function originLabel() {
    const p=getOrigin(); $('ensembleOrigin').textContent=`Seçili başlangıç: ${p.lat.toFixed(4)}°, ${p.lon.toFixed(4)}° · Güncel model saati kullanılır.`;
    sourceLabel();
  }
  function hull(points) {
    const unique = [...new Map(points.map(p=>[[p.lon,p.lat].join(','),[p.lon,p.lat]])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    if (unique.length < 3) return [];
    const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
    const half=values=>{const out=[];for(const p of values){while(out.length>=2&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
    const a=half(unique),b=half([...unique].reverse());a.pop();b.pop();return [...a,...b].map(([lon,lat])=>[lat,lon]);
  }
  function render(fit=false) {
    group.clearLayers(); $('ensembleSummary').replaceChildren();
    if (!result) return;
    sourceLabel();
    const start=Date.parse(data.startTime), display=new Date(start+hour*3600000).toISOString().slice(0,16).replace('T',' ')+' UTC';
    let incomplete=0;
    result.scenarios.forEach((scenario,i)=>{
      const view=OdakEnsemble.snapshot(scenario,hour), c=view.counts;
      const unknown=c.missing+c.outside+c.coast_unknown+c.invalid;
      incomplete+=unknown+c.land_start;
      const card=document.createElement('article');card.className='ensemble-card';card.style.setProperty('--scenario',colors[i]);
      const title=document.createElement('strong'); title.textContent=`%${scenario.windage*100} rüzgâr etkisi`;
      const summary=document.createElement('p'); summary.textContent=`${c.active}/${view.total} ilerleyen · ${c.coast} kıyıda duran`;
      const stopped=document.createElement('small');stopped.textContent=`${c.outside} alan dışı · ${c.missing} veri eksik · ${c.land_start} karada başlangıç${c.coast_unknown+c.invalid?' · '+(c.coast_unknown+c.invalid)+' tamamlanamayan':''}`;
      card.append(title,summary,stopped);$('ensembleSummary').append(card);
      const area=hull(view.points.filter(p=>p.state==='active'||p.state==='coast'));
      if (area.length>=3) L.polygon(area,{className:'ensemble-area',color:colors[i],weight:1,fillOpacity:.12,interactive:false}).addTo(group);
      for (const id of [0,4,12,20,24]) {
        const trajectory=scenario.particles[id].points.filter(p=>p.hour<=hour);
        if(trajectory.length>1)L.polyline(trajectory.map(p=>[p.lat,p.lon]),{className:'ensemble-route',color:colors[i],weight:1.5,opacity:.5,interactive:false}).addTo(group);
      }
      view.points.forEach(p=>{
        const text=document.createElement('div');
        for(const value of [`%${scenario.windage*100} rüzgâr · Parçacık ${p.id+1}`,reasons[p.state],
          `Konum: ${p.lat.toFixed(4)}°, ${p.lon.toFixed(4)}°`,
          `Hesaplanan zaman: ${new Date(start+p.hour*3600000).toISOString().slice(0,16).replace('T',' ')} UTC`,
          'Deneysel senaryo; atık varlığı veya gerçek konumu doğrulanmadı.']) {
          const line=document.createElement('p');line.textContent=value;text.append(line);
        }
        L.circleMarker([p.lat,p.lon],{className:'ensemble-particle',radius:p.state==='active'?4:5,
          color:colors[i],weight:1.5,fillColor:p.state==='active'?colors[i]:'#172330',fillOpacity:.9,
          dashArray:p.state==='active'?null:'2 2',bubblingMouseEvents:false}).bindPopup(text).addTo(group);
      });
    });
    $('ensembleStatus').textContent=`${hour} saat · ${display}. 3 senaryo, toplam 75 parçacık. ${incomplete?'Bazı parçacıkların hesabı tamamlanamadı; aşağıdaki sayıları ve son hesaplanan konumları inceleyin.':'Tüm başlangıçlar için bu saate kadar hesap tamamlandı.'} Bu yayılım bir güven aralığı değildir.`;
    if(fit&&group.getBounds().isValid())map.fitBounds(group.getBounds(),{padding:[30,30],maxZoom:12,animate:false});
    $('ensembleClear').disabled=false; $('ensembleExport').disabled=false;
  }
  function reset() {
    sequence++;controller?.abort();controller=null;result=null;data=null;provenance=null;group.clearLayers();
    $('ensembleSummary').replaceChildren();$('ensembleMetadata').textContent='';
    $('ensembleRun').disabled=Boolean(getOrigin().detection&&!getOrigin().detection.assumption);$('ensembleClear').disabled=true;$('ensembleExport').disabled=true;
    $('ensembleStatus').textContent='Konum veya girdiler değişti. Yeni başlangıç için senaryoları hesaplayın.';originLabel();
  }
  $('ensembleRun').addEventListener('click',async()=>{
    if(getOrigin().detection&&!getOrigin().detection.assumption){sourceLabel();return;}
    const current=++sequence, origin=getOrigin();controller?.abort();controller=new AbortController();
    $('ensembleRun').disabled=true;group.clearLayers();result=null;data=null;$('ensembleSummary').replaceChildren();
    $('ensembleClear').disabled=true;$('ensembleExport').disabled=true;
    $('ensembleStatus').textContent='Çevredeki saatlik akıntı ve rüzgâr alanları yükleniyor…';
    try {
      const coast=await coastReady;
      if(current!==sequence)return;
      if(!coast)throw Error('Kıyı maskesi yüklenemedi.');
      if(coast.pointOnLand(origin.lat,origin.lon))throw Error('Başlangıç kara maskesinde; deniz noktası seçin.');
      const fields=await OdakForecastData.load(origin.lat,origin.lon,{signal:controller.signal});
      if(current!==sequence)return;
      const regionalCoast=coast.regional ? coast.regional(fields.bounds) : coast;
      const computed=OdakEnsemble.simulate({...origin,...fields,coast:regionalCoast,radiusKm:.5});
      data=fields;result=computed;provenance=origin.detection?structuredClone(origin.detection):null;
      $('ensembleMetadata').textContent=`Model başlangıcı: ${data.startTime} · Verinin alınması: ${data.retrievedAt}. ${data.marineCells.length} farklı akıntı, ${data.windCells.length} farklı rüzgâr hücresi. ${data.notes}`;
      render(true);
    }catch(error){
      if(current!==sequence)return;
      $('ensembleStatus').textContent=error.name==='AbortError'||error.name==='TimeoutError'?'Veri isteği zaman aşımına uğradı. Tekrar deneyin.':'Senaryo oluşturulamadı: '+error.message;
    }finally{if(current===sequence)$('ensembleRun').disabled=Boolean(getOrigin().detection&&!getOrigin().detection.assumption);}
  });
  panel.querySelectorAll('[data-ensemble-hour]').forEach(button=>button.addEventListener('click',()=>{
    hour=Number(button.dataset.ensembleHour);
    panel.querySelectorAll('[data-ensemble-hour]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    render();
  }));
  $('ensembleClear').addEventListener('click',reset);
  $('ensembleView').addEventListener('click',()=>{if(result)render(true);});
  $('ensembleExport').addEventListener('click',()=>{
    if(!result||!data)return;
    const output={schema_version:1,kind:'experimental_drift_sensitivity_scenarios',units:{coordinates:'degrees',time:'UTC',speed:'km/h'},
      start_time:data.startTime,retrieved_at:data.retrievedAt,field_sources:data.sources,bounds:data.bounds,
      observation_source:provenance?.observation||null,
      assumptions:{initial_square_half_width_m:500,windage:[0,.01,.03],step_minutes:15,field_sampling:'nearest valid model cell within 25 km',
        calibration:'Not validated against independent field trajectories; no statistical probabilities',
        current_start:provenance?.assumption||null,historical_tracking:false},
      scenarios:result.scenarios};
    const url=URL.createObjectURL(new Blob([JSON.stringify(output)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='odak-suruklenme-senaryolari.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  originLabel();
  window.addEventListener('odak:language',sourceLabel);
  return {reset};
};
