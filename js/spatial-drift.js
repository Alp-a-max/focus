(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./drift.js'));else root.OdakSpatialDrift=factory(root.PelagicDrift)})(typeof globalThis!=='undefined'?globalThis:this,function(drift){
'use strict';
// Nearest available model cell at each step; this is not continuous interpolation.
function nearest(cells,lat,lon){let chosen=null,best=Infinity;for(const c of cells){if(!Number.isFinite(c.lat)||!Number.isFinite(c.lon))continue;const distance=Math.hypot((c.lat-lat)*111.32,(c.lon-lon)*111.32*Math.cos(lat*Math.PI/180));if(distance<best){best=distance;chosen=c}}if(!chosen||best>25)throw Error('Rota yakınında geçerli model hücresi yok');return chosen}
function interpolate(cell,offset,wind){const h=Math.floor(offset),t=offset-h,a=cell.samples[h],b=cell.samples[h+1];if(!a||!b)throw Error('Rota üzerinde saatlik model verisi eksik');const va=drift.vector(a.speed,a.direction,wind),vb=drift.vector(b.speed,b.direction,wind);return va.map((v,i)=>v*(1-t)+vb[i]*t)}
function simulate({lat,lon,hours,windage,coast,marineCells,windCells,bounds}){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>80||Math.abs(lon)>179||![3,6,12,24].includes(hours)||![0,.01,.03].includes(windage)||!coast||!Array.isArray(marineCells)||!Array.isArray(windCells)||!bounds)throw Error('Geçersiz alansal tahmin girdisi');
 if(coast.pointOnLand(lat,lon))throw Error('Seçilen nokta kara maskesinde');
 let points=[{lat,lon}],elapsed=0,coastHit=false,usedCurrent=new Set(),usedWind=new Set();
 for(let step=0;step<hours*4;step++){
  const p=points.at(-1);if(p.lat<bounds.minLat||p.lat>bounds.maxLat||p.lon<bounds.minLon||p.lon>bounds.maxLon)throw Error('Rota örneklenen alanın dışına çıktı');
  const c=nearest(marineCells,p.lat,p.lon),w=nearest(windCells,p.lat,p.lon);usedCurrent.add(c.lat+','+c.lon);usedWind.add(w.lat+','+w.lon);
  const cv=interpolate(c,(step+.5)/4,false),wv=interpolate(w,(step+.5)/4,true),nextLat=p.lat+(cv[1]+windage*wv[1])*.25/111.32;
  if(Math.abs(nextLat)>80)throw Error('Tahmin kapsam dışında');const nextLon=p.lon+(cv[0]+windage*wv[0])*.25/(111.32*Math.cos(nextLat*Math.PI/180));if(Math.abs(nextLon)>180)throw Error('Tarih çizgisini aşan rota desteklenmiyor');
  const next={lat:nextLat,lon:nextLon},hit=coast.crossing(p,next);if(hit){const total=Math.hypot(next.lon-p.lon,next.lat-p.lat),part=Math.hypot(hit.lon-p.lon,hit.lat-p.lat);elapsed+=total ? .25*Math.min(1,part/total) : 0;points.push(hit);coastHit=true;break}if(next.lat<bounds.minLat||next.lat>bounds.maxLat||next.lon<bounds.minLon||next.lon>bounds.maxLon)throw Error('Rota örneklenen alanın dışına çıktı');if(coast.pointOnLand(next.lat,next.lon))throw Error('Kıyı geçişi doğrulanamadı');points.push(next);elapsed+=.25;
 }
 return {points,elapsedHours:elapsed,coastHit,currentCells:usedCurrent.size,windCells:usedWind.size};
}
return {simulate};
});
