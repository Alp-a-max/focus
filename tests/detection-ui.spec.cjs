const {test,expect}=require('@playwright/test');
const {openTool}=require('./workspace-helpers.cjs');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
require('./experience-fixture.cjs')(test);
function sample(lat=36.45,lon=31.3,{empty=false,scene='S2_TEST_20261022',model='test-unetpp12'}={}){
  const metadata={schema_version:1,model_id:model,model_sha256:'a'.repeat(64),checkpoint_sha256:'b'.repeat(64),
    source:'https://doi.org/10.1016/j.isci.2023.108402',scene_id:scene,observed_at:'2026-10-22T08:58:00Z',retrieved_at:'2026-11-19T09:00:00Z',
    scene_cloud_percent:12.3,observation_age_hours:672,query:{lat,lon},contract:{schema:'focus-russwurm2023-l2a12-v1'},
    grid:{epsg:32636,width:100,height:100,transform:[10,0,300000,0,-10,4600000]},score_kind:'uncalibrated neural-network score',
    threshold:.5,eligible_pixels:empty?0:9800,excluded_pixels:empty?10000:200,above_threshold_pixels:empty?0:12,
    candidate_clusters:empty?0:2,truncated:false,validation_status:'research_only',mask:'test mask',warnings:['research only']};
  return {type:'FeatureCollection',metadata,features:empty?[]:[0,1].map((n)=>({type:'Feature',geometry:{type:'Point',coordinates:[lon+n*.01,lat+n*.01]},
    properties:{candidate_id:'candidate-'+n,observed_at:metadata.observed_at,scene_id:scene,grid_pixels:6,max_score:.8,status:'unverified_model_candidate'}}))};
}
async function setup(page){
  let fields=0;
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/api/observations',r=>r.fulfill({json:[]}));
  await page.route('**/api/detection/status',r=>r.fulfill({json:{available:true,model_id:'test-unetpp12',validation_status:'research_only'}}));
  await page.route('**/v1/{marine,forecast}?*',route=>{
    const u=new URL(route.request().url()),marine=u.pathname.includes('marine');if(!u.searchParams.has('current'))fields++;
    const time=Array.from({length:72},(_,i)=>new Date(Math.floor(Date.now()/3600000)*3600000+i*3600000).toISOString().slice(0,16));
    const sk=marine?'ocean_current_velocity':'wind_speed_10m',dk=marine?'ocean_current_direction':'wind_direction_10m';
    const lats=u.searchParams.get('latitude').split(','),lons=u.searchParams.get('longitude').split(',');
    const data=lats.map((lat,i)=>({latitude:+lat,longitude:+lons[i],utc_offset_seconds:0,current:{time:time[0],[sk]:marine?1:10,[dk]:marine?90:180,wave_height:.6,sea_surface_temperature:20},
      current_units:{[sk]:'km/h',[dk]:'°'},hourly_units:{[sk]:'km/h',[dk]:'°'},hourly:{time,[sk]:time.map(()=>marine?1:10),[dk]:time.map(()=>marine?90:180)}}));
    return route.fulfill({json:data.length===1?data[0]:data});
  });
  await page.goto('/platform.html#intelligence');await openTool(page,'satellite');
  await expect(page.locator('#detectionRun')).toBeVisible();return ()=>fields;
}
const routeSample=page=>page.route('**/api/satellite/detection?*',r=>{const u=new URL(r.request().url());return r.fulfill({json:sample(+u.searchParams.get('lat'),+u.searchParams.get('lon'))})});
async function downloadJson(page,selector){if(selector==='#detectionExport')await openTool(page,'satellite');const pending=page.waitForEvent('download');await page.locator(selector).click();const download=await pending;return JSON.parse(await fs.readFile(await download.path(),'utf8'))}

test('dated candidates require explicit current-start assumption; scenario and GeoJSON retain provenance',async({page})=>{
  await routeSample(page);const fields=await setup(page);
  await page.locator('#detectionRun').focus();await page.keyboard.press('Enter');
  await expect(page.locator('.detection-candidate')).toHaveCount(2);
  await expect(page.locator('#detectionDates')).toContainText('22 Eki 2026');
  await expect(page.locator('#detectionDates')).toContainText('doi.org/10.1016');
  await page.locator('#detectionList button').nth(1).focus();await page.keyboard.press('Enter');
  await expect(page.locator('#detectionAssume')).toBeFocused();
  await expect(page.locator('#coord')).toHaveValue('36.4600° N / 31.3100° E');
  await expect(page.locator('#ensembleRun')).toBeDisabled();await expect(page.locator('#detectionForecast')).toBeDisabled();
  await expect(page.locator('#predictBtn')).toBeDisabled();expect(fields()).toBe(0);
  const before=await downloadJson(page,'#detectionExport');expect(before.metadata.forecast_assumption).toBeNull();
  expect(before.metadata.observed_at).toBe(sample().metadata.observed_at);
  await page.locator('#detectionAssume').check();await expect(page.locator('#ensembleRun')).toBeDisabled();
  await page.locator('#detectionForecast').click();await expect(page).toHaveURL(/#laboratory/);
  expect(fields()).toBe(0);await page.locator('#ensembleRun').click();await expect(page.locator('.ensemble-particle')).toHaveCount(75);
  for(const hour of ['12','24']){await page.locator('[data-ensemble-hour="'+hour+'"]').click();await expect(page.locator('#ensembleStatus')).toContainText(hour+' saat')}
  await expect(page.locator('#ensembleObservation')).toContainText('22 Eki 2026');
  await expect(page.locator('#ensembleObservation')).toContainText('güncel başlangıç varsayıldı');
  const forecast=await downloadJson(page,'#ensembleExport'),geojson=await downloadJson(page,'#detectionExport');
  expect(forecast.observation_source).toMatchObject({candidate_id:'candidate-1',observed_at:sample().metadata.observed_at,scene_id:'S2_TEST_20261022',source:sample().metadata.source,model_id:'test-unetpp12'});
  expect(forecast.observation_source.geometry.coordinates).toEqual([31.310000000000002,36.46]);
  expect(forecast.assumptions.current_start).toEqual(geojson.metadata.forecast_assumption);
  expect(forecast.assumptions.historical_tracking).toBe(false);expect(forecast.start_time).not.toBe(forecast.observation_source.observed_at);
  await openTool(page,'satellite');await page.locator('#detectionAssume').uncheck();await expect(page.locator('#ensembleRun')).toBeDisabled();await expect(page.locator('.ensemble-particle')).toHaveCount(0);
  await expect(page.locator('#ensembleExport')).toBeDisabled();
});
test('empty and masked results are not presented as a clean sea; layer clear and location changes work independently',async({page})=>{
  let empty=true;
  await page.route('**/api/satellite/detection?*',r=>r.fulfill({json:sample(36.45,31.3,{empty})}));await setup(page);
  await page.locator('#detectionRun').click();await expect(page.locator('#detectionStatus')).toHaveText('Aday bulunmadı; atık yok anlamına gelmez.');
  await expect(page.locator('#detectionCoverage')).toContainText('Geçerli su pikseli yok');
  await expect(page.locator('.detection-candidate')).toHaveCount(0);expect((await downloadJson(page,'#detectionExport')).metadata.excluded_pixels).toBe(10000);
  empty=false;await page.locator('#detectionRun').click();await expect(page.locator('.detection-candidate')).toHaveCount(2);
  await page.locator('#detectionClear').click();await expect(page.locator('.detection-candidate')).toHaveCount(0);await expect(page.locator('#detectionExport')).toBeDisabled();
  await page.locator('#detectionRun').click();await expect(page.locator('.detection-candidate')).toHaveCount(2);
  await page.locator('#detectionList button').first().click();await openTool(page,'conditions');await page.locator('button[data-name="Karadeniz"]').click();
  await expect(page.locator('#detectionList button')).toHaveCount(0);await expect(page.locator('#ensembleObservation')).not.toBeVisible();
  await expect(page.locator('#detectionOrigin')).toContainText('41.6000');
});
for(const [code,status,copy] of [['MODEL_UNAVAILABLE',503,'hazır değil'],['ANALYSIS_BUSY',429,'Başka bir analiz'],['DETECTION_TIMEOUT',504,'zaman aşımına'],['DETECTION_FAILED',502,'işlenemedi'],['NO_USABLE_SCENE',422,'uygun Sentinel-2 görüntüsü bulunamadı'],['HTML',200,'Tam çalışma alanını'],['JSON',200,'doğrulanamadı'],['INVALID',200,'doğrulanamadı']]){
  test(`failure ${code} is understandable and can be retried without fake candidates`,async({page})=>{
    let fail=true;await page.route('**/api/satellite/detection?*',r=>{
      if(!fail)return r.fulfill({json:sample()});
      if(code==='HTML')return r.fulfill({contentType:'text/html',body:'<html>offline</html>'});
      if(code==='JSON')return r.fulfill({contentType:'application/json',body:'{"incomplete":'});
      if(code==='INVALID'){const data=sample();data.features[0].properties.observed_at='2020-01-01';return r.fulfill({json:data})}
      return r.fulfill({status,json:{code,error:'<img src=x onerror="window.pwned=1">'}});
    });await setup(page);await page.locator('#detectionRun').click();await expect(page.locator('#detectionStatus')).toContainText(copy);
    await expect(page.locator('.detection-candidate')).toHaveCount(0);await expect(page.locator('#detectionRun')).toBeEnabled();
    fail=false;await page.locator('#detectionRun').click();await expect(page.locator('.detection-candidate')).toHaveCount(2);
    expect(await page.evaluate(()=>window.pwned)).toBeUndefined();
  });
}
test('cancelled and obsolete responses cannot replace a later location or clear its busy state',async({page})=>{
  let release,started;const start=new Promise(r=>started=r),hold=new Promise(r=>release=r);let requests=0;
  await page.route('**/api/satellite/detection?*',async r=>{
    requests++;const u=new URL(r.request().url()),data=sample(+u.searchParams.get('lat'),+u.searchParams.get('lon'),{scene:requests===1?'OLD_SCENE':'NEW_SCENE'});
    if(requests===1){started();await hold;}
    await r.fulfill({json:data}).catch(()=>{});
  });await setup(page);await page.locator('#detectionRun').click();await start;
  await expect(page.locator('#detectionRun')).toBeDisabled();await page.locator('#detectionClear').click();
  await openTool(page,'conditions');await page.locator('button[data-name="Karadeniz"]').click();await openTool(page,'satellite');await page.locator('#detectionRun').click();
  await expect(page.locator('#detectionDates')).toContainText('NEW_SCENE');release();
  await page.waitForTimeout(100);await expect(page.locator('#detectionDates')).not.toContainText('OLD_SCENE');
  await expect(page.locator('.detection-candidate')).toHaveCount(2);await expect(page.locator('#detectionRun')).toBeEnabled();
});
test('English, keyboard access, remote text safety and 390px layout',async({page})=>{
  const scene='<img src=x onerror="window.pwned=1">';let requests=0;
  await page.route('**/api/satellite/detection?*',r=>{requests++;return r.fulfill({json:sample(36.45,31.3,{scene})})});
  await page.setViewportSize({width:390,height:844});await setup(page);await page.evaluate(()=>window.OdakI18n.setLanguage('en'));
  await page.locator('#detectionRun').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#detectionStatus')).toContainText('unverified candidates');await expect(page.locator('#detectionDates')).toContainText('22 Oct 2026');
  await expect(page.locator('#detectionDates')).toContainText(scene);await expect(page.locator('#detectionControls img')).toHaveCount(0);
  await page.locator('#detectionList button').first().focus();await page.keyboard.press('Enter');
  await expect(page.locator('#detectionAssume')).toBeFocused();await expect(page.locator('#ensembleRun')).toBeDisabled();
  await expect(page.locator('#predictionText')).toContainText('A current-start assumption is required');
  await page.locator('#detectionList button').nth(1).click();await expect(page.locator('#detectionSelected')).toContainText('36.46000');
  await page.locator('#detectionNotesTitle').click();await expect(page.locator('#detectionLimit')).toContainText('not calibrated plastic probabilities');
  await expect(page.locator('#detectionSource')).toContainText('"max_score": 0.8');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await page.locator('#detectionRun').boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.locator('#detectionPanel').screenshot({path:path.join(os.tmpdir(),'focus-detection-mobile.png')});
  await page.setViewportSize({width:1440,height:960});await page.locator('#detectionPanel').screenshot({path:path.join(os.tmpdir(),'focus-detection-desktop.png')});
  await page.evaluate(()=>window.OdakI18n.setLanguage('tr'));await expect(page.locator('#detectionHeading')).toContainText('Sentinel-2 atık adayları');
  await expect(page.locator('#predictionText')).toContainText('güncel başlangıç varsayımı gerekli');
  expect(requests).toBe(1);expect(await page.evaluate(()=>window.pwned)).toBeUndefined();
});
