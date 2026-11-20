const {test,expect}=require('@playwright/test');
const {openTool}=require('./workspace-helpers.cjs');
async function movingFields(page,state={}){
 await page.route('**/v1/{marine,forecast}?*',async r=>{
  const u=new URL(r.request().url()),marine=u.pathname.includes('marine'),release=(u.searchParams.get('hourly')||'').includes('wave_period');
  if(release&&state.delay)await new Promise(resolve=>setTimeout(resolve,state.delay));
  if(release&&state.fail)return r.fulfill({status:503,body:'unavailable'});
  const time=Array.from({length:73},(_,i)=>new Date(Math.floor(Date.now()/3600000)*3600000+i*3600000).toISOString().slice(0,16)),speed=marine?'ocean_current_velocity':'wind_speed_10m',direction=marine?'ocean_current_direction':'wind_direction_10m';
  const lats=u.searchParams.get('latitude').split(','),lons=u.searchParams.get('longitude').split(',');
  const values=lats.map((lat,i)=>({latitude:+lat,longitude:+lons[i],utc_offset_seconds:0,current:{time:time[0],wave_height:1,sea_surface_temperature:20,[speed]:marine?.4:2,[direction]:90},
   current_units:{[speed]:'km/h',[direction]:'°'},hourly_units:{[speed]:'km/h',[direction]:'°',wave_height:'m',wave_direction:'°',wave_period:'s'},
   hourly:{time,[speed]:time.map(()=>marine?.4:2),[direction]:time.map(()=>90),wave_height:time.map(()=>1.5),wave_direction:time.map(()=>270),wave_period:time.map(()=>8)}}));
  await r.fulfill({json:values.length===1?values[0]:values}).catch(()=>{});
 });
}
test('breakaway demo starts from an explicitly chosen section, releases hourly and exports its source, waves and scenario assumptions',async({page})=>{
 await page.route('**/v1/{marine,forecast}?*',r=>{const u=new URL(r.request().url()),marine=u.pathname.includes('marine'),lats=u.searchParams.get('latitude').split(','),lons=u.searchParams.get('longitude').split(','),time=Array.from({length:73},(_,i)=>new Date(Math.floor(Date.now()/3600000)*3600000+i*3600000).toISOString().slice(0,16)),speed=marine?'ocean_current_velocity':'wind_speed_10m',direction=marine?'ocean_current_direction':'wind_direction_10m';const list=lats.map((lat,i)=>({latitude:+lat,longitude:+lons[i],utc_offset_seconds:0,current:{time:time[0],wave_height:1,sea_surface_temperature:20,[speed]:0,[direction]:90},current_units:{[speed]:'km/h',[direction]:'°'},hourly_units:{[speed]:'km/h',[direction]:'°',wave_height:'m',wave_direction:'°',wave_period:'s'},hourly:{time,[speed]:time.map(()=>0),[direction]:time.map(()=>90),wave_height:time.map(()=>1.5),wave_direction:time.map(()=>270),wave_period:time.map(()=>8)}}));return r.fulfill({json:list.length===1?list[0]:list});});
 await page.goto('/platform.html?demo=1');await expect(page.locator('#releaseRun')).toBeDisabled();await openTool(page,'regions');await page.locator('.monitor-card').filter({hasText:'Karadeniz'}).locator('button').click();await openTool(page,'settings');await page.locator('#releaseDuration').selectOption('6');await page.keyboard.press('Escape');await page.locator('#releaseConsent').check();await page.locator('#releaseRun').click();await expect(page.locator('#releaseExport')).toBeEnabled({timeout:15000});await expect(page.locator('#releaseSummary')).toContainText('30 ilerliyor');await expect(page.locator('#releaseWaves')).toContainText('1.5 m');await page.locator('[data-release-hour="24"]').click();
 await page.locator('#releaseExport').locator('..').locator('summary').click();const event=page.waitForEvent('download');await page.locator('#releaseExport').click();const data=JSON.parse(require('fs').readFileSync(await(await event).path(),'utf8'));expect(data.source.lat).toBe(41.6);expect(data.source.release_hours).toBe(6);expect(data.scenarios).toHaveLength(3);expect(data.scenarios[0].particles[25].points[0].hour).toBe(5);expect(data.assumptions.fragmentation_rate_measured).toBe(false);expect(data.assumptions.extra_stokes_velocity_added).toBe(false);expect(data.fields.waves.length).toBeGreaterThan(0);await page.locator('#releaseConsent').uncheck();await expect(page.locator('#releaseExport')).toBeDisabled();
 await page.evaluate(()=>OdakI18n.setLanguage('en'));await expect(page.locator('#releaseHeading')).toHaveText('Create a forecast');await expect(page.locator('#releaseRun')).toHaveText('Start forecast');await page.evaluate(()=>OdakI18n.setLanguage('tr'));await expect(page.locator('#releaseHeading')).toHaveText('Tahmin oluştur');
});

test('guided reference example explains symbols, shows one scenario, keeps all exports and fits desktop/mobile',async({page})=>{
 await movingFields(page);await page.goto('/platform.html?demo=1');
 await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','empty');
 await expect(page.locator('.release-steps li')).toHaveCount(3);await expect(page.locator('.release-map-legend')).toContainText('sahada doğrulanmadı');
 await page.locator('#releaseExample').click();await expect(page.locator('#releaseConsent')).toBeChecked();
 await expect(page.locator('#releaseSource')).toContainText('36.45000, 31.30000');
 await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','result');
 await expect(page.locator('#releaseScenario')).toHaveValue('1');await expect(page.locator('.release-position')).toHaveCount(25);
 expect(await page.locator('.release-path').count()).toBeLessThanOrEqual(5);expect(await page.locator('.release-arrow').count()).toBeGreaterThan(0);
 await expect(page.locator('.release-label').first()).toContainText('Başlangıç');
 await expect(page.locator('.release-end-label')).toContainText('+6 saat');
 await page.locator('[data-release-hour="12"]').click();await page.locator('#simpleHow > summary').click();await page.locator('#releaseScenario').selectOption('2');
  await expect(page.locator('.release-position')).toHaveCount(25);await expect(page.locator('.release-end-label')).toHaveCount(1);await expect(page.locator('.release-end-label')).toContainText('+12 saat');
 await expect(page.locator('#releaseSummary .monitor-card')).toHaveCount(3);
 await page.locator('#releaseFit').click();await page.locator('#releaseBack').click();
 await page.locator('#releaseExport').locator('..').locator('summary').click();
 const pending=page.waitForEvent('download');await page.locator('#releaseExport').click();
 const data=JSON.parse(require('node:fs').readFileSync(await(await pending).path(),'utf8'));
 expect(data.scenarios).toHaveLength(3);expect(data.display).toEqual({hour:12,windage:.03});
 await expect(page.locator('#releaseResult')).toContainText(data.start_time);await expect(page.locator('#releaseResult')).toContainText('kıyıda durdu');
 const out=require('node:os').tmpdir(),path=require('node:path');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:960});await page.locator('#releaseFit').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const id of ['releaseBack','releaseFit','releaseScenario'])expect((await page.locator('#'+id).boundingBox()).height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('#simpleTools')).not.toBeVisible();
  await page.locator('.map-panel').screenshot({path:path.join(out,`focus-release-ux-${width}.png`)});
 }
 await page.evaluate(()=>OdakI18n.setLanguage('en'));await expect(page.locator('.release-map-legend')).toContainText('not field-verified');
 await expect(page.locator('#releaseResult')).toContainText('Model start:');await expect(page.locator('#releaseFit')).toHaveText('Show the full route');
 await page.evaluate(()=>OdakI18n.setLanguage('tr'));await expect(page.locator('#releaseResult')).toContainText('Model başlangıcı:');
});

test('release loading, cancellation and provider failure keep a clear retry path',async({page})=>{
 const state={fail:true,delay:100};await movingFields(page,state);await page.goto('/platform.html?demo=1');await page.locator('#releaseExample').click();
 await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','loading');await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','error');
 await expect(page.locator('#releaseRun')).toBeEnabled();await expect(page.locator('#releaseExport')).toBeDisabled();
 state.fail=false;state.delay=400;await page.locator('#releaseRun').click();await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','loading');
 await page.locator('#releaseClear').click();await page.waitForTimeout(500);await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','ready');
 await expect(page.locator('.release-position')).toHaveCount(0);await expect(page.locator('#releaseExport')).toBeDisabled();
});

test('first visit reaches the simple guide and explicit tool deep links remain reachable',async({page})=>{
 await movingFields(page);await page.goto('/platform.html?demo=1');
 await expect(page.locator('#releaseIntro')).toBeVisible();await expect(page.locator('dialog[open]')).toHaveCount(0);
 await page.goto('/platform.html?demo=1#laboratory');
 await expect(page.locator('#simpleTools')).toBeVisible();await expect(page.locator('#laboratory')).toBeVisible();await expect(page).toHaveURL(/#laboratory$/);
});

for(const state of ['coast','missing'])test(`a ${state} endpoint keeps its actual stop time at the 24h view in both languages`,async({page})=>{
 await movingFields(page);await page.goto('/platform.html?demo=1');
 // Supply a deterministic UI fixture; the physical model and its snapshot logic are unchanged.
 await page.evaluate(state=>{
  FocusRelease.simulate=input=>({source:{lat:input.lat,lon:input.lon},release_count_per_scenario:1,scenarios:[0,.01,.03].map(windage=>({windage,particles:[{state,stoppedAt:1.25,points:[{lat:input.lat,lon:input.lon,hour:0},{lat:input.lat,lon:input.lon+.005,hour:1.25}]}]}))});
 },state);
 await page.locator('#releaseExample').click();
 await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','result');await page.locator('[data-release-hour="24"]').click();
 const label=page.locator('.release-end-label');await expect(label).toHaveCount(1);
 await expect(label).toContainText('Son hesaplanan konum');await expect(label).toContainText('+1,25 saat');
 await expect(label).toContainText(state==='coast'?'kıyıda durdu':'veri eksik');await expect(label).not.toContainText('+24');
 await expect(page.locator('#releaseResult')).toContainText('+24 saat');
 await page.evaluate(()=>OdakI18n.setLanguage('en'));await expect(label).toHaveCount(1);
 await expect(label).toContainText('Last calculated position');await expect(label).toContainText('+1.25h');
 await expect(label).toContainText(state==='coast'?'stopped at coast':'missing data');await expect(label).not.toContainText('+24');
});

test('a curved trajectory arrow follows its neighbouring time steps rather than overall displacement',async({page})=>{
 await movingFields(page);await page.goto('/platform.html?demo=1');
 await page.evaluate(()=>{
  FocusRelease.simulate=input=>({source:{lat:input.lat,lon:input.lon},release_count_per_scenario:1,scenarios:[0,.01,.03].map(windage=>({windage,particles:[{state:'complete',stoppedAt:24,points:[
   {lat:32,lon:-145,hour:0},{lat:32,lon:-144.97,hour:1},{lat:32,lon:-144.94,hour:2},
   {lat:32,lon:-144.95,hour:3},{lat:32,lon:-144.96,hour:6},{lat:32,lon:-144.97,hour:12},{lat:32,lon:-144.98,hour:24}
  ]}]}))});
 });
 await page.locator('#releaseExample').click();
 await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','result');
 await expect(page.locator('.release-arrow span')).toHaveCount(1);
 await expect(page.locator('.release-arrow span')).toHaveAttribute('style','transform:rotate(-90deg)');
 await expect(page.locator('.release-end-label')).toContainText('+6 saat');
});
