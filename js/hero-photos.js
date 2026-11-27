/* Ana sayfa görseli: her açılışta gerçek bir deniz atığı fotoğrafı (Wikimedia Commons), yazar ve lisansıyla. */
(()=>{
 'use strict';
 const C='https://thumb.wikimedia.org/wikipedia/commons/thumb/';
 const PHOTOS=[
  {src:C+'d/d8/Beach_trash_%2830870156434%29.jpg/1280px-Beach_trash_%2830870156434%29.jpg',file:'Beach_trash_(30870156434).jpg',credit:'Justin Dolske, CC BY-SA 2.0',tr:'Büyük Pasifik Çöp Alanı’ndan Hawaii kıyısına vuran atık',en:'Debris from the Great Pacific Garbage Patch washed ashore in Hawaii'},
  {src:C+'c/cf/Garbage_Black_sand_beach_Maui_Hawaii_Road_to_Hana_%2845690820912%29.jpg/1280px-Garbage_Black_sand_beach_Maui_Hawaii_Road_to_Hana_%2845690820912%29.jpg',file:'Garbage_Black_sand_beach_Maui_Hawaii_Road_to_Hana_(45690820912).jpg',credit:'dronepicr, CC BY 2.0',tr:'Maui, Hawaii: Pasifik’ten gelen atık siyah kumsalda',en:'Maui, Hawaii: Pacific debris on a black-sand beach'},
  {src:C+'f/f1/Flostam_tern_island.JPG/1280px-Flostam_tern_island.JPG',file:'Flostam_tern_island.JPG',credit:'Duncan Wright / USFWS, kamu malı',tr:'Tern Adası, Kuzeybatı Hawaii: kıyılardan toplanan deniz atığı',en:'Tern Island, Northwestern Hawaii: debris collected from the beaches'},
  {src:C+'7/78/004_Beach_pollution_in_Tenerife_-_Atlantic_Ocean_beach_plastic_garbage_debris.jpg/1280px-004_Beach_pollution_in_Tenerife_-_Atlantic_Ocean_beach_plastic_garbage_debris.jpg',file:'004_Beach_pollution_in_Tenerife_-_Atlantic_Ocean_beach_plastic_garbage_debris.jpg',credit:'Marek Ślusarczyk, CC BY 3.0',tr:'Tenerife: Atlantik’ten gelen plastik atık',en:'Tenerife: plastic debris from the Atlantic'},
  {src:C+'6/6a/Beach_plastic_waste_2.jpg/1280px-Beach_plastic_waste_2.jpg',file:'Beach_plastic_waste_2.jpg',credit:'Fquasie, CC BY-SA 4.0',tr:'Kıyıda plastik atık temizliği',en:'Beach plastic waste cleanup'}
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
