/* Çöp adaları: gerçek fotoğraf (Wikimedia Commons), Wikipedia özeti ve bağlantısı. Özet tarayıcıda Wikipedia'dan alınır. */
window.FocusPatchInfo=(()=>{
 'use strict';
 const tr=(a,b)=>window.OdakI18n?.language==='en'?b:a;
 // Bölge kimliği -> Wikipedia makaleleri (önce Türkçe, yoksa İngilizce).
 const ARTICLES={
  'north-pacific':{tr:'Büyük Pasifik çöp alanı',en:'Great Pacific Garbage Patch',name:['Büyük Pasifik Çöp Alanı','Great Pacific Garbage Patch']},
  'north-atlantic':{en:'North Atlantic garbage patch',name:['Kuzey Atlantik Çöp Alanı','North Atlantic Garbage Patch']},
  'south-pacific':{en:'South Pacific garbage patch',name:['Güney Pasifik Çöp Alanı','South Pacific Garbage Patch']},
  'indian-ocean':{en:'Indian Ocean garbage patch',name:['Hint Okyanusu Çöp Alanı','Indian Ocean Garbage Patch']},
  'south-atlantic':{en:'South Atlantic Gyre',name:['Güney Atlantik Girdabı','South Atlantic Gyre']}
 };
 // Gerçek fotoğraflar (Wikimedia Commons), lisans ve yazar bilgisiyle.
 const C='https://thumb.wikimedia.org/wikipedia/commons/thumb/';
 const PHOTOS={
  'north-pacific':{src:C+'d/d8/Beach_trash_%2830870156434%29.jpg/960px-Beach_trash_%2830870156434%29.jpg',file:'Beach_trash_(30870156434).jpg',credit:'Justin Dolske, CC BY-SA 2.0',caption:['Büyük Pasifik Çöp Alanı’ndan Hawaii kıyısına vuran atık','Debris from the Great Pacific Garbage Patch washed ashore in Hawaii']},
  'north-atlantic':{src:C+'7/78/004_Beach_pollution_in_Tenerife_-_Atlantic_Ocean_beach_plastic_garbage_debris.jpg/960px-004_Beach_pollution_in_Tenerife_-_Atlantic_Ocean_beach_plastic_garbage_debris.jpg',file:'004_Beach_pollution_in_Tenerife_-_Atlantic_Ocean_beach_plastic_garbage_debris.jpg',credit:'Marek Ślusarczyk, CC BY 3.0',caption:['Tenerife kıyısında Atlantik kaynaklı plastik atık','Atlantic Ocean plastic on a beach in Tenerife']},
  'south-pacific':{src:C+'c/cf/Garbage_Black_sand_beach_Maui_Hawaii_Road_to_Hana_%2845690820912%29.jpg/960px-Garbage_Black_sand_beach_Maui_Hawaii_Road_to_Hana_%2845690820912%29.jpg',file:'Garbage_Black_sand_beach_Maui_Hawaii_Road_to_Hana_(45690820912).jpg',credit:'dronepicr, CC BY 2.0',caption:['Pasifik kıyısında biriken atık, Maui','Debris washed up on a Pacific beach, Maui']},
  'indian-ocean':{src:C+'2/2b/Beach_at_Msasani_Bay%2C_Dar_es_Salaam%2C_Tanzania.JPG/960px-Beach_at_Msasani_Bay%2C_Dar_es_Salaam%2C_Tanzania.JPG',file:'Beach_at_Msasani_Bay,_Dar_es_Salaam,_Tanzania.JPG',credit:'Loranchet, CC BY 3.0',caption:['Hint Okyanusu kıyısı, Darüsselam: kıyıya vuran atık','Debris on an Indian Ocean beach, Dar es Salaam']},
  'south-atlantic':{src:C+'6/6a/Beach_plastic_waste_2.jpg/960px-Beach_plastic_waste_2.jpg',file:'Beach_plastic_waste_2.jpg',credit:'Fquasie, CC BY-SA 4.0',caption:['Kıyıda toplanan plastik atık','Plastic waste collected on a beach']}
 };
 const cache=new Map();
 const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error(String(r.status));return r.json();};
 const rest=(lang,title,path)=>`https://${lang}.wikipedia.org/api/rest_v1/page/${path}/${encodeURIComponent(title.replace(/ /g,'_'))}`;
 async function load(id){
  if(cache.has(id))return cache.get(id);
  const a=ARTICLES[id];if(!a)return null;
  const p=(async()=>{
   let summary=null,lang='en',title=a.en;
   if(a.tr){try{summary=await get(rest('tr',a.tr,'summary'));lang='tr';title=a.tr;}catch{}}
   if(!summary)summary=await get(rest('en',a.en,'summary'));
   return {summary,lang,title};
  })();
  cache.set(id,p);p.catch(()=>cache.delete(id));
  return p;
 }
 function card(id){
  const a=ARTICLES[id],box=document.createElement('div');box.className='patch-card';
  const h=document.createElement('strong');h.textContent=tr(a.name[0],a.name[1]);box.append(h);
  const status=document.createElement('p');status.className='patch-status';status.textContent=tr('Wikipedia bilgisi yükleniyor…','Loading from Wikipedia…');box.append(status);
  load(id).then(d=>{
   status.remove();setTimeout(()=>box.dispatchEvent(new Event('patch:ready',{bubbles:true})),0);
   const ph=PHOTOS[id];
   if(ph){
    const fig=document.createElement('figure');const img=document.createElement('img');img.src=ph.src;img.alt=tr(ph.caption[0],ph.caption[1]);img.decoding='async';img.referrerPolicy='no-referrer';img.width=272;img.height=150;img.addEventListener('load',()=>box.dispatchEvent(new Event('patch:ready',{bubbles:true})));
    const cap=document.createElement('figcaption');cap.append(document.createTextNode(tr(ph.caption[0],ph.caption[1])+'. '));
    const link=document.createElement('a');link.href='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(ph.file);link.target='_blank';link.rel='noopener noreferrer';link.textContent=ph.credit;cap.append(link);
    fig.append(img,cap);box.append(fig);
   }
   const text=document.createElement('p');const ex=(d.summary.extract||'').split(/(?<=\.)\s/);let t=ex[0]||'';if(t.length<140&&ex[1])t+=' '+ex[1];text.textContent=t.length>280?t.slice(0,277).replace(/\s\S*$/,'')+'…':t;box.append(text);
   const more=document.createElement('a');more.href=d.summary.content_urls?.desktop?.page||`https://${d.lang}.wikipedia.org/wiki/${encodeURIComponent(d.title)}`;more.target='_blank';more.rel='noopener noreferrer';more.className='patch-link';
   more.textContent=d.lang==='tr'?'Wikipedia\'da oku':tr('Wikipedia\'da oku (İngilizce)','Read on Wikipedia');box.append(more);
  }).catch(()=>{status.textContent=tr('Wikipedia\'ya şu an ulaşılamıyor.','Wikipedia is unreachable right now.');});
  return box;
 }
 // Kart haritanın üstüne değil, sol kontrol paneline yerleşir: rota kapanmaz, telefonda sayfa akışında görünür.
 function open(map,region){
  if(!ARTICLES[region.id])return false;
  const host=document.querySelector('.simple-control')||document.querySelector('main');
  let panel=document.getElementById('patchPanel');
  if(!panel){panel=document.createElement('section');panel.id='patchPanel';panel.className='patch-panel';panel.setAttribute('aria-live','polite');host.append(panel);}
  const close=document.createElement('button');close.type='button';close.className='patch-close';close.textContent='×';close.setAttribute('aria-label',tr('Kapat','Close'));close.onclick=()=>panel.remove();
  panel.replaceChildren(close,card(region.id));
  if(map)map.setView([region.lat,region.lon],Math.max(3,Math.min(map.getZoom(),5)),{animate:false});
  if(matchMedia('(max-width: 900px)').matches)panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  return true;
 }
 return Object.freeze({open,card,has:id=>Boolean(ARTICLES[id])});
})();
