/* Monthly refresh while the local server is running. Never blocks page requests. */
const {spawn} = require('node:child_process');
const path = require('node:path');
function startCygnssUpdates() {
  let running = false;
  function check() {
    if (running) return;
    running = true;
    const executable = process.env.ODAK_PYTHON || (process.platform === 'win32' ? 'py' : 'python3');
    const args = /^py(?:\.exe)?$/i.test(path.basename(executable)) ? ['-3'] : [];
    args.push(path.join(__dirname, 'tools', 'update_cygnss.py'));
    const child = spawn(executable, args, {cwd: __dirname, windowsHide: true,
      env: {...process.env, PYTHONDONTWRITEBYTECODE: '1'}, stdio: 'ignore'});
    const timeout = setTimeout(() => child.kill(), 300000);
    timeout.unref();
    const done = () => {clearTimeout(timeout); running = false;};
    child.once('error', () => {
      console.warn('CYGNSS kontrolü başlatılamadı. Yerel Python yapılandırmasını kontrol edin.');
      done();
    });
    child.once('close', code => {
      if (code) console.warn('CYGNSS kontrolü tamamlanamadı. Son sağlam veri korunuyor; veri durumunu inceleyin.');
      done();
    });
    child.unref();
  }
  check();
  const timer = setInterval(check, 6 * 60 * 60 * 1000);
  timer.unref();
}
module.exports = {startCygnssUpdates};
