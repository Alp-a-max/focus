'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),runtime=path.join(root,'.demo-tools'),config=path.join(root,'assets/public-api.json');
async function healthy(origin){try{const r=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(7000)});const h=await r.json();return r.ok&&h.service==='focus-public-api'&&h.detection?.available;}catch{return false;}}
function background(binary,args,log){const out=fs.openSync(path.join(runtime,log+'.log'),'a');const child=spawn(binary,args,{cwd:root,detached:true,windowsHide:true,stdio:['ignore',out,out]});child.on('error',e=>console.error(e.message));child.unref();fs.closeSync(out);return child.pid;}
(async()=>{
 fs.mkdirSync(runtime,{recursive:true});
 const previous=JSON.parse(fs.readFileSync(config,'utf8'));if(previous.origin&&await healthy(previous.origin)){console.log('Demo already online: https://alp-a-max.github.io/focus/platform.html?demo=1');return;}
 const binary=process.env.FOCUS_CLOUDFLARED||path.join(runtime,'cloudflared.exe');if(!fs.existsSync(binary))throw Error('Official cloudflared executable required at '+binary);
 if(!await healthy('http://127.0.0.1:8780'))background(process.execPath,['tools/public-api.cjs'],'api');
 const log='tunnel-'+Date.now();background(binary,['tunnel','--url','http://127.0.0.1:8780','--protocol','http2','--no-autoupdate'],log);
 let origin;for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,1000));const file=path.join(runtime,log+'.log');const text=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';origin=text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];if(origin&&await healthy(origin))break;}
 if(!origin||!await healthy(origin))throw Error('Demo tunnel did not become healthy. Check .demo-tools logs.');
 fs.writeFileSync(config,JSON.stringify({schema_version:1,origin,mode:'temporary-demo',requires_host_computer:true})+'\n');
 // --only commits this public endpoint, never pre-staged user files.
 execFileSync('git',['add','--','assets/public-api.json'],{cwd:root,stdio:'inherit'});
 execFileSync('git',['commit','--only','-m','Reconnect temporary jury inference service','--','assets/public-api.json'],{cwd:root,stdio:'inherit'});
 execFileSync('git',['push','origin','main'],{cwd:root,stdio:'inherit'});
 console.log('Demo endpoint published. Keep this computer awake and connected. Jury URL: https://alp-a-max.github.io/focus/platform.html?demo=1');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
