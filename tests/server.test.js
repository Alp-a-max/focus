const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const {launchServer} = require('./server-helper.cjs');

function rawRequest(base, target) {
  return new Promise((resolve, reject) => {
    const request = http.get(base, {path: target}, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({status: response.statusCode, body}));
    });
    request.on('error', reject);
    request.setTimeout(3000, () => request.destroy(Error('HTTP timeout')));
  });
}

test('malformed URLs return 400 and subsequent requests still work', {timeout:15000}, async t => {
  const server = launchServer(t);
  const base = await server.ready();
  for (const target of ['/%', '/%GG', '/%E0%A4%A', '/%FF', '/%GG/../index.html', '/api/observations?bad=%FF', 'http://[bad/']) {
    const response = await rawRequest(base, target);
    assert.equal(response.status, 400, target);
    assert.equal(JSON.parse(response.body).error, 'Geçersiz istek adresi.');
    assert.equal((await fetch(base + '/')).status, 200);
    assert.deepEqual(await (await fetch(base + '/api/observations')).json(), []);
  }
});

test('occupied default port gives actionable error and alternative port works', {timeout:15000}, async t => {
  const blocker = net.createServer();
  const occupied = await new Promise((resolve, reject) => {
    blocker.once('error', error => error.code === 'EADDRINUSE' ? resolve(false) : reject(error));
    blocker.listen(8766, '127.0.0.1', () => resolve(true));
  });
  if (occupied) t.after(() => new Promise(resolve => blocker.close(resolve)));
  const failed = launchServer(t, null);
  const [code] = await failed.closed;
  assert.equal(code, 1);
  assert.match(failed.output(), /127\.0\.0\.1:8766 kullanımda/);
  assert.match(failed.output(), /PELAGIC_PORT/);
  const alternative = launchServer(t);
  const base = await alternative.ready();
  assert.notEqual(new URL(base).port, '8766');
  assert.equal((await fetch(base + '/')).status, 200);
});
