const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const fs=require('node:fs'),path=require('node:path');
const {launchServer}=require('./server-helper.cjs');
const preload=path.join(__dirname,'detection-preload.cjs');
const start=(t,mode='normal')=>launchServer(t,'0',{preload,env:{FOCUS_TEST_DETECT_MODE:mode}});
const calls=server=>{try{return fs.readFileSync(path.join(server.dir,'detection-calls.txt'),'utf8')}catch{return ''}};
async function waitFor(check){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,5))}throw Error('Expected worker event not observed');}
const raw=(url,headers)=>new Promise((resolve,reject)=>{const req=http.get(url,{headers},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});req.on('error',reject)});

test('detection and readiness require local Host and Origin; health alone allows static preview',async t=>{
  const server=start(t),base=await server.ready(),port=new URL(base).port;
  for(const endpoint of ['/api/detection/status','/api/satellite/detection?lat=41.6&lon=30.9']){
    for(const headers of [{Host:'foreign.example'},{Host:'localhost:5500'},{Origin:'https://foreign.example'},{Origin:'null'},{Origin:'http://127.0.0.1:5500'},{Origin:'http://localhost:5500'}])assert.equal(await raw(base+endpoint,headers),403);
  }
  assert.equal(calls(server),'');
  for(const host of ['localhost','127.0.0.1']){
    assert.equal(await raw(base+'/api/detection/status',{Host:host+':'+port}),200);
    assert.equal(await raw(base+'/api/satellite/detection?lat=41.6&lon=30.9',{Host:host+':'+port,Origin:'http://'+host+':'+port}),200);
  }
  const health=await fetch(base+'/api/health',{headers:{Origin:'http://127.0.0.1:5500'}}),body=await health.json();
  assert.equal(health.status,200);assert.equal(body.features.detection,true);assert.equal(body.detection.validation_status,'research_only');
  assert.equal(health.headers.get('access-control-allow-origin'),'http://127.0.0.1:5500');
  assert.equal((await fetch(base+'/api/detection/status')).headers.get('access-control-allow-origin'),null);
});
test('invalid coordinates and methods never call the model; real-shaped result preserves metadata',async t=>{
  const server=start(t),base=await server.ready();
  for(const query of ['', '?lat=&lon=0','?lat=NaN&lon=0','?lat=Infinity&lon=0','?lat=80&lon=0','?lat=0&lon=180','?lat=1&lat=2&lon=0','?lat=1&lon=0&lon=2']){
    const r=await fetch(base+'/api/satellite/detection'+query);assert.equal(r.status,400);assert.equal((await r.json()).code,'INVALID_COORDINATES');
  }
  for(const endpoint of ['/api/detection/status','/api/satellite/detection?lat=1&lon=2'])assert.equal((await fetch(base+endpoint,{method:'POST'})).status,405);
  assert.equal(calls(server),'');
  const r=await fetch(base+'/api/satellite/detection?lat=0&lon=0'),data=await r.json();
  assert.equal(r.status,200);assert.equal(data.type,'FeatureCollection');assert.equal(data.metadata.observed_at,'2026-10-22T08:58:00Z');assert.deepEqual(data.metadata.query,{lat:0,lon:0});
});
for(const [mode,status,code] of [['unavailable',503,'MODEL_UNAVAILABLE'],['provider',502,'DETECTION_FAILED'],['timeout',504,'DETECTION_TIMEOUT'],['inference-timeout',504,'DETECTION_TIMEOUT']]){
  test(`detector ${mode} gives safe actionable JSON and the server remains responsive`,async t=>{
    const server=start(t,mode),base=await server.ready(),r=await fetch(base+'/api/satellite/detection?lat=41&lon=30'),body=await r.json();
    assert.equal(r.status,status);assert.equal(body.code,code);assert.equal(JSON.stringify(body).includes('private-provider-debug-details'),false);
    assert.equal((await fetch(base+'/platform.html')).status,200);assert.equal((await fetch(base+'/api/detection/status')).status,200);
    if(mode==='timeout')assert.match(calls(server),/aborted/);
    if(mode==='unavailable'){assert.equal(calls(server),'');assert.equal((await (await fetch(base+'/api/health')).json()).features.detection,false)}
  });
}
test('shared busy lock covers analysis, comparison and detection, including a timed-out worker still stopping',async t=>{
  const server=start(t,'ignore-abort'),base=await server.ready();
  const running=fetch(base+'/api/satellite/detection?lat=41&lon=30');await waitFor(()=>calls(server).includes('started'));
  for(const endpoint of ['analysis','comparison','detection'])assert.equal((await fetch(base+'/api/satellite/'+endpoint+'?lat=41&lon=30')).status,429);
  assert.equal((await running).status,504);
  assert.equal((await fetch(base+'/api/satellite/analysis?lat=41&lon=30')).status,429);
  await new Promise(r=>setTimeout(r,170));
  const analysis=fetch(base+'/api/satellite/analysis?lat=41&lon=30');await waitFor(()=>calls(server).includes('analysis'));
  assert.equal((await fetch(base+'/api/satellite/detection?lat=41&lon=30')).status,429);assert.equal((await analysis).status,200);
});
test('disconnect aborts the worker and releases the lock without touching user records',async t=>{
  const server=start(t,'slow'),base=await server.ready();
  const req=http.get(base+'/api/satellite/detection?lat=41&lon=30');req.on('error',()=>{});
  await waitFor(()=>calls(server).includes('started'));req.destroy();await waitFor(()=>calls(server).includes('aborted'));
  await new Promise(r=>setTimeout(r,5));
  assert.equal((await fetch(base+'/api/satellite/analysis?lat=41&lon=30')).status,200);
  assert.deepEqual(await (await fetch(base+'/api/observations')).json(),[]);
});
