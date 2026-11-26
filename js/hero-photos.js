/* Ana sayfa görseli: her açılışta gerçek bir deniz atığı fotoğrafı (Wikimedia Commons), yazar ve lisansıyla. */
(()=>{
 'use strict';
 const C='https://thumb.wikimedia.org/wikipedia/commons/thumb/';
 const PHOTOS=[
  {src:C+'d/d8/Beach_trash_%2830870156434%29.jpg/1280px-Beach_trash_%2830870156434%29.jpg',file:'Beach_trash_(30870156434).jpg',credit:'Justin Dolske, CC BY-SA 2.0',tr:'Büyük Pasifik Çöp Alanı’ndan Hawaii kıyısına vuran atık',en:'Debris from the Great Pacific Garbage Patch washed ashore in Hawaii'},
  {src:'https://upload.wikimedia.org/wikipedia/commons/e/e0/Albatross_at_Midway_Atoll_Refuge_%288080507529%29.jpg',file:'Albatross_at_Midway_Atoll_Refuge_(8080507529).jpg',credit:'Chris Jordan / USFWS, kamu malı',tr:'Midway Atolü, Kuzey Pasifik: plastik yutmuş albatros yavrusunun kalıntısı',en:'Midway Atoll, North Pacific: remains of an albatross chick that swallowed plastic'},
  {src:C+'c/cf/Garbage_Black_sand_beach_Maui_Hawaii_Road_to_Hana_%2845690820912%29.jpg/1280px-Garbage_Black_sand_beach_Maui_Hawaii_Road_to_Hana_%2845690820912%29.jpg',file:'Garbage_Black_sand_beach_Maui_Hawaii_Road_to_Hana_(45690820912).jpg',credit:'dronepicr, CC BY 2.0',tr:'Maui, Hawaii: Pasifik’ten gelen atık siyah kumsalda',en:'Maui, Hawaii: Pacific debris on a black-sand beach'},
  {src:C+'f/f1/Flostam_tern_island.JPG/1280px-Flostam_tern_island.JPG',file:'Flostam_tern_island.JPG',credit:'Duncan Wright / USFWS, kamu malı',tr:'Tern Adası, Kuzeybatı Hawaii: kıyılardan toplanan deniz atığı',en:'Tern Island, Northwestern Hawaii: debris collected from the beaches'},
  {src:C+'7/78/004_Beach_pollution_in_Tenerife_-_Atlantic_Ocean_beach_plastic_garbage_debris.jpg/1280px-004_Beach_pollution_in_Tenerife_-_Atlantic_Ocean_beach_plastic_garbage_debris.jpg',file:'004_Beach_pollution_in_Tenerife_-_Atlantic_Ocean_beach_plastic_garbage_debris.jpg',credit:'Marek Ślusarczyk, CC BY 3.0',tr:'Tenerife: Atlantik’ten gelen plastik atık',en:'Tenerife: plastic debris from the Atlantic'},
  {src:C+'5/50/Turtle_entangled_in_marine_debris_%28ghost_net%29.jpg/1280px-Turtle_entangled_in_marine_debris_%28ghost_net%29.jpg',file:'Turtle_entangled_in_marine_debris_(ghost_net).jpg',credit:'NOAA, kamu malı',tr:'Terk edilmiş balık ağına dolanmış deniz kaplumbağası',en:'A sea turtle entangled in an abandoned fishing net'},
  {src:C+'d/da/Nesocichla_eremita_-Inaccessible_Island%2C_British_overseas_territory-8_%283%29.jpg/1280px-Nesocichla_eremita_-Inaccessible_Island%2C_British_overseas_territory-8_%283%29.jpg',file:'Nesocichla_eremita_-Inaccessible_Island,_British_overseas_territory-8_(3).jpg',credit:'Brian Gratwicke, CC BY 2.0',tr:'Inaccessible Adası, Güney Atlantik: okyanus atığı arasında bir ardıç kuşu',en:'Inaccessible Island, South Atlantic: a thrush among ocean debris'}
 ];
 const img=document.getElementById('heroPhoto'),cap=document.getElementById('heroCaption');
 if(!img)return;
 let i=Math.floor(Math.random()*PHOTOS.length),tries=0;
 function show(){
  const p=PHOTOS[i],en=window.FocusSite?.lang==='en';
  img.src=p.src;img.alt=en?p.en:p.tr;
  cap.replaceChildren(document.createTextNode((en?p.en:p.tr)+'. '));
  const a=document.createElement('a');a.href='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(p.file);a.target='_blank';a.rel='noopener noreferrer';a.textContent=p.credit;cap.append(a);
 }
 img.addEventListener('error',()=>{if(++tries<PHOTOS.length){i=(i+1)%PHOTOS.length;show();}else document.getElementById('heroFigure').hidden=true;});
 document.addEventListener('focus:language',show);
 show();
})();
