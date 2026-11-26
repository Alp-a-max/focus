/*
 * Şekil 1: Zamanla değişen çift girdap akışında Lagrange parçacık taşınımı.
 * Akış: Shadden, Lekien & Marsden (2005), Physica D 212:271–304, Lagrangian coherent structures test akışı.
 *   ψ(x,y,t) = A sin(π f(x,t)) sin(π y),  f(x,t) = a(t) x² + b(t) x,  a = ε sin ωt,  b = 1 − 2ε sin ωt
 *   u = −∂ψ/∂y,  v = ∂ψ/∂x,  alan [0,2]×[0,1]
 * Parçacık hızı: u_p = u_akıntı + α·u_rüzgâr (rüzgâr sürüklenme katsayısı α, bkz. yontem.html).
 * Entegrasyon: 4. derece Runge–Kutta. Gösterim amaçlıdır; gerçek deniz verisi kullanılmaz.
 */
(()=>{
 'use strict';
 const canvas=document.getElementById('flowCanvas');
 if(!canvas)return;
 const ctx=canvas.getContext('2d');
 const A=0.1,EPS=0.25,OMEGA=2*Math.PI/10,DT=0.08,N=320,MAX_STEPS=900;
 const WIND=[2.4,1.1]; // birimsiz, doğu-kuzeydoğu yönlü sabit rüzgâr
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let alpha=0.01,t=0,steps=0,particles=[],release=[0.93,0.55],W=0,H=0,dpr=1,bg=null,running=false,visible=true,colors={};

 function velocity(x,y,time){
  const s=EPS*Math.sin(OMEGA*time),a=s,b=1-2*s,f=a*x*x+b*x,df=2*a*x+b;
  const u=-Math.PI*A*Math.sin(Math.PI*f)*Math.cos(Math.PI*y);
  const v=Math.PI*A*Math.cos(Math.PI*f)*Math.sin(Math.PI*y)*df;
  return [u+alpha*WIND[0],v+alpha*WIND[1]];
 }
 function rk4(p,time){
  const k1=velocity(p[0],p[1],time);
  const k2=velocity(p[0]+k1[0]*DT/2,p[1]+k1[1]*DT/2,time+DT/2);
  const k3=velocity(p[0]+k2[0]*DT/2,p[1]+k2[1]*DT/2,time+DT/2);
  const k4=velocity(p[0]+k3[0]*DT,p[1]+k3[1]*DT,time+DT);
  return [p[0]+DT*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6,p[1]+DT*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6];
 }
 // Deterministik tohum: her bırakış aynı başlangıç bulutunu üretir.
 function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}}
 function seed(){
  const rnd=seeded(42);particles=[];t=0;steps=0;
  for(let i=0;i<N;i++){const r=0.035*Math.sqrt(rnd()),th=2*Math.PI*rnd();particles.push({p:[release[0]+r*Math.cos(th),release[1]+r*Math.sin(th)],beached:false})}
 }
 const toPx=p=>[p[0]/2*W,(1-p[1])*H];

 function readColors(){
  const cs=getComputedStyle(document.documentElement);
  colors={shoal:cs.getPropertyValue('--shoal').trim(),iso:cs.getPropertyValue('--isobath').trim(),marker:cs.getPropertyValue('--marker').trim(),ink:cs.getPropertyValue('--ink').trim(),paper:cs.getPropertyValue('--paper').trim()};
 }
 // Ortalama akım fonksiyonunun (ε=0) eş değer eğrileri: marching squares.
 function drawBackground(){
  bg=document.createElement('canvas');bg.width=W*dpr;bg.height=H*dpr;
  const g=bg.getContext('2d');g.scale(dpr,dpr);g.fillStyle=colors.shoal;g.fillRect(0,0,W,H);
  const nx=120,ny=60,psi=(x,y)=>A*Math.sin(Math.PI*x)*Math.sin(Math.PI*y),grid=[];
  for(let j=0;j<=ny;j++){grid[j]=[];for(let i=0;i<=nx;i++)grid[j][i]=psi(2*i/nx,j/ny)}
  g.strokeStyle=colors.iso;g.lineWidth=1;
  const levels=[-.09,-.07,-.05,-.03,-.012,.012,.03,.05,.07,.09];
  const lerp=(a,b,va,vb,l)=>a+(b-a)*((l-va)/(vb-va));
  for(const l of levels){
   g.globalAlpha=Math.abs(l)>.06?.55:.85;g.beginPath();
   for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const x0=2*i/nx,x1=2*(i+1)/nx,y0=j/ny,y1=(j+1)/ny,a=grid[j][i],b=grid[j][i+1],c=grid[j+1][i+1],d=grid[j+1][i];
    const pts=[];
    if((a<l)!==(b<l))pts.push([lerp(x0,x1,a,b,l),y0]);
    if((b<l)!==(c<l))pts.push([x1,lerp(y0,y1,b,c,l)]);
    if((c<l)!==(d<l))pts.push([lerp(x1,x0,c,d,l),y1]);
    if((d<l)!==(a<l))pts.push([x0,lerp(y1,y0,d,a,l)]);
    for(let k=0;k+1<pts.length;k+=2){const p=toPx(pts[k]),q=toPx(pts[k+1]);g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1])}
   }
   g.stroke();
  }
  g.globalAlpha=1;
  // Ölçek çubuğu yerine birim notu
  g.fillStyle=colors.ink;g.globalAlpha=.65;g.font='12px "Public Sans",sans-serif';
  g.fillText(window.FocusSite?.t('Eş değer eğrileri: ortalama akım fonksiyonu ψ','Contours: mean stream function ψ')??'',12,H-12);
  g.globalAlpha=1;
 }
 function resize(){
  const r=canvas.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);W=Math.max(1,r.width);H=Math.max(1,r.height);
  canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);readColors();drawBackground();redrawStatic();
 }
 let trail=null;
 function freshTrail(){trail=document.createElement('canvas');trail.width=W*dpr;trail.height=H*dpr;trail.getContext('2d').scale(dpr,dpr)}
 function stepOnce(tc){
  tc.strokeStyle=colors.marker;tc.lineWidth=1;tc.globalAlpha=.4;tc.beginPath();
  for(const q of particles){
   if(q.beached)continue;
   const n=rk4(q.p,t);
   if(n[0]<=0||n[0]>=2||n[1]<=0||n[1]>=1){q.beached=true;n[0]=Math.min(2,Math.max(0,n[0]));n[1]=Math.min(1,Math.max(0,n[1]))}
   const a=toPx(q.p),b=toPx(n);tc.moveTo(a[0],a[1]);tc.lineTo(b[0],b[1]);q.p=n;
  }
  tc.stroke();tc.globalAlpha=1;t+=DT;steps++;
 }
 function compose(){
  ctx.clearRect(0,0,W,H);ctx.drawImage(bg,0,0,W,H);ctx.drawImage(trail,0,0,W,H);
  ctx.fillStyle=colors.ink;
  for(const q of particles){const a=toPx(q.p);ctx.globalAlpha=q.beached?.9:.8;ctx.fillRect(a[0]-.8,a[1]-.8,q.beached?2.6:1.6,q.beached?2.6:1.6)}
  ctx.globalAlpha=1;const r=toPx(release);
  ctx.strokeStyle=colors.marker;ctx.lineWidth=2;ctx.beginPath();ctx.arc(r[0],r[1],7,0,2*Math.PI);ctx.stroke();
  ctx.beginPath();ctx.moveTo(r[0]-11,r[1]);ctx.lineTo(r[0]+11,r[1]);ctx.moveTo(r[0],r[1]-11);ctx.lineTo(r[0],r[1]+11);ctx.stroke();
  const out=document.getElementById('flowStatus');
  if(out){const beached=particles.filter(q=>q.beached).length;out.textContent=window.FocusSite.t(`Model zamanı t = ${t.toFixed(1).replace('.',',')} · kıyıya ulaşan: ${beached}/${N}`,`Model time t = ${t.toFixed(1)} · reached the boundary: ${beached}/${N}`)}
 }
 function redrawStatic(){
  if(!bg)return;freshTrail();const keep=particles.map(q=>({p:[...q.p],beached:q.beached})),tt=t,ss=steps;
  seed();const tc=trail.getContext('2d');const target=reduced?MAX_STEPS*0.6:ss;
  for(let i=0;i<target;i++)stepOnce(tc);
  if(!reduced){particles=keep;t=tt;steps=ss}
  compose();
 }
 function frame(){
  if(!running)return;
  if(visible&&!document.hidden){
   const tc=trail.getContext('2d');
   stepOnce(tc);
   if(steps>=MAX_STEPS){seed();freshTrail()}
   compose();
  }
  requestAnimationFrame(frame);
 }
 function restart(){seed();freshTrail();if(reduced){redrawStatic()}else compose()}

 canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();release=[(e.clientX-r.left)/r.width*2,1-(e.clientY-r.top)/r.height];restart()});
 document.querySelectorAll('[data-windage]').forEach(b=>b.addEventListener('click',()=>{
  alpha=Number(b.dataset.windage);document.querySelectorAll('[data-windage]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));restart();
 }));
 document.getElementById('flowRestart')?.addEventListener('click',restart);
 document.addEventListener('focus:theme',()=>{readColors();drawBackground();restart()});
 document.addEventListener('focus:language',()=>{if(bg){drawBackground();compose()}});
 new IntersectionObserver(es=>{visible=es[0].isIntersecting}).observe(canvas);
 let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{resize();restart()},150)});

 function init(){resize();seed();freshTrail();if(reduced){redrawStatic()}else{running=true;compose();requestAnimationFrame(frame)}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
