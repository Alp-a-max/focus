const {test,expect}=require('@playwright/test');require('./experience-fixture.cjs')(test);const {initial}=require('../tools/refresh-monitor.cjs');
function feed(){const f=initial(),r=f.regions[0],observed=new Date(Date.now()-2*3600000).toISOString();r.status='ready';r.checked_at=new Date().toISOString();r.result={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[r.lon,r.lat]},properties:{candidate_id:'dated-candidate',scene_id:'S2_DATED_SOURCE',observed_at:observed,grid_pixels:5,max_score:.8,status:'unverified_model_candidate'}}],metadata:{schema_version:1,model_id:'unetpp12',scene_id:'S2_DATED_SOURCE',model_sha256:'a'.repeat(64),checkpoint_sha256:'b'.repeat(64),source:'https://doi.org/10.1016/j.isci.2023.108402',observed_at:observed,retrieved_at:new Date().toISOString(),threshold:.1,eligible_pixels:10000,excluded_pixels:0,candidate_clusters:1,score_kind:'uncalibrated neural-network score',validation_status:'research_only',query:{lat:r.lat,lon:r.lon}}};return f;}
async function weather(page){await page.route('**/v1/{marine,forecast}?*',route=>{
 const u=new URL(route.request().url()),marine=u.pathname.includes('marine'),speed=marine?'ocean_current_velocity':'wind_speed_10m',direction=marine?'ocean_current_direction':'wind_direction_10m',lats=u.searchParams.get('latitude').split(','),lons=u.searchParams.get('longitude').split(',');
 const start=Math.floor((Date.now()-48*3600000)/3600000)*3600000,time=Array.from({length:120},(_,i)=>new Date(start+i*3600000).toISOString().slice(0,16));
 const out=lats.map((lat,i)=>({latitude:+lat,longitude:+lons[i],utc_offset_seconds:0,current:{time:new Date(Math.floor(Date.now()/3600000)*3600000).toISOString().slice(0,16),wave_height:1,sea_surface_temperature:20,[speed]:0,[direction]:90},current_units:{[speed]:'km/h',[direction]:'°'},hourly_units:{[speed]:'km/h',[direction]:'°'},hourly:{time,[speed]:time.map(()=>0),[direction]:time.map(()=>90)}}));
 return route.fulfill({json:out.length===1?out[0]:out});});}
test('dated model trajectory requires its own explicit assumption and exports original observation plus historical fields',async({page})=>{
 const f=feed();await weather(page);await page.route('**/assets/monitor-feed.json',r=>r.fulfill({json:f}));await page.route('**/api/observations',r=>r.fulfill({json:[]}));await page.goto('/platform.html');
 await page.locator('.monitor-card').filter({hasText:'Karadeniz'}).getByRole('button',{name:'Sonucu haritada aç'}).click();await page.locator('#detectionList button').click();
 await expect(page.locator('#trackingRun')).toBeDisabled();await page.locator('#trackingConsent').check();await page.locator('#trackingRun').click();await expect(page.locator('#trackingExport')).toBeEnabled({timeout:15000}).catch(async e=>{throw Error((await page.locator('#trackingStatus').innerText())+' | checked='+await page.locator('#trackingConsent').isChecked()+' | '+e.message);});
 await expect(page.locator('#trackingResults')).toContainText('24 saatlik tahmine ulaştı');await expect(page.locator('#detectionAssume')).not.toBeChecked();
 const download=page.waitForEvent('download');await page.locator('#trackingExport').click();const file=await (await download).path(),data=JSON.parse(require('node:fs').readFileSync(file,'utf8'));
 expect(data.observation_source.observed_at).toBe(f.regions[0].result.metadata.observed_at);expect(data.observational_tracking).toBe(false);expect(data.historical_advection).toBe(true);expect(data.scenarios).toHaveLength(3);expect(data.environment_sources.length).toBeGreaterThan(0);
 await page.locator('#trackingConsent').uncheck();await expect(page.locator('#trackingExport')).toBeDisabled();
});
test('GitHub Pages mode reads public results and runs dated drift without calling the unavailable detection server',async({page,baseURL})=>{
 const f=feed();let inference=0;await weather(page);
 await page.route('https://alp-a-max.github.io/focus/**',async route=>{
  const u=new URL(route.request().url()),p=u.pathname.replace('/focus','');if(p.startsWith('/api/')){if(p.includes('detection'))inference++;return route.fulfill({status:404,body:'static host'});}
  const response=await page.request.get(baseURL+(p||'/')+u.search);return route.fulfill({response});
 });
 await page.route(url=>url.hostname==='raw.githubusercontent.com'&&url.pathname==='/Alp-a-max/focus/main/assets/monitor-feed.json',r=>r.fulfill({json:f}));
 await page.goto('https://alp-a-max.github.io/focus/platform.html');await expect(page.locator('body')).toHaveClass(/public-feed-mode/);await expect(page.locator('#analysisPanel')).toBeHidden();await expect(page.locator('#detectionRun')).toBeDisabled();
 await page.locator('.monitor-card').filter({hasText:'Karadeniz'}).getByRole('button',{name:'Sonucu haritada aç'}).click();await page.locator('#detectionList button').click();await page.locator('#trackingConsent').check();await page.locator('#trackingRun').click();await expect(page.locator('#trackingExport')).toBeEnabled({timeout:15000}).catch(async e=>{throw Error((await page.locator('#trackingStatus').innerText())+' | checked='+await page.locator('#trackingConsent').isChecked()+' | '+e.message);});expect(inference).toBe(0);
});
