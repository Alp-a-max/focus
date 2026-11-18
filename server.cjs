const http=require('http'),fs=require('fs'),path=require('path');const {analyze,validCoordinates}=require('./satellite.cjs'),observations=require('./observations.cjs');const root=__dirname,types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.json':'application/json; charset=utf-8'};const {compare}=require('./comparison.cjs');const port=Number(process.env.PELAGIC_PORT||8766);let busy=false;
function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(obj))}
const host = '127.0.0.1';
function allowObservationRequest(req, res) {
  const listeningPort = server.address().port;
  const allowedHosts = [`127.0.0.1:${listeningPort}`, `localhost:${listeningPort}`];
  const hosts = req.headersDistinct.host || [];
  const origins = req.headersDistinct.origin || [];
  if (hosts.length !== 1 || !allowedHosts.includes(hosts[0].toLowerCase())) {
    json(res, 403, {error: 'İstek Host başlığı reddedildi.'});
    return false;
  }
  // Local command-line clients may omit Origin, but must always supply Host.
  if (origins.length > 1 || (origins.length === 1 && !allowedHosts.some(value => origins[0] === 'http://' + value))) {
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
  if (url.pathname.startsWith('/api/') && !allowObservationRequest(req, res)) return;
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
if(!/^\/(?:index\.html|(?:css|js|assets)\/[a-zA-Z0-9_.-]+)$/.test(pathname)){res.writeHead(404).end();return}let file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data)})});

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
