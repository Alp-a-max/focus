const http=require('http'),fs=require('fs'),path=require('path');const {analyze,validCoordinates}=require('./satellite.cjs'),observations=require('./observations.cjs');const root=__dirname,types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.json':'application/json; charset=utf-8'};const {compare}=require('./comparison.cjs');const port=Number(process.env.PELAGIC_PORT||8766);let busy=false;
function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(obj))}
const host = '127.0.0.1';
const {isSceneUnavailable}=require('./detection-errors.cjs');
function detectorStatus() {
  try {
    const value = require('./ml/detect-pretrained.cjs').status();
    return {available:value.available === true, model_id:String(value.model_id || '').slice(0,120), validation_status:'research_only'};
  } catch { return {available:false, model_id:null, validation_status:'research_only'}; }
}
async function handleDetection(req, res, url) {
  if (req.method !== 'GET') {json(res,405,{code:'METHOD_NOT_ALLOWED',error:'Bu işlem desteklenmiyor.'});return;}
  if (url.pathname === '/api/detection/status') {json(res,200,detectorStatus());return;}
  const latText=url.searchParams.get('lat'),lonText=url.searchParams.get('lon');
  const lat=Number(latText),lon=Number(lonText);
  if (url.searchParams.getAll('lat').length!==1 || url.searchParams.getAll('lon').length!==1 ||
      !latText?.trim() || !lonText?.trim() || !validCoordinates(lat,lon) || Math.abs(lat)>79) {
    json(res,400,{code:'INVALID_COORDINATES',error:'Geçerli bir deniz koordinatı seçin.'});return;
  }
  if (busy) {json(res,429,{code:'ANALYSIS_BUSY',error:'Başka bir analiz devam ediyor. Tamamlanınca tekrar deneyin.'});return;}
  if (!detectorStatus().available) {json(res,503,{code:'MODEL_UNAVAILABLE',error:'Araştırma tespit modeli bu bilgisayarda henüz hazır değil.'});return;}
  busy=true;
  const controller=new AbortController();
  const timeout=AbortSignal.timeout(110000);
  const timedOut=()=>controller.abort(new DOMException('Detection timed out','TimeoutError'));
  const disconnected=()=>{if(!res.writableEnded)controller.abort(new DOMException('Client disconnected','AbortError'));};
  timeout.addEventListener('abort',timedOut,{once:true});res.once('close',disconnected);
  let onAbort;
  // Keep the shared expensive-work lock until the actual worker settles, even if a client leaves.
  const operation=Promise.resolve().then(()=>{
    if(controller.signal.aborted)throw controller.signal.reason;
    return require('./ml/detect-pretrained.cjs').detect(lat,lon,{signal:controller.signal});
  });
  operation.then(()=>{busy=false;},()=>{busy=false;});
  try {
    const result=await Promise.race([operation,new Promise((resolve,reject)=>{
      onAbort=()=>reject(controller.signal.reason);controller.signal.addEventListener('abort',onAbort,{once:true});
      if(controller.signal.aborted)onAbort();
    })]);
    if(!result || result.type!=='FeatureCollection' || !Array.isArray(result.features) || !result.metadata)throw Error('Invalid detector result');
    if(!res.destroyed)json(res,200,result);
  } catch(error) {
    if(res.destroyed)return;
    if(isSceneUnavailable(error))
      json(res,422,{code:'NO_USABLE_SCENE',error:'Bu konumda son 45 gün için analize uygun Sentinel-2 görüntüsü bulunamadı. Başka bir bölge seçin; bu, atık olmadığı anlamına gelmez.'});
    else if(controller.signal.reason?.name==='TimeoutError' || error?.name==='TimeoutError' || /timed out/i.test(String(error?.message||'')))
      json(res,504,{code:'DETECTION_TIMEOUT',error:'Tespit işlemi zaman aşımına uğradı. Tekrar deneyin.'});
    else if(!detectorStatus().available)
      json(res,503,{code:'MODEL_UNAVAILABLE',error:'Araştırma tespit modeli bu bilgisayarda henüz hazır değil.'});
    else json(res,502,{code:'DETECTION_FAILED',error:'Uydu verisi veya model işlenemedi. Bağlantıyı ve sahne kapsamını kontrol edip tekrar deneyin.'});
  } finally {
    timeout.removeEventListener('abort',timedOut);res.removeListener('close',disconnected);
    controller.signal.removeEventListener('abort',onAbort);
  }
}
function allowObservationRequest(req, res, health = false) {
  const listeningPort = server.address().port;
  const allowedHosts = [`127.0.0.1:${listeningPort}`, `localhost:${listeningPort}`];
  const hosts = req.headersDistinct.host || [];
  const origins = req.headersDistinct.origin || [];
  if (hosts.length !== 1 || !allowedHosts.includes(hosts[0].toLowerCase())) {
    json(res, 403, {error: 'İstek Host başlığı reddedildi.'});
    return false;
  }
  // Local command-line clients may omit Origin, but must always supply Host.
  const allowedOrigins = allowedHosts.map(value => 'http://' + value);
  if (health) allowedOrigins.push('http://127.0.0.1:5500', 'http://localhost:5500');
  if (origins.length > 1 || (origins.length === 1 && !allowedOrigins.includes(origins[0]))) {
    json(res, 403, {error: 'İstek kaynağı reddedildi.'});
    return false;
  }
  return true;
}
const server = http.createServer(async (req, res) => {
  let url;
  let pathname;
  try {
    // Validate before URL normalization can discard malformed path segments.
    decodeURIComponent(req.url);
    url = new URL(req.url, 'http://localhost');
    pathname = decodeURIComponent(url.pathname.replace(/\/$/, '/index.html'));
  } catch {
    json(res, 400, {error: 'Geçersiz istek adresi.'});
    return;
  }
  if (url.pathname === '/api/health') {
    if (!allowObservationRequest(req, res, true)) return;
    if (req.method !== 'GET') {json(res,405,{error:'Bu işlem desteklenmiyor.'});return;}
    if (req.headers.origin) {res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');}
    const detection=detectorStatus();
    json(res,200,{service:'focus-local-api',schema_version:1,features:{satellite:true,observations:true,detection:detection.available},detection});return;
  }
  if (url.pathname.startsWith('/api/') && !allowObservationRequest(req, res)) return;
  if (url.pathname==='/api/satellite/detection' || url.pathname==='/api/detection/status') {
    await handleDetection(req,res,url);return;
  }
  if(url.pathname==='/api/observations'||/^\/api\/observations\/[0-9a-f-]{36}$/.test(url.pathname)){const recordId=url.pathname.split('/')[3]||null;if (req.method === 'DELETE' && recordId) {
    try {
      json(res, 200, await observations.remove(recordId));
    } catch (error) {
      json(res, error.code === 'NOT_FOUND' ? 404 : 500, {error: error.message});
    }
    return;
  }
  if(req.method==='GET'&&!recordId){try{json(res,200,await observations.list())}catch{json(res,500,{error:'Gözlem kayıtları okunamadı.'})}return}if(!((req.method==='POST'&&!recordId)||(req.method==='PUT'&&recordId))||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){json(res,415,{error:'JSON isteği gerekli.'});return}let chunks=[],bytes=0,tooLarge=false;req.on('data',chunk=>{bytes+=chunk.length;if(bytes>1500000){tooLarge=true;return}chunks.push(chunk)});req.on('end',async()=>{if(tooLarge){json(res,413,{error:'Fotoğraf çok büyük.'});return}try{json(res,recordId?200:201,await (recordId?observations.update(recordId,JSON.parse(Buffer.concat(chunks).toString('utf8'))):observations.save(JSON.parse(Buffer.concat(chunks).toString('utf8')))))}catch(e){json(res,e.code === 'NOT_FOUND' ? 404 : 400,{error:e.message})}});return}
if(url.pathname==='/api/satellite/comparison'){if(req.method!=='GET'){res.writeHead(405).end();return}const lat=Number(url.searchParams.get('lat')),lon=Number(url.searchParams.get('lon'));if(!url.searchParams.has('lat')||!url.searchParams.has('lon')||!validCoordinates(lat,lon)){json(res,400,{error:'Geçersiz koordinat.'});return}if(busy){json(res,429,{error:'Başka bir analiz devam ediyor.'});return}busy=true;try{json(res,200,await compare(lat,lon,analyze))}catch(e){json(res,502,{error:e.message})}finally{busy=false}return}if(url.pathname==='/api/satellite/analysis'){if(req.method!=='GET'){res.writeHead(405).end();return}const lat=Number(url.searchParams.get('lat')),lon=Number(url.searchParams.get('lon'));if(!url.searchParams.has('lat')||!url.searchParams.has('lon')||!validCoordinates(lat,lon)){json(res,400,{error:'Geçersiz koordinat.'});return}if(busy){json(res,429,{error:'Başka bir analiz devam ediyor.'});return}busy=true;try{json(res,200,await analyze(lat,lon))}catch(e){json(res,502,{error:e.message})}finally{busy=false}return}
if(!/^\/(?:(?:index|platform)\.html|(?:css|js|assets)\/[a-zA-Z0-9_.-]+)$/.test(pathname)){res.writeHead(404).end();return}let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data)})});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`ODAK başlatılamadı: ${host}:${port} kullanımda. Başka bir port seçmek için PELAGIC_PORT ayarlayın.`);
  } else {
    console.error(`ODAK sunucu hatası (${host}:${port}): ${error.message}`);
  }
  process.exitCode = 1;
});

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('ODAK başlatılamadı: PELAGIC_PORT 0 ile 65535 arasında bir tam sayı olmalıdır.');
  process.exitCode = 1;
} else {
  server.listen(port, host, () => {
    console.log(`ODAK hazır: http://${host}:${server.address().port}`);
    if (process.env.ODAK_CYGNSS_AUTO_UPDATE !== '0') require('./cygnss-update.cjs').startCygnssUpdates();
  });
}
