/* Sentinel-2 scene preview and unvalidated spectral inspection workflow. */
(function(){'use strict';window.PelagicAnalysis=function(map,onRoute){const $=id=>document.getElementById(id);let origin=null,seq=0,overlay=null,controller=null,comparisonController=null,scene=null,selected=null,markerGroup=L.layerGroup().addTo(map);const observations=L.layerGroup().addTo(map);
 function removeOverlay(){if(overlay){map.removeLayer(overlay);overlay=null}}
 function clear(){seq++;if(controller)controller.abort();if(comparisonController)comparisonController.abort();$('comparisonRun').disabled=false;$('comparisonImages').hidden=true;$('comparisonStatus').textContent='Henüz karşılaştırma yapılmadı.';removeOverlay();markerGroup.clearLayers();scene=null;selected=null;$('analysisClear').disabled=true;$('scenePreview').hidden=true;$('analysisDetails').hidden=true;$('candidateList').replaceChildren();$('candidateStatus').textContent='Analizden sonra inceleme alanları burada görünür.';$('analysisStatus').textContent='Seçili nokta için analiz yapılmadı.'}
 function choose(item){$('analysisPanel').open=true;selected=item;$('analysisDetails').hidden=false;$('inspectionCoord').textContent=`${item.lat.toFixed(4)}°, ${item.lon.toFixed(4)}°`;$('inspectionReason').textContent=item.reason||'Kullanıcının seçimi';$('inspectionScene').textContent=(item.scene?`${item.scene} · ${item.sceneDate||''}`:scene?`${scene.sceneId} · ${scene.date.slice(0,16).replace('T',' ')} UTC`:'Uydu bilgisi yok')+' · Bu konum güncel atık konumu olarak doğrulanmadı.';$('inspectionNote').value=item.note||'';$('inspectionStatus').value=item.status||'unreviewed';$('inspectionPhoto').value='';$('inspectionFeedback').textContent=item.id?'Kaydı güncelleyebilirsiniz.':'Gözlem henüz kaydedilmedi.'}
 function sceneCanvas(d){let c=document.createElement('canvas');c.width=d.photoWidth||d.width;c.height=d.photoHeight||d.height;let ctx=c.getContext('2d'),im=ctx.createImageData(c.width,c.height);for(let i=0;i<c.width*c.height;i++){let v=d.rgb.slice(i*3,i*3+3);if(v.some(x=>x===null))continue;im.data.set([v[0],v[1],v[2],255],i*4)}ctx.putImageData(im,0,0);return c.toDataURL()}
 function analysisCanvas(d){let c=document.createElement('canvas');c.width=d.width;c.height=d.height;let ctx=c.getContext('2d'),im=ctx.createImageData(d.width,d.height),span=d.max-d.min;for(let i=0;i<d.values.length;i++){let value=d.values[i];if(value===null)continue;let t=span>0?(value-d.min)/span:.5;im.data.set([Math.round(255*t),Math.round(110+120*(1-Math.abs(t-.5)*2)),Math.round(255*(1-t)),210],i*4)}ctx.putImageData(im,0,0);return c.toDataURL()}
 function showLayer(){removeOverlay();if(scene){const photo=$('analysisLayer').value==='photo',bounds=photo?(scene.photoBounds||scene.bounds):scene.bounds;overlay=L.imageOverlay(photo?scene.photo:scene.colours,bounds,{opacity:photo?1:.85,interactive:false}).addTo(map);map.fitBounds(bounds,{maxZoom:15})}}
 function candidates(d){return PelagicCandidates.find(d.values,d.width,d.height).map(group=>{const {row,col,value,size}=group,grid=d.gridCoordinates?.[row*d.width+col],lat=grid?.[0]??d.bounds[1][0]-(row+.5)/d.height*(d.bounds[1][0]-d.bounds[0][0]),lon=grid?.[1]??d.bounds[0][1]+(col+.5)/d.width*(d.bounds[1][1]-d.bounds[0][1]);return {lat,lon,row,col,reason:`Pozitif FDI (${value.toFixed(4)}); alanın en yüksek %1 değerleri arasında birbirine komşu ${size} hücre. Bulut ve kara sınıflarının çevresine yaklaşık 60 m maske uygulanır. Deneysel incelemedir; atık tespiti veya güven puanı değildir.`,value,size}})}
 function renderCandidates(items){$('candidateList').replaceChildren();items.forEach((item,i)=>{const index=i+1,button=document.createElement('button');button.type='button';button.className='candidate-card';button.setAttribute('aria-pressed','false');const badge=document.createElement('span');badge.className='candidate-badge';badge.textContent=String(index);const info=document.createElement('span');info.className='candidate-card-copy';const title=document.createElement('strong');title.textContent=`İNCELEME ALANI ${index}`;const desc=document.createElement('small');desc.textContent=`${item.size} komşu hücre · doğrulanmadı`;info.append(title,desc);button.append(badge,info);function activate(){document.querySelectorAll('.candidate-card').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));choose(item)}button.onclick=activate;$('candidateList').appendChild(button);const icon=L.divIcon({className:'candidate-map-icon',html:`<span>${index}</span>`,iconSize:[34,34],iconAnchor:[17,17]});L.marker([item.lat,item.lon],{icon,title:`İnceleme alanı ${index}, doğrulanmadı`,keyboard:true}).bindTooltip(`İnceleme alanı ${index} · doğrulanmadı`).on('click',activate).addTo(markerGroup)})}
 async function run(){if(!origin)return;clear();const request=seq,p={...origin};controller=new AbortController();$('analysisRun').disabled=true;$('analysisStatus').textContent='Sentinel-2 bantları indiriliyor ve işleniyor; bu işlem biraz sürebilir…';try{let d=await FocusService.json(`/api/satellite/analysis?lat=${encodeURIComponent(p.lat)}&lon=${encodeURIComponent(p.lon)}`,{signal:controller.signal});if(request!==seq)return;const photoWidth=d.photoWidth||d.width,photoHeight=d.photoHeight||d.height;if(!Array.isArray(d.values)||d.values.length!==2500||!Array.isArray(d.rgb)||d.rgb.length!==photoWidth*photoHeight*3||!Number.isFinite(d.min)||!Number.isFinite(d.max))throw Error('Analiz yanıtı geçersiz.');scene={...d,photo:sceneCanvas(d),colours:analysisCanvas(d)};$('scenePreview').src=scene.photo;$('scenePreview').hidden=false;showLayer();$('analysisClear').disabled=false;$('analysisStatus').textContent=`${d.date.slice(0,16).replace('T',' ')} UTC · ${d.sceneId} · Sahne bulutluluğu %${d.cloud.toFixed(1)} · ${d.validPixels} geçerli / ${d.maskedPixels} maskeli hücre. ${d.note} FDI aralığı ${d.min.toFixed(4)} – ${d.max.toFixed(4)}; renkler görecelidir, çöp veya güven skoru göstermez.`;let found=candidates(d);$('candidateStatus').textContent=d.values.filter(Number.isFinite).length<100?'Geçerli veri az; karşılaştırma yapılamıyor.':found.length?`${found.length} spektral inceleme noktası; atık olup olmadığı bilinmiyor.`:'Pozitif yüksek FDI noktası bulunmadı; bu, atık bulunmadığını kanıtlamaz.';renderCandidates(found)}catch(e){if(request===seq&&e.name!=='AbortError')$('analysisStatus').textContent=e.message||'Analiz yapılamadı.'}finally{if(request===seq)$('analysisRun').disabled=false}}
 async function refreshObservations(){try{let records=await FocusService.json('/api/observations');if(!Array.isArray(records))throw Error('Kayıt yanıtı geçersiz.');$('observationStatus').textContent=records.length?records.length+' yerel kullanıcı bildirimi':'Bu bilgisayarda henüz bildirim yok.';observations.clearLayers();$('observationList').replaceChildren();for(const x of records){let li=document.createElement('li'),text=document.createElement('span');text.textContent=`${x.createdAt.slice(0,10)} · ${x.lat.toFixed(4)}, ${x.lon.toFixed(4)} · ${x.status==='field_reported'?'Kullanıcının fotoğraflı saha bildirimi':'İncelenmemiş kullanıcı bildirimi'}`;li.append(text);if(x.photo){let img=document.createElement('img');img.src=x.photo;img.alt='Kullanıcının saha fotoğrafı';img.className='observation-photo';li.append(img)}if(x.scene){let meta=document.createElement('p');meta.textContent='Sahne: '+x.scene+' · '+x.sceneDate;li.append(meta)}if(x.reason){let why=document.createElement('p');why.textContent=x.reason;li.append(why)}if(x.note){let note=document.createElement('p');note.textContent=x.note;note.dataset.userContent='';li.append(note)}let edit=document.createElement('button');edit.type='button';edit.textContent='BİLDİRİMİ GÜNCELLE';edit.onclick=()=>{choose(x);$('analysisDetails').scrollIntoView({behavior:'smooth',block:'center'})};edit.dataset.observationAction = 'edit';
      li.append(edit);
      addObservationActions(li, x);
      $('observationList').append(li);L.circleMarker([x.lat,x.lon],{className:'observation-marker',radius:5,color:'#fff',fillColor:'#ad8cff',fillOpacity:.9}).bindTooltip(x.status==='field_reported'?'Kullanıcının saha bildirimi':'İncelenmemiş kullanıcı bildirimi').on('click',()=>choose(x)).addTo(observations)}}catch{$('observationStatus').textContent='Yerel bildirim servisine ulaşılamıyor. Tam çalışma alanını açın.'}}
 $('comparisonRun').addEventListener('click',async()=>{if(!origin)return;const request=seq,p={...origin};if(comparisonController)comparisonController.abort();comparisonController=new AbortController();$('comparisonRun').disabled=true;$('comparisonImages').hidden=true;$('comparisonStatus').textContent='İki tarih için sahneler aranıyor ve işleniyor; birkaç dakika sürebilir…';try{const d=await FocusService.json('/api/satellite/comparison?lat='+encodeURIComponent(p.lat)+'&lon='+encodeURIComponent(p.lon),{signal:comparisonController.signal});if(request!==seq)return;for(const [key,id] of [['older','Older'],['newer','Newer']]){const s=d[key];if(!Array.isArray(s.rgb)||s.rgb.length!==s.photoWidth*s.photoHeight*3)throw Error('Uydu görüntüsü yanıtı geçersiz.');$('comparison'+id).src=sceneCanvas(s);$('comparison'+id+'Label').textContent=(id==='Older'?'Önceki: ':'Sonraki: ')+s.date.slice(0,10)+' · sahne bulutluluğu %'+s.cloud.toFixed(1)}$('comparisonImages').hidden=false;$('comparisonStatus').textContent=d.summary.commonPixels+' ortak geçerli su hücresi / '+d.summary.totalPixels+'; medyan FDI değişimi '+d.summary.medianDelta.toFixed(4)+'. Fark; bulut, dalga, yansıma veya farklı görüntü koşullarından kaynaklanabilir. Çöp tespiti veya atık yaşı değildir.'}catch(e){if(request===seq&&e.name!=='AbortError')$('comparisonStatus').textContent=e.message||'Karşılaştırma yapılamadı.'}finally{if(request===seq)$('comparisonRun').disabled=false}});$('analysisRun').addEventListener('click',run);$('analysisClear').addEventListener('click',clear);$('analysisLayer').addEventListener('change',showLayer);$('inspectCenter').addEventListener('click',()=>{if(origin)choose({lat:origin.lat,lon:origin.lon,reason:'Kullanıcının seçtiği konum; otomatik atık tespiti değildir.'})});$('inspectionRoute').addEventListener('click',()=>{if(selected){origin={lat:selected.lat,lon:selected.lon};onRoute(selected.lat,selected.lon)}});

 let recordBusy = false;
 const localNote = document.createElement('p');
 localNote.textContent = 'Bildirimler ve fotoğraflar yalnızca bu bilgisayarda tutulur. Silinen kayıtla birlikte kayıtlı fotoğrafı da kaldırılır.';
 const actionFeedback = document.createElement('p');
 actionFeedback.id = 'observationFeedback';
 actionFeedback.setAttribute('role', 'status');
 actionFeedback.setAttribute('aria-live', 'polite');
 $('observationList').before(localNote, actionFeedback);

 function setRecordBusy(value) {
   recordBusy = value;
   $('inspectionSave').disabled = value;
   document.querySelectorAll('[data-observation-action]').forEach(button => { button.disabled = value; });
 }

 function addObservationActions(container, record) {
   const remove = document.createElement('button');
   remove.type = 'button';
   remove.textContent = 'BİLDİRİMİ SİL';
   remove.dataset.observationAction = 'delete';
   remove.onclick = () => changeObservation(record, false);
   container.append(remove);
   if (record.photo) {
     const photo = document.createElement('button');
     photo.type = 'button';
     photo.textContent = 'YALNIZCA FOTOĞRAFI KALDIR';
     photo.dataset.observationAction = 'remove-photo';
     photo.onclick = () => changeObservation(record, true);
     container.append(photo);
   }
 }

 async function changeObservation(record, photoOnly) {
   if (recordBusy) return;
   const message = photoOnly
     ? 'Bu bildirimin kayıtlı fotoğrafı bu bilgisayardan kaldırılacak. Bildirim incelenmemiş kullanıcı bildirimi durumuna geçecek. Devam edilsin mi?'
     : 'Bu bildirim ve kayıtlı fotoğrafı bu bilgisayardan silinecek. Devam edilsin mi?';
   if (!window.confirm(window.OdakI18n?.t(message) || message)) {
     actionFeedback.textContent = 'İşlem iptal edildi. Kayıt ve fotoğraf korundu.';
     return;
   }
   setRecordBusy(true);
   try {
     const result = await FocusService.json('/api/observations/' + encodeURIComponent(record.id), photoOnly ? {
       method: 'PUT', headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({...record, photo: null, removePhoto: true, status: 'unreviewed'})
     } : {method: 'DELETE'});
     if (selected?.id === record.id) {
       if (photoOnly) choose(result);
       else {
         selected = null;
         $('analysisDetails').hidden = true;
         $('inspectionPhoto').value = '';
         $('inspectionNote').value = '';
       }
     }
     // A failed list reload must not leave the deleted record/photo on screen.
     observations.clearLayers();
     $('observationList').replaceChildren();
     await refreshObservations();
     actionFeedback.textContent = photoOnly
       ? 'Fotoğraf kaldırıldı. Bildirim incelenmemiş kullanıcı bildirimi durumunda korundu.'
       : 'Bildirim ve kayıtlı fotoğrafı bu bilgisayardan silindi.';
   } catch (error) {
     actionFeedback.textContent = error.message || 'İşlem tamamlanamadı. Tekrar deneyin.';
   } finally {
     setRecordBusy(false);
   }
 }

 $('inspectionSave').addEventListener('click', async () => {
   if (!selected || recordBusy) return;
   const target = selected;
   const file = $('inspectionPhoto').files[0];
   const note = $('inspectionNote').value;
   const status = $('inspectionStatus').value;
   if (status === 'field_reported' && (!(file || target.photo) || !note.trim())) {
     $('inspectionFeedback').textContent = 'Saha bildirimi için fotoğraf ve açıklama gerekli. Fotoğraf olmadan incelenmemiş kullanıcı bildirimi seçin.';
     return;
   }
   setRecordBusy(true);
   try {
     let photo = null;
     if (file) {
       if (file.size > 1024 * 1024 || !['image/jpeg', 'image/png'].includes(file.type)) {
         throw Error('En fazla 1 MB JPEG veya PNG seçin.');
       }
       photo = await new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.onload = () => resolve(reader.result);
         reader.onerror = () => reject(Error('Fotoğraf okunamadı.'));
         reader.readAsDataURL(file);
       });
     }
     const result = await FocusService.json(target.id ? '/api/observations/' + encodeURIComponent(target.id) : '/api/observations', {
       method: target.id ? 'PUT' : 'POST', headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({lat: target.lat, lon: target.lon, scene: target.scene || scene?.sceneId || '',
         sceneDate: target.sceneDate || scene?.date || '', reason: target.reason || '', note, status, photo})
     });
     if (selected === target) {
       choose(result);
       $('inspectionFeedback').textContent = 'Bu bilgisayara kaydedildi. Yeni fotoğraf seçilmediyse mevcut fotoğraf korundu.';
     }
     await refreshObservations();
   } catch (error) {
     $('inspectionFeedback').textContent = error.message || 'Kayıt yapılamadı.';
   } finally {
     setRecordBusy(false);
   }
 });

 refreshObservations();return{setOrigin(lat,lon){origin={lat,lon};clear();$('analysisRun').disabled=false}}};})();
