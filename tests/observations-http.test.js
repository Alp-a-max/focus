const {test}=require('node:test'),assert=require('node:assert/strict');

test('explicit photo removal and record deletion persist safely in an isolated store', async t => {
  const {launchServer} = require('./server-helper.cjs');
  const fs = require('node:fs/promises'), path = require('node:path');
  const server = launchServer(t), base = await server.ready();
  const photo = 'data:image/png;base64,' + Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64');
  const body = {lat:36.45, lon:31.3, note:'Fotoğraflı kayıt', status:'field_reported', photo};
  async function send(method, endpoint, data) {
    const response = await fetch(base + '/api/observations' + endpoint, {
      method, headers: {'Content-Type': 'application/json'}, body: data === undefined ? undefined : JSON.stringify(data)
    });
    return {status:response.status, data:await response.json()};
  }
  const first = await send('POST', '', body), second = await send('POST', '', body);
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  const id = '/' + first.data.id;
  const omitted = {...body}; delete omitted.photo;
  assert.equal((await send('PUT', id, omitted)).data.photo, photo);
  assert.equal((await send('PUT', id, {...body, photo:null})).data.photo, photo);
  const rejected = await send('PUT', id, {...body, photo:null, removePhoto:true});
  assert.equal(rejected.status, 400);
  assert.match(rejected.data.error, /fotoğraf/);
  assert.equal((await send('GET', '')).data.find(x => x.id === first.data.id).photo, photo);
  assert.equal((await send('PUT', id, {...body, removePhoto:true})).status, 400);
  const removed = await send('PUT', id, {...body, photo:null, removePhoto:true, status:'unreviewed'});
  assert.equal(removed.status, 200);
  assert.equal(removed.data.photo, null);
  assert.equal(removed.data.status, 'unreviewed');
  assert.equal((await send('PUT', id, {...omitted, status:'field_reported'})).status, 400);
  const deletion = await send('DELETE', '/' + second.data.id);
  assert.equal(deletion.status, 200);
  assert.deepEqual(deletion.data, {id:second.data.id, deleted:true});
  assert.equal((await send('DELETE', '/' + second.data.id)).status, 404);
  assert.equal((await send('PUT', '/' + second.data.id, body)).status, 404);
  const stored = JSON.parse(await fs.readFile(path.join(server.dir, 'observations.json'), 'utf8'));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, first.data.id);
  assert.equal(stored[0].photo, null);
  assert.equal(JSON.stringify(stored).includes(photo), false);
});
test('local HTTP observation API persists and updates without using project data',async t=>{const {launchServer}=require('./server-helper.cjs');const server=launchServer(t),base=await server.ready();let blocked=await fetch(base+'/api/observations',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.org'},body:'{}'});assert.equal(blocked.status,403);const photo='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64'),body={lat:36.45,lon:31.3,note:'Saha gözlemi',status:'field_reported',photo,scene:'S2_TEST',reason:'Kullanıcı seçimi'};let created=await fetch(base+'/api/observations',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});assert.equal(created.status,201);let item=await created.json();assert.equal(item.status,'field_reported');let updated=await fetch(base+'/api/observations/'+item.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,photo:null,note:'Güncellenmiş'})});assert.equal(updated.status,200);let records=await(await fetch(base+'/api/observations')).json();assert.equal(records.length,1);assert.equal(records[0].note,'Güncellenmiş');assert.equal(records[0].photo,photo)});
