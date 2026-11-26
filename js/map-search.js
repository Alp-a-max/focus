(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FocusMapSearch=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const places=[
    {name:'Karadeniz',lat:41.6,lon:30.9,aliases:'karadeniz black sea'},
    {name:'Antalya Açıkları',lat:36.45,lon:31.3,aliases:'antalya mediterranean akdeniz'},
    {name:'Marmara Denizi',lat:40.75,lon:29.2,aliases:'marmara istanbul'},
    {name:'Ege Denizi',lat:38.1,lon:25.6,aliases:'ege aegean izmir'},
    {name:'Alanya Açıkları',lat:36.35,lon:32.1,aliases:'alanya'},
    {name:'Mersin Açıkları',lat:36.45,lon:34.6,aliases:'mersin adana seyhan ceyhan'},
    {name:'Sinop Açıkları',lat:42.2,lon:35.15,aliases:'sinop'},
    {name:'Samsun Açıkları',lat:41.5,lon:36.5,aliases:'samsun'},
    {name:'Trabzon Açıkları',lat:41.25,lon:39.8,aliases:'trabzon'},
    {name:'Zonguldak Açıkları',lat:41.65,lon:31.8,aliases:'zonguldak'},
    {name:'Çanakkale Açıkları',lat:39.9,lon:25.8,aliases:'canakkale'},
    {name:'Bodrum Açıkları',lat:36.85,lon:27.45,aliases:'bodrum mugla'}
  ].concat([{"name": "Karayipler · Belize", "lat": 16.65, "lon": -88.05, "aliases": "Caribbean · Belize caribbean"}, {"name": "Endonezya · Cakarta", "lat": -5.95, "lon": 106.8, "aliases": "Indonesia · Jakarta indonesia"}, {"name": "Hindistan · Mumbai", "lat": 18.95, "lon": 72.72, "aliases": "India · Mumbai india"}, {"name": "Brezilya · Rio", "lat": -23.03, "lon": -43.08, "aliases": "Brazil · Rio brazil"}, {"name": "Güney Afrika · Cape Town", "lat": -33.95, "lon": 18.33, "aliases": "South Africa · Cape Town south-africa"}, {"name": "Avustralya · Sidney", "lat": -33.85, "lon": 151.35, "aliases": "Australia · Sydney australia"}, {"name": "Kuzey Pasifik", "lat": 32, "lon": -145, "aliases": "North Pacific north-pacific"}, {"name": "Güney Pasifik", "lat": -30, "lon": -110, "aliases": "South Pacific south-pacific"}, {"name": "Kuzey Atlantik", "lat": 30, "lon": -40, "aliases": "North Atlantic north-atlantic"}, {"name": "Güney Atlantik", "lat": -30, "lon": -15, "aliases": "South Atlantic south-atlantic"}, {"name": "Hint Okyanusu", "lat": -25, "lon": 80, "aliases": "Indian Ocean indian-ocean"}]);
  const normalize=value=>value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
  function search(value) {
    const query=String(value).trim();if(!query||query.length>120)throw Error('Bir kıyı bölgesi veya enlem, boylam girin.');
    const coordinate=query.match(/^(-?\d+(?:\.\d+)?)\s*[,;\/]\s*(-?\d+(?:\.\d+)?)$/);
    if(coordinate){const lat=Number(coordinate[1]),lon=Number(coordinate[2]);if(lat < -79||lat > 79||lon < -179||lon > 179)throw Error('Koordinat model kapsamı dışında.');return [{name:'Seçilen koordinat',lat,lon}];}
    const term=normalize(query);return places.filter(p=>normalize(p.name+' '+p.aliases).includes(term)).slice(0,5);
  }
  function mount({select}) {
    const section=document.createElement('div');section.className='map-search';
    section.innerHTML=`<form id="mapSearchForm"><label for="mapSearchInput">Nereden başlamak istersiniz?</label><div class="map-search-input"><input id="mapSearchInput" type="search" maxlength="120" placeholder="Antalya, Mumbai, Cakarta veya 41.6, 30.9" autocomplete="off"><button type="submit">Konumu bul ↗</button></div></form><div class="map-search-results" id="mapSearchResults"></div><p id="mapSearchStatus" role="status">Türkiye ve dünyadaki izleme noktalarını veya koordinatları arayın. Konum bulunması atık bulunduğunu göstermez.</p><button type="button" id="mapSearchInspect">Seçili noktada uydu incelemesine geç →</button>`;
    document.querySelector('.map-wrap').before(section);
    const status=section.querySelector('#mapSearchStatus'),results=section.querySelector('#mapSearchResults');section.dataset.searchState='idle';
    function choose(place){select(place.lat,place.lon,place.name);results.replaceChildren();section.dataset.searchState='selected';status.textContent=place.name+' seçildi. Bu konumda atık olup olmadığı henüz bilinmiyor.';}
    section.querySelector('form').addEventListener('submit',event=>{
      event.preventDefault();results.replaceChildren();section.dataset.searchState='feedback';
      try {const found=search(section.querySelector('input').value);if(!found.length){status.textContent='Bu ad için kayıt yok. Enlem, boylam girerek devam edebilirsiniz.';return;}
        if(found.length===1){choose(found[0]);return;}
        status.textContent=found.length+' başlangıç noktası bulundu. Birini seçin.';
        for(const place of found){const button=document.createElement('button');button.type='button';button.textContent=place.name;button.addEventListener('click',()=>choose(place));results.append(button);}
      }catch(error){status.textContent=error.message;}
    });
    const release=document.createElement('button');release.type='button';release.id='mapSearchBreakaway';release.textContent='Seçili noktada kopuş tahmini oluştur →';section.append(release);release.onclick=()=>{document.getElementById('releaseUse')?.click();document.getElementById('releasePanel')?.scrollIntoView({block:'start'});};
    const published=!['127.0.0.1','localhost'].includes(location.hostname);if(published)section.querySelector('#mapSearchInspect').textContent='Seçili noktada uydu adaylarını incele';
    section.querySelector('#mapSearchInspect').addEventListener('click',()=>{
      document.getElementById(published?'detectionPanel':'analysisPanel').open=true;
      const button=document.getElementById(published?'detectionRun':'analysisRun');button.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
      button.focus({preventScroll:true});
    });
  }
  return {search,mount};
});
