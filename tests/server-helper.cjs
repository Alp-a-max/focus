const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {once} = require('node:events');

function launchServer(t, port = '0') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'odak-http-test-'));
  const env = {...process.env, PELAGIC_DATA_DIR: dir};
  if (port === null) delete env.PELAGIC_PORT;
  else env.PELAGIC_PORT = String(port);
  const child = spawn(process.execPath, ['server.cjs'], {
    cwd: path.join(__dirname, '..'), env, stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const closed = once(child, 'close');
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await closed;
    fs.rmSync(dir, {recursive: true, force: true});
  });
  return {
    child, dir, closed, output: () => output,
    async ready() {
      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        const match = /ODAK hazır: (http:\/\/127\.0\.0\.1:\d+)/.exec(output);
        if (match) return match[1];
        if (child.exitCode !== null || child.signalCode !== null) break;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw Error('Sunucu başlatılamadı. ' + output);
    }
  };
}
module.exports = {launchServer};
