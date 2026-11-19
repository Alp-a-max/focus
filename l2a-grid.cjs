'use strict';
const BANDS=['coastal','blue','green','red','rededge1','rededge2','rededge3','nir','nir08','swir16','swir22'];
const PRETRAINED_BANDS=[...BANDS.slice(0,9),'nir09',...BANDS.slice(9)];
function positions(grid) {
 const {width,height,transform:t,indices}=grid;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>512||height>512
   ||!Array.isArray(t)||t.length!==6||!t.every(Number.isFinite)||t[0]!==10||t[4]!==-10||t[1]!==0||t[3]!==0
   ||!Array.isArray(indices)||indices.length>262144||indices.some(i=>!Number.isInteger(i)||i<0||i>=width*height))throw Error('Invalid 10m annotation grid');
 return indices.map(i=>({x:t[2]+(i%width+.5)*10,y:t[5]-(Math.floor(i/width)+.5)*10}));
}
function scale(raw,meta) {
 if(!['scale','offset','nodata'].every(k=>Number.isFinite(meta[k]))||meta.scale<=0)throw Error('Explicit scale, offset and nodata required');
 return !Number.isFinite(raw)||raw===meta.nodata?null:raw*meta.scale+meta.offset;
}
async function readGrid(scene,grid,{signal=AbortSignal.timeout(120000),bands=BANDS}={}) {
 if(bands.length!==0&&JSON.stringify(bands)!==JSON.stringify(BANDS)&&JSON.stringify(bands)!==JSON.stringify(PRETRAINED_BANDS))throw Error('Unsupported band contract');
 const points=positions(grid),epsg=grid.epsg;
 if(!Number.isInteger(epsg)||scene.properties?.['proj:epsg']!==epsg||!((epsg>=32601&&epsg<=32660)||(epsg>=32701&&epsg<=32760)))throw Error('Scene and label CRS differ');
 if(!points.length)return {features:[],scl:[]};
 const {fromUrl}=await import('geotiff');
 async function band(name){
  const asset=scene.assets?.[name],url=new URL(asset?.href||'about:blank');
  if(url.protocol!=='https:'||url.hostname!=='sentinel-cogs.s3.us-west-2.amazonaws.com'||url.port||url.username||url.password||!url.pathname.endsWith('.tif'))throw Error('Unsupported COG source');
  const tiff=await fromUrl(url.href,{},signal),image=await tiff.getImage();
  if(image.getGeoKeys()?.ProjectedCSTypeGeoKey!==epsg)throw Error('COG CRS does not match annotations');
  const [ox,oy]=image.getOrigin(),[rx,ry]=image.getResolution();
  if(!(rx>0&&ry<0))throw Error('Unsupported COG grid');
  const pixels=points.map(p=>({x:Math.floor((p.x-ox)/rx),y:Math.floor((p.y-oy)/ry)}));
  const valid=pixels.filter(p=>p.x>=0&&p.y>=0&&p.x<image.getWidth()&&p.y<image.getHeight());
  if(!valid.length)return points.map(()=>null);
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const p of valid){left=Math.min(left,p.x);top=Math.min(top,p.y);right=Math.max(right,p.x+1);bottom=Math.max(bottom,p.y+1);}
  if((right-left)*(bottom-top)>1000000)throw Error('COG sample window exceeds bound');
  const rasters=await image.readRasters({window:[left,top,right,bottom],samples:[0],signal});
  return pixels.map(p=>{
   if(p.x<left||p.y<top||p.x>=right||p.y>=bottom)return null;
   const raw=rasters[0][(p.y-top)*(right-left)+p.x-left];
   return name==='scl'?(raw===0?null:raw):scale(raw,asset['raster:bands']?.[0]||{});
  });
 }
 const names=[...bands,'scl'],values=new Map();let next=0;
 await Promise.all(Array.from({length:4},async()=>{while(next<names.length){const name=names[next++];values.set(name,await band(name));}}));
 return {features:points.map((_,i)=>bands.map(b=>values.get(b)[i])),scl:values.get('scl')};
}
module.exports={BANDS,PRETRAINED_BANDS,positions,scale,readGrid};
