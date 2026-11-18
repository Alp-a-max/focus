const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {launchServer} = require('./server-helper.cjs');

function request(base, method, target, headers, data) {
  const url = new URL(base);
  const body = data === undefined ? '' : JSON.stringify(data);
  const rawHeaders = [...headers, 'Connection', 'close'];
  if (body) rawHeaders.push('Content-Type', 'application/json', 'Content-Length', String(Buffer.byteLength(body)));
  return new Promise((resolve, reject) => {
    const req = http.request({hostname: url.hostname, port: url.port, path: target, method,
      headers: rawHeaders, setHost: false}, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { text += chunk; });
      res.on('end', () => resolve({status: res.statusCode, text}));
    });
    req.on('error', reject);
    req.setTimeout(3000, () => req.destroy(Error('HTTP timeout')));
    req.end(body);
  });
}

test('local Host and optional local Origin allow reading, creating and updating observations', {timeout:15000}, async t => {
  const server = launchServer(t);
  const base = await server.ready();
  const port = new URL(base).port;
  for (const hostname of ['127.0.0.1', 'localhost']) {
    for (const origin of [undefined, base, `http://localhost:${port}`]) {
      const headers = ['Host', `${hostname}:${port}`];
      if (origin !== undefined) headers.push('Origin', origin);
      const list = await request(base, 'GET', '/api/observations', headers);
      assert.equal(list.status, 200);
      const body = {lat:36.45, lon:31.3, note:'Yerel istemci'};
      const created = await request(base, 'POST', '/api/observations', headers, body);
      assert.equal(created.status, 201);
      const id = JSON.parse(created.text).id;
      const updated = await request(base, 'PUT', '/api/observations/' + id, headers, {...body, note:'Düzenlendi'});
      assert.equal(updated.status, 200);
      assert.equal(JSON.parse(updated.text).note, 'Düzenlendi');
      const removed = await request(base, 'DELETE', '/api/observations/' + id, headers);
      assert.equal(removed.status, 200);
    }
  }
});

test('invalid Host or Origin cannot read or change stored observations', {timeout:15000}, async t => {
  const server = launchServer(t);
  const base = await server.ready();
  const port = new URL(base).port;
  const validHost = `127.0.0.1:${port}`;
  const body = {lat:36.45, lon:31.3, note:'Korunacak kayıt'};
  const created = await request(base, 'POST', '/api/observations', ['Host', validHost], body);
  assert.equal(created.status, 201);
  const id = JSON.parse(created.text).id;
  const before = await request(base, 'GET', '/api/observations', ['Host', validHost]);
  const cases = [
    [],
    ['Host', ''],
    ['Host', `attacker.example:${port}`],
    ['Host', '127.0.0.1:1'],
    ['Host', 'localhost'],
    ['Host', `127.0.0.1.attacker.example:${port}`],
    ['Host', `localhost:${port}@attacker.example`],
    ['Host', 'attacker.example', 'Origin', base],
    ['Host', validHost, 'Host', 'attacker.example'],
    ['Host', validHost, 'Origin', 'https://example.org'],
    ['Host', validHost, 'Origin', 'null'],
    ['Host', validHost, 'Origin', ''],
    ['Host', validHost, 'Origin', 'http://localhost:1'],
    ['Host', validHost, 'Origin', `https://localhost:${port}`],
    ['Host', validHost, 'Origin', base + '/'],
    ['Host', validHost, 'Origin', base, 'Origin', base]
  ];
  for (const headers of cases) {
    for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
      const target = '/api/observations' + (['PUT', 'DELETE'].includes(method) ? '/' + id : '');
      const result = await request(base, method, target, headers, method === 'GET' ? undefined : {...body, note:'İzinsiz'});
      // Node rejects HTTP/1.1 requests with no Host before the handler runs.
      assert.equal(result.status, headers.length === 0 ? 400 : 403, `${method} ${JSON.stringify(headers)}`);
      assert.equal(result.text.includes('Korunacak kayıt'), false);
    }
    const removePhoto = await request(base, 'PUT', '/api/observations/' + id, headers,
      {...body, removePhoto: true, status: 'unreviewed'});
    assert.equal(removePhoto.status, headers.length === 0 ? 400 : 403);
  }
  const after = await request(base, 'GET', '/api/observations', ['Host', validHost]);
  assert.equal(after.status, 200);
  assert.equal(after.text, before.text);
});
