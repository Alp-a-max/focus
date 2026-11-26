/* One main forecast workflow. Existing tool nodes are moved, never cloned or re-created. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),tr=(a,b)=>window.OdakI18n?.language==='en'?b:a;
 const intro=$('releaseIntro'),mapPanel=document.querySelector('.map-panel'),release=$('releasePanel');
 if(!intro||!mapPanel||!release)return;
 const stage=document.createElement('div');stage.className='simple-stage';stage.id='simpleStage';
 const control=document.createElement('aside');control.className='simple-control';control.setAttribute('aria-label','Tahmin kontrolü');
 const tools=document.createElement('dialog');tools.id='simpleTools';tools.className='simple-tools';tools.setAttribute('aria-labelledby','simpleToolsTitle');
 tools.innerHTML='<div class="simple-tools-head"><h2 id="simpleToolsTitle" translate="no"></h2><button type="button" id="simpleToolsClose" translate="no"></button></div><div class="simple-tools-layout"><div id="simpleToolsTabs" role="tablist" aria-label="Araç kategorileri"></div><div id="simpleToolsPanels"></div></div>';
 document.body.append(tools);
 const groups=[
  ['satellite','Uydu adayları','Satellite candidates',[$('detectionPanel'),$('reportPanel')]],
  ['layers','Harita katmanları','Map layers',[$('layerDrawer'),document.querySelector('.map-tools'),document.querySelector('.map-legend')]],
  ['regions','Yayımlanmış bölgeler','Published regions',[document.querySelector('.monitor-secondary')]],
  ['conditions','Deniz koşulları','Sea conditions',[$('conditionsPanel')]],
  ['advanced','İleri analiz','Advanced analysis',[$('analysisPanel'),$('laboratory')]],
  ['records','Yerel kayıtlar','Local reports',[$('recordsPanel')]],
  ['settings','Ayarlar ve kaynaklar','Settings and sources',[$('releaseOptions'),$('method'),document.querySelector('.service-notice')]]
 ];
 const panels=new Map(),tabs=new Map();let active='satellite',opener;
 for(const [id,title,en,nodes]of groups){
  const tab=document.createElement('button');tab.type='button';tab.id='simpleTab-'+id;tab.dataset.tool=id;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','simpleTool-'+id);tab.setAttribute('translate','no');
  const panel=document.createElement('section');panel.id='simpleTool-'+id;panel.className='simple-tool-section';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panel.hidden=true;
  for(const node of nodes)if(node)panel.append(node);
  $('simpleToolsTabs').append(tab);$('simpleToolsPanels').append(panel);panels.set(id,panel);tabs.set(id,tab);
  tab.onclick=()=>activate(id);
  tab.onkeydown=e=>{
   const keys=['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'];if(!keys.includes(e.key))return;e.preventDefault();
   const ids=groups.map(g=>g[0]),i=ids.indexOf(id),next=e.key==='Home'?0:e.key==='End'?ids.length-1:(i+(e.key==='ArrowRight'||e.key==='ArrowDown'?1:-1)+ids.length)%ids.length;
   activate(ids[next]);tabs.get(ids[next]).focus();
  };
 }
 const header=document.querySelector('body>header'),actions=document.createElement('div');actions.className='simple-header-actions nav-actions';
 const open=document.createElement('button');open.type='button';open.id='simpleToolsOpen';open.setAttribute('aria-haspopup','dialog');open.setAttribute('aria-controls','simpleTools');open.setAttribute('translate','no');
 actions.append(open,$('experienceOpen'));if($('themeToggle'))actions.append($('themeToggle'));header.append(actions);
 function activate(id){
  active=panels.has(id)?id:'satellite';
  for(const [key,panel]of panels){panel.hidden=key!==active;const tab=tabs.get(key);tab.setAttribute('aria-selected',String(key===active));tab.tabIndex=key===active?0:-1;}
  const panel=panels.get(active);if(!panel.dataset.opened){for(const child of panel.children)if(child.tagName==='DETAILS')child.open=true;panel.dataset.opened='true';}
 }
 function openTool(id=active,target){
  activate(id);if(!tools.open){const focused=document.activeElement;opener=focused&&focused!==document.body&&!tools.contains(focused)?focused:open;tools.showModal();document.body.classList.add('simple-tools-open');}
  if(target){for(let p=target.parentElement;p&&p!==tools;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;target.scrollIntoView({block:'nearest'});if(target.matches('button,input,select,textarea,summary,a'))target.focus();}
  else tabs.get(active).focus();
 }
 function close(){if(tools.open)tools.close();}
 open.onclick=()=>openTool();$('simpleToolsClose').onclick=close;
 tools.addEventListener('close',()=>{document.body.classList.remove('simple-tools-open');const back=opener?.isConnected&&!tools.contains(opener)?opener:open;back.focus({preventScroll:true});});
 // Put one compact control card next to the actual map. Tool listeners remain on their original nodes.
 const search=document.querySelector('.map-search');intro.insertBefore(search,intro.querySelector('.release-steps'));
 const hiddenActions=document.createElement('div');hiddenActions.hidden=true;hiddenActions.append($('releaseUse'),$('mapSearchInspect'),$('mapSearchBreakaway'));panels.get('settings').append(hiddenActions);
 const exampleSetup=$('releaseExample').parentElement;$('releaseRun').before($('releaseExample'));exampleSetup.hidden=true;
 const how=$('releaseResult').closest('details');how.id='simpleHow';
 const longIntro=intro.querySelector(':scope > p');if(longIntro)how.append(longIntro);
 how.append($('releaseSource'),$('releaseSummary'));
 const scenario=$('releaseScenario').closest('label');how.querySelector('summary').after(scenario);
 const location=document.createElement('p');location.id='simpleLocation';location.setAttribute('translate','no');search.after(location);
 const scope=document.createElement('p');scope.id='simpleScope';scope.setAttribute('translate','no');$('releaseHeading').after(scope);
 const consent=$('releaseConsent').closest('label'),consentCopy=document.createElement('span');consentCopy.id='simpleConsentText';consentCopy.setAttribute('translate','no');
 for(const node of [...consent.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();consent.append(consentCopy);$('releaseConsent').setAttribute('aria-describedby','simpleScope');
 for(const id of ['releaseHeading','releaseRun','releaseClear','releaseExample'])$(id).setAttribute('translate','no');
 const mapActions=document.createElement('div');mapActions.className='simple-map-actions map-tools';mapActions.append($('releaseBack'),$('releaseFit'),$('touchMoveBtn'));mapPanel.append(mapActions,$('mapHelp'));
 // All remaining map children are the map, its source/status strip and compact navigation.
 control.append(intro,release);stage.append(control,mapPanel);document.querySelector('.dash-grid').replaceChildren(stage);
 document.querySelector('.map-search label').setAttribute('for','mapSearchInput');
 for(const node of [document.querySelector('.map-search label'),$('mapSearchInput'),$('mapSearchForm').querySelector('button'),...intro.querySelectorAll('.release-steps li')])node.setAttribute('translate','no');
 const satelliteNotice=document.createElement('button');satelliteNotice.type='button';satelliteNotice.id='simpleObservation';satelliteNotice.hidden=true;satelliteNotice.setAttribute('translate','no');satelliteNotice.onclick=()=>openTool('satellite');intro.append(satelliteNotice);
 // The AI detection is the project's strongest feature: give it a visible entry point instead of burying it in Tools.
 const aiScan=document.createElement('button');aiScan.type='button';aiScan.id='simpleAiScan';aiScan.className='simple-ai-scan';aiScan.setAttribute('translate','no');aiScan.innerHTML='<span aria-hidden="true">🛰</span><span><strong></strong><small></small></span>';aiScan.onclick=()=>openTool('satellite',$('detectionRun'));intro.after(aiScan);
 // Yalnızca bu adreste gerçekten çalışan araçlar gösterilir.
 const isLocal=['localhost','127.0.0.1'].includes(window.location.hostname);
 if(!isLocal){aiScan.hidden=true;window.FocusPublicAPI?.ready?.then(ok=>{aiScan.hidden=!ok;});}
 fetch('api/health',{signal:AbortSignal.timeout(2500)}).then(r=>r.ok&&/json/.test(r.headers.get('content-type')||'')?r.json():null).then(v=>v?.service==='focus-local-api').catch(()=>false).then(ok=>{for(const id of ['advanced','records'])tabs.get(id).hidden=!ok;if(!ok&&['advanced','records'].includes(active))activate('layers');});
 let state={phase:'empty',source:null,hasResult:false},selected=null,observation=null;
 const placeNames={'Kuzey Pasifik':'North Pacific','Karadeniz':'Black Sea','Antalya Açıkları':'Offshore Antalya','Seçilen Koordinat':'Selected coordinates','Seçilen koordinat':'Selected coordinates','Uydu modeli adayı':'Satellite model candidate'};
 Object.assign(placeNames,{'Marmara Denizi':'Sea of Marmara','Ege Denizi':'Aegean Sea','Alanya Açıkları':'Offshore Alanya','Mersin Açıkları':'Offshore Mersin','Sinop Açıkları':'Offshore Sinop','Samsun Açıkları':'Offshore Samsun','Trabzon Açıkları':'Offshore Trabzon','Zonguldak Açıkları':'Offshore Zonguldak','Çanakkale Açıkları':'Offshore Çanakkale','Bodrum Açıkları':'Offshore Bodrum','Karayipler · Belize':'Caribbean · Belize','Endonezya · Cakarta':'Indonesia · Jakarta','Hindistan · Mumbai':'India · Mumbai','Brezilya · Rio':'Brazil · Rio','Güney Afrika · Cape Town':'South Africa · Cape Town','Avustralya · Sidney':'Australia · Sydney','Güney Pasifik':'South Pacific','Kuzey Atlantik':'North Atlantic','Güney Atlantik':'South Atlantic','Hint Okyanusu':'Indian Ocean'});
 function render(){
  open.textContent=tr('Araçlar','Tools');$('simpleToolsTitle').textContent=tr('Araçlar','Tools');$('simpleToolsClose').textContent=tr('Kapat','Close');
  $('simpleToolsTabs').setAttribute('aria-label',tr('Araç kategorileri','Tool categories'));control.setAttribute('aria-label',tr('Tahmin kontrolü','Forecast controls'));
  for(const [id,title,en]of groups)tabs.get(id).textContent=tr(title,en);
  $('releaseHeading').textContent=tr('Tahmin oluştur','Create a forecast');
  const stepText=[tr('Nokta seç','Pick a point'),tr('Hesapla','Calculate'),tr('Rotayı gör','See the route')];intro.querySelectorAll('.release-steps li').forEach((li,i)=>li.textContent=stepText[i]);
  document.querySelector('.map-search label').textContent=tr('Bölge veya koordinat','Area or coordinates');
  $('mapSearchInput').placeholder=tr('Antalya veya 32, -145','Antalya or 32, -145');$('mapSearchForm').querySelector('button').textContent=tr('Bul','Find');
  $('releaseExample').textContent=tr('Antalya açığında dene','Try off Antalya');
  aiScan.querySelector('strong').textContent=tr('Uydudan atık adayı ara','Scan satellite imagery for debris');aiScan.querySelector('small').textContent=tr('Sentinel-2 görüntüsü','Sentinel-2 imagery');
  const p=state.source,name=selected&&p&&selected.lat===p.lat&&selected.lon===p.lon?selected.name:'';
  location.textContent=p?(name?(window.OdakI18n.language==='en'?(placeNames[name]||name):name)+' · ':'')+p.lat.toFixed(4)+'°, '+p.lon.toFixed(4)+'°':tr('Henüz bölge seçilmedi. Haritaya da tıklayabilirsiniz.','No area selected yet. You can also click the map.');
  location.hidden=!p;$('releaseExample').hidden=Boolean(p);$('releaseStatus').hidden=!['loading','error'].includes(state.phase);
  consent.hidden=true;
  $('releaseRun').textContent=state.phase==='loading'?tr('Hesaplanıyor…','Calculating…'):state.phase==='error'?tr('Tekrar dene','Try again'):tr('Tahmini başlat','Start forecast');
  $('releaseClear').textContent=state.phase==='loading'?tr('İptal et','Cancel'):tr('Tahmini temizle','Clear forecast');$('releaseClear').hidden=!['loading','result','error'].includes(state.phase);
  scope.hidden=true;
  how.querySelector('summary').textContent=tr('Nasıl hesaplandı?','How was this calculated?');
  satelliteNotice.hidden=!observation;satelliteNotice.textContent=observation?tr('Uydu sonucu · ','Satellite result · ')+observation.observed_at.slice(0,10)+tr(' · Araçlarda incele',' · Inspect in tools'):'';
 }
 window.addEventListener('focus:release-state',e=>{state=e.detail;render();});
 window.addEventListener('focus:location-selected',e=>{
  selected=e.detail;if(e.detail.kind!=='observation'){observation=null;if(tools.open)close();}else if(!tools.open)openTool('satellite');render();
 });
 window.addEventListener('focus:result',e=>{observation=e.detail?.metadata||null;render();});
 window.addEventListener('focus:inspection-selected',()=>openTool('advanced',$('analysisDetails')));
 window.addEventListener('odak:language',render);
 // Existing deep links and legacy tool buttons continue to reach nodes moved into the dialog.
 function revealHash(){let node;try{node=$(decodeURIComponent(window.location.hash.slice(1)));}catch{}if(!node)return;const panel=node.closest('.simple-tool-section');if(panel)openTool(panel.id.replace('simpleTool-',''),node);}
 window.addEventListener('hashchange',revealHash);if(window.location.hash)requestAnimationFrame(revealHash);
 tools.addEventListener('click',e=>{
  if(e.target.closest('#gpgpGo,#cygnssGo,#monitorWorld'))close();
  if(e.target.closest('#detectionForecast,#inspectionRoute'))openTool('advanced',$('laboratory'));
  if(e.target.closest('#serviceRetry'))openTool('regions');
 });
 // Public feed buttons move to the map; scans and candidate inspection remain in the tools dialog.
 activate(active);render();window.dispatchEvent(new Event('resize'));
})();
