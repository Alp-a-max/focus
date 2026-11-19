/* Local-only entry point. Existing servers are reused; none are terminated. */
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const port=Number(process.env.PELAGIC_PORT||8772),origin='http://127.0.0.1:'+port;
async function openBrowser(){
  if(!process.argv.includes('--open'))return;
  const brave=path.join(process.env.PROGRAMFILES||'C:\\Program Files','BraveSoftware','Brave-Browser','Application','brave.exe');
  if(fs.existsSync(brave)){const child=spawn(brave,[origin],{detached:true,stdio:'ignore',windowsHide:true});child.unref();}
}
(async()=>{
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('Geçerli bir PELAGIC_PORT seçin.');
  let ready=false;
  try{const r=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(1500)});const data=await r.json();ready=r.ok&&data.service==='focus-local-api';}catch{}
  if(ready){console.log('FOCUS hazır: '+origin);await openBrowser();return;}
  const child=spawn(process.execPath,[path.join(__dirname,'..','server.cjs')],{cwd:path.join(__dirname,'..'),
    env:{...process.env,PELAGIC_PORT:String(port)},windowsHide:true,stdio:['inherit','pipe','inherit']});
  child.stdout.on('data',async chunk=>{process.stdout.write(chunk);if(String(chunk).includes('ODAK hazır:'))await openBrowser();});
  child.once('error',()=>{console.error('FOCUS başlatılamadı. Node.js kurulumunu kontrol edin.');process.exitCode=1;});
  child.once('exit',code=>{process.exitCode=code||0;});
})().catch(error=>{console.error(error.message);process.exitCode=1;});
