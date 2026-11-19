const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {launchServer}=require('./server-helper.cjs');
const {search}=require('../js/map-search.js'),plans=require('../js/plans.js');
function request(url,headers={}){return new Promise((resolve,reject)=>{http.get(url,{headers},r=>{let body='';r.setEncoding('utf8');r.on('data',x=>body+=x);r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body}));}).on('error',reject);});}
test('public health is readable from the named local preview; records and processing remain protected',async t=>{
 const local=launchServer(t),base=await local.ready();
 const result=await request(base+'/api/health',{Origin:'http://127.0.0.1:5500'});
 assert.equal(result.status,200);assert.equal(result.headers['access-control-allow-origin'],'http://127.0.0.1:5500');
 assert.equal(JSON.parse(result.body).service,'focus-local-api');
 assert.equal((await request(base+'/api/health',{Origin:'https://foreign.example'})).status,403);
 assert.equal((await request(base+'/api/observations',{Origin:'http://127.0.0.1:5500'})).status,403);
 assert.equal((await request(base+'/api/satellite/analysis',{Origin:'http://127.0.0.1:5500'})).status,403);
 assert.equal((await request(base+'/platform.html')).status,200);
 assert.equal((await request(base+'/package.json')).status,404);
});
test('map search handles Turkish names and coordinates without inventing debris detections',()=>{
 assert.equal(search('karadeniz')[0].lat,41.6);assert.equal(search('İSTANBUL')[0].name,'Marmara Denizi');
 assert.deepEqual(search('41.6, 30.9')[0],{name:'Seçilen koordinat',lat:41.6,lon:30.9});
 assert.equal(search('not-a-known-location').length,0);assert.throws(()=>search('91,30'));
});
test('approved prices are annual USD, with sales disabled until real account and payment setup',()=>{
 assert.equal(plans.currency,'USD');assert.equal(plans.billing,'year');assert.equal(plans.salesEnabled,false);
 assert.deepEqual(plans.plans.map(p=>p.annualPrice),[0,20,100]);
});
