'use strict';
/* Ordered, bounded STAC search. No unvalidated remote asset URLs are fetched here. */
async function findScene(lat,lon,{before,signal,fetchImpl=fetch}={}) {
 const until=before?new Date(before):new Date(),since=new Date(+until-45*86400000);
 if(!Number.isFinite(+until))throw Error('Görüntü arama tarihi geçersiz.');
 const params=new URLSearchParams({collections:'sentinel-2-l2a',bbox:[lon-.001,lat-.001,lon+.001,lat+.001].join(','),
   datetime:since.toISOString()+'/'+until.toISOString(),limit:'20',sortby:'-properties.datetime'});
 let url='https://earth-search.aws.element84.com/v1/search?'+params,last=Infinity;
 const visited=new Set();
 for(let page=0;page<5;page++) {
  if(visited.has(url))throw Error('Katalog sayfalaması tekrarlanıyor.');visited.add(url);
  const response=await fetchImpl(url,{signal});if(!response.ok)throw Error('Görüntü kataloğuna erişilemedi.');
  const data=await response.json();if(!Array.isArray(data.features))throw Error('Katalog yanıtı geçersiz.');
  const scenes=data.features.filter(x=>Number.isFinite(Date.parse(x.properties?.datetime)))
    .sort((a,b)=>Date.parse(b.properties.datetime)-Date.parse(a.properties.datetime));
  for(const scene of scenes) {
   const date=Date.parse(scene.properties.datetime);
   if(date>last)throw Error('Katalog zaman sıralaması doğrulanamadı.');last=date;
   if(date<+since||date>=+until)continue;
   if(Number.isFinite(scene.properties['eo:cloud_cover'])&&scene.properties['eo:cloud_cover']>=0&&scene.properties['eo:cloud_cover']<=30
     &&['nir','rededge2','swir16','scl','visual'].every(k=>typeof scene.assets?.[k]?.href==='string'))return scene;
  }
  const next=data.links?.find(link=>link.rel==='next');
  if(!next)throw Error('Son 45 günde uygun bulutluluğa sahip Sentinel-2 sahnesi bulunamadı.');
  const destination=new URL(next.href,url);
  if(destination.origin!=='https://earth-search.aws.element84.com'||destination.pathname!=='/v1/search'||(next.method&&next.method!=='GET'))throw Error('Katalog devam bağlantısı doğrulanamadı.');
  url=destination.href;
 }
 throw Error('Katalog tarama sınırına ulaşıldı. Bu aramada uygun sahne doğrulanamadı.');
}
module.exports={findScene};
