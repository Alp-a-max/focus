const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {launchServer}=require('./server-helper.cjs');
function request(url,headers) {return new Promise((resolve,reject)=>{
  const req=http.get(url,{headers},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);
});}
test('satellite processing endpoints reject foreign Host and Origin before starting analysis',async t=>{
  const local=launchServer(t),base=await local.ready();
  for(const endpoint of ['/api/satellite/analysis','/api/satellite/comparison']) {
    assert.equal(await request(base+endpoint,{}),400);
    assert.equal(await request(base+endpoint,{Origin:'https://foreign.example'}),403);
    assert.equal(await request(base+endpoint,{Host:'foreign.example'}),403);
  }
});
