/* UNet++ research candidates are independent from FDI and never imply a current waste location. */
window.FocusDetectionUI = (()=>{
  'use strict';
  const paper='https://doi.org/10.1016/j.isci.2023.108402';
  const words=(tr,en)=>window.OdakI18n?.language==='en'?en:tr;
  const date=value=>new Date(value).toLocaleString(window.OdakI18n?.locale||'tr-TR',{timeZone:'UTC',dateStyle:'medium',timeStyle:'short'})+' UTC';
  function describeContext(context){
    if(!context)return '';
    const o=context.observation;
    return words('Uydu gözlemi: ','Satellite observation: ')+date(o.observed_at)+' · '+o.scene_id+' · '+o.model_id+' · '+o.source+' · '+
      (context.assumption?words('Bu koordinat güncel başlangıç varsayıldı. Geçmişten bugüne takip yapılmadı.','This coordinate was assumed as a current start. No tracking from the past to the present.'):
        words('Güncel başlangıç varsayımı onaylanmadı; tahmin başlatılmaz.','Current-start assumption not accepted; no forecast is started.'));
  }
  function validate(data){
    const m=data?.metadata,validDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
    if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||data.features.length>25||m?.schema_version!==1||
      m.validation_status!=='research_only'||m.score_kind!=='uncalibrated neural-network score'||m.source!==paper||
      !validDate(m.observed_at)||!validDate(m.retrieved_at)||Date.parse(m.observed_at)>Date.now()+300000||
      typeof m.model_id!=='string'||m.model_id.length>200||typeof m.scene_id!=='string'||m.scene_id.length>500||
      !/^[a-f0-9]{64}$/.test(m.model_sha256)||!/^[a-f0-9]{64}$/.test(m.checkpoint_sha256)||
      !Number.isFinite(m.threshold)||m.threshold<=0||m.threshold>=1||
      !Number.isInteger(m.eligible_pixels)||m.eligible_pixels<0||!Number.isInteger(m.excluded_pixels)||m.excluded_pixels<0||
      !Number.isInteger(m.candidate_clusters)||m.candidate_clusters<data.features.length)throw Error('INVALID_RESULT');
    const ids=new Set();
    for(const f of data.features){
      const p=f?.properties,c=f?.geometry?.coordinates;
      if(f?.type!=='Feature'||f.geometry?.type!=='Point'||!Array.isArray(c)||c.length!==2||
        !c.every(Number.isFinite)||Math.abs(c[0])>179||Math.abs(c[1])>79||
        p?.status!=='unverified_model_candidate'||p.observed_at!==m.observed_at||p.scene_id!==m.scene_id||
        typeof p.candidate_id!=='string'||p.candidate_id.length>600||ids.has(p.candidate_id)||
        !Number.isInteger(p.grid_pixels)||p.grid_pixels<2||!Number.isFinite(p.max_score)||p.max_score<m.threshold||p.max_score>1)throw Error('INVALID_RESULT');
      ids.add(p.candidate_id);
    }
    return data;
  }
  function mount(map,{onSelect,onAssume}){
    const root=document.getElementById('detectionControls');
    root.innerHTML=`<p id="detectionIntro"></p><p class="detection-origin" id="detectionOrigin"></p><div class="detection-actions"><button type="button" id="detectionRun"></button><button type="button" id="detectionClear" disabled></button><button type="button" id="detectionExport" disabled></button></div><p class="detection-status" id="detectionStatus" role="status" aria-live="polite"></p><p id="detectionDates"></p><p id="detectionCoverage"></p><ul class="detection-list" id="detectionList"></ul><div class="detection-selection" id="detectionSelection" hidden><p id="detectionSelected"></p><label><input type="checkbox" id="detectionAssume"><span id="detectionAssumptionLabel"></span></label><button type="button" id="detectionForecast" disabled></button></div><details class="plain-details"><summary id="detectionNotesTitle"></summary><p id="detectionLimit"></p><a id="detectionPaper" href="${paper}" target="_blank" rel="noopener noreferrer"></a><pre class="detection-source" id="detectionSource"></pre></details>`;
    const $=id=>root.querySelector('#'+id),layer=L.featureGroup().addTo(map);
    $('detectionSelection').setAttribute('role','region');$('detectionSelection').setAttribute('aria-labelledby','detectionSelected');
    $('detectionAssume').setAttribute('aria-describedby','detectionSelected');$('detectionForecast').setAttribute('aria-describedby','detectionSelected');
    let origin,controller,seq=0,result,selected,assumption,phase='idle',errorCode='',model;
    const errors=()=>({
      MODEL_UNAVAILABLE:words('Araştırma tespit modeli bu bilgisayarda henüz hazır değil.','The research detector is not ready on this computer.'),
      ANALYSIS_BUSY:words('Başka bir analiz devam ediyor. Tamamlanınca tekrar deneyin.','Another analysis is running. Try again when it finishes.'),
      DETECTION_TIMEOUT:words('Tespit işlemi zaman aşımına uğradı. Tekrar deneyin.','Detection timed out. Try again.'),
      INVALID_COORDINATES:words('Geçerli bir deniz koordinatı seçin.','Select valid coordinates at sea.'),
      INVALID_RESULT:words('Tespit yanıtı doğrulanamadı. Tekrar deneyin.','The detection response could not be verified. Try again.'),
      DETECTION_FAILED:words('Uydu verisi veya model işlenemedi. Tekrar deneyin.','Satellite data or model processing failed. Try again.'),
      SERVICE_UNAVAILABLE:words('Tespit servisine ulaşılamıyor. Tam çalışma alanını açın ve tekrar deneyin.','Cannot reach the detector. Open the full local workspace and try again.')
    });
    function context(){return {observation:{candidate_id:selected.properties.candidate_id,observed_at:result.metadata.observed_at,scene_id:result.metadata.scene_id,
      source:result.metadata.source,model_id:result.metadata.model_id,model_sha256:result.metadata.model_sha256,checkpoint_sha256:result.metadata.checkpoint_sha256,
      status:'unverified_model_candidate',geometry:structuredClone(selected.geometry)},assumption:assumption?structuredClone(assumption):null};}
    function render(){
      document.getElementById('detectionHeading').textContent=words('Yapay zekâ ile atık adayları · araştırma','AI waste candidates · research');
      $('detectionIntro').textContent=words('Seçili nokta çevresinde yaklaşık 1 km² alanda gerçek Sentinel-2 L2A bantlarıyla UNet++ incelemesi. Üretilen konumlar doğrulanmamış atık adaylarıdır.','UNet++ inspection over about 1 km² around the selected point using actual Sentinel-2 L2A bands. Returned locations are unverified waste candidates.');
      $('detectionOrigin').textContent=origin?words('Arama merkezi: ','Search centre: ')+origin.lat.toFixed(4)+'°, '+origin.lon.toFixed(4)+'°':'';
      $('detectionRun').textContent=words('Yapay zekâ ile atık adaylarını ara','Search for waste candidates with AI');
      $('detectionClear').textContent=phase==='loading'?words('Aramayı iptal et','Cancel search'):words('Aday katmanını temizle','Clear candidate layer');
      $('detectionExport').textContent=words('Adayları GeoJSON indir','Download candidates as GeoJSON');
      $('detectionStatus').textContent=phase==='loading'?words('Uydu bantları ve araştırma modeli işleniyor…','Processing satellite bands and the research model…'):
        phase==='error'?(errors()[errorCode]||errors().DETECTION_FAILED):result?
          (result.features.length?result.features.length+words(' doğrulanmamış aday. Listeden veya haritadan inceleyin.',' unverified candidates. Inspect the list or map.'):
            words('Aday bulunmadı; atık yok anlamına gelmez.','No candidates found; this does not mean waste is absent.')):
          model?.available===false?errors().MODEL_UNAVAILABLE:words('Haritadan bir deniz noktası seçin ve aramayı başlatın.','Select a point at sea and start a search.');
      $('detectionRun').disabled=!origin||phase==='loading';$('detectionClear').disabled=phase!=='loading'&&!result;
      $('detectionExport').disabled=!result||phase==='loading';
      const m=result?.metadata;
      $('detectionCoverage').textContent=m?(m.eligible_pixels===0?words('Geçerli su pikseli yok; maske veya eksik veri analizi sınırlar. ','No eligible water pixels; masks or missing data limit the analysis. '):'')+
        m.eligible_pixels+words(' incelenebilir su pikseli · ',' eligible water pixels · ')+m.excluded_pixels+words(' maskeli veya eksik piksel.',' masked or missing pixels.')+
        (m.truncated?words(' Aday listesi sınırlı; toplam küme: ',' Candidate list truncated; total clusters: ')+m.candidate_clusters:''):'';
      $('detectionDates').textContent=m?words('Gözlem: ','Observed: ')+date(m.observed_at)+words(' · Alındı: ',' · Retrieved: ')+date(m.retrieved_at)+
        ' · '+m.scene_id+' · '+words('Kaynak: Sentinel-2 L2A / ','Source: Sentinel-2 L2A / ')+m.source:'';
      $('detectionSelected').textContent=selected?words('Seçili aday: ','Selected candidate: ')+selected.geometry.coordinates[1].toFixed(5)+'°, '+selected.geometry.coordinates[0].toFixed(5)+'° · '+date(m.observed_at)+
        words(' · Güncel atık konumu doğrulanmadı.',' · Present-day waste location not verified.'):'';
      $('detectionAssumptionLabel').textContent=words('Bu koordinatı güncel başlangıç varsay','Assume this coordinate as a current starting point');
      $('detectionForecast').textContent=words('Varsayımsal 6 / 12 / 24 saat senaryosuna geç','Open hypothetical 6 / 12 / 24-hour scenarios');
      $('detectionForecast').disabled=!selected||!$('detectionAssume').checked;
      $('detectionNotesTitle').textContent=words('Yöntem, skor ve kaynak notları','Method, score and source notes');
      $('detectionLimit').textContent=words('Araştırma prototipi; bağımsız yerel doğruluk henüz kanıtlanmadı. Skor kalibre edilmiş plastik olasılığı veya güven yüzdesi değildir. Aday piksel sayısı parça sayısı ya da tonaj değildir; CYGNSS adet/km² ve GPGP g/km² ile birleştirilmez. Gözlem tarihi atığın denize karışma tarihi değildir. Geçmişten bugüne takip yapılmaz.',
        'Research prototype; independent local accuracy has not been established. Scores are not calibrated plastic probabilities or confidence percentages. Candidate pixels are not item counts or tonnage, and are not combined with CYGNSS items/km² or GPGP g/km². Observation date is not the date waste entered the sea. No tracking from the past to the present.');
      $('detectionPaper').textContent=words('Kaynak makale · DOI 10.1016/j.isci.2023.108402','Source paper · DOI 10.1016/j.isci.2023.108402');
      $('detectionSource').textContent=m?JSON.stringify({...m,selected_candidate:selected?.properties||null},null,2):'';
      $('detectionList').replaceChildren();
      result?.features.forEach((feature,i)=>{
        const li=document.createElement('li'),b=document.createElement('button');b.type='button';
        b.textContent=words('Aday ','Candidate ')+(i+1)+' · '+feature.geometry.coordinates[1].toFixed(5)+'°, '+feature.geometry.coordinates[0].toFixed(5)+'° · '+feature.properties.grid_pixels+words(' aday piksel',' candidate pixels');
        b.setAttribute('aria-pressed',String(selected===feature));b.onclick=()=>choose(feature);li.append(b);$('detectionList').append(li);
      });
    }
    function choose(feature){
      selected=feature;assumption=null;$('detectionAssume').checked=false;$('detectionSelection').hidden=false;
      origin={lat:feature.geometry.coordinates[1],lon:feature.geometry.coordinates[0]};onSelect(context());render();$('detectionAssume').focus({preventScroll:true});
    }
    function clear(){seq++;controller?.abort();controller=null;phase='idle';result=null;selected=null;assumption=null;layer.clearLayers();
      $('detectionSelection').hidden=true;$('detectionAssume').checked=false;render();}
    async function run(){
      if(!origin||phase==='loading')return;
      clear();const current=seq,p={...origin};phase='loading';controller=new AbortController();render();
      try{
        const response=await fetch('/api/satellite/detection?'+new URLSearchParams(p),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(120000)]),cache:'no-store'});
        if(!/application\/json\b/.test(response.headers.get('content-type')||''))throw Error('SERVICE_UNAVAILABLE');
        let data;try{data=await response.json();}catch{throw Error('INVALID_RESULT');}
        if(!response.ok)throw Error(errors()[data?.code]?data.code:'DETECTION_FAILED');
        const validated=validate(data);if(validated.metadata.query?.lat!==p.lat||validated.metadata.query?.lon!==p.lon)throw Error('INVALID_RESULT');if(current!==seq)return;
        result=validated;phase='success';render();
        result.features.forEach((f,i)=>{
          const marker=L.circleMarker([f.geometry.coordinates[1],f.geometry.coordinates[0]],{className:'detection-candidate',radius:9,color:'#d3fff2',fillColor:'#43a795',fillOpacity:.85,weight:2,bubblingMouseEvents:false});
          marker.bindTooltip(()=>{const el=document.createElement('span');el.textContent=words('Aday ','Candidate ')+(i+1)+words(' · doğrulanmadı',' · unverified');return el;});
          marker.on('click',()=>{choose(f);document.getElementById('detectionPanel').open=true;$('detectionSelection').scrollIntoView({behavior:'auto',block:'nearest'});$('detectionAssume').focus({preventScroll:true});});marker.addTo(layer);
        });
        if(result.features.length)map.fitBounds(layer.getBounds(),{padding:[32,32],maxZoom:14,animate:false});
      }catch(error){if(current!==seq)return;phase='error';errorCode=error.name==='TimeoutError'?'DETECTION_TIMEOUT':errors()[error.message]?error.message:'SERVICE_UNAVAILABLE';render();}
      finally{if(current===seq){controller=null;render();}}
    }
    $('detectionRun').onclick=run;$('detectionClear').onclick=()=>{clear();$('detectionRun').focus();};
    $('detectionAssume').onchange=()=>{assumption=null;if(selected)onSelect(context());render();};
    $('detectionForecast').onclick=()=>{
      if(!selected||!$('detectionAssume').checked)return;
      assumption={kind:'assumed_current_start',accepted_at:new Date().toISOString(),coordinate:structuredClone(selected.geometry.coordinates),historical_tracking:false};
      onAssume(context());
    };
    $('detectionExport').onclick=()=>{
      if(!result)return;
      const output={...result,metadata:{...result.metadata,selected_candidate_id:selected?.properties.candidate_id||null,forecast_assumption:assumption,historical_tracking:false}};
      const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/geo+json'})),a=document.createElement('a');
      a.href=url;a.download='focus-waste-candidates-'+result.metadata.observed_at.slice(0,10)+'.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    fetch('/api/detection/status',{signal:AbortSignal.timeout(4000),cache:'no-store'}).then(r=>r.ok?r.json():null).then(value=>{model=value;render();}).catch(()=>{});
    window.addEventListener('odak:language',render);render();
    return {setOrigin(lat,lon){origin={lat,lon};clear();}};
  }
  return {mount,describeContext};
})();
