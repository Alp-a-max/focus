const {openTool}=require('./workspace-helpers.cjs');
const {test,expect}=require('@playwright/test');require('./experience-fixture.cjs')(test);
const {initial}=require('../tools/refresh-monitor.cjs');
function feed(){const f=initial(),r=f.regions[2],date='2026-11-11T10:00:00Z';r.status='ready';r.checked_at=new Date().toISOString();r.result={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[r.lon,r.lat]},properties:{candidate_id:'public-candidate',observed_at:date,scene_id:'S2_PUBLIC_SOURCE',grid_pixels:5,max_score:.8,status:'unverified_model_candidate'}}],metadata:{schema_version:1,model_id:'unetpp12',scene_id:'S2_PUBLIC_SOURCE',model_sha256:'a'.repeat(64),checkpoint_sha256:'b'.repeat(64),source:'https://doi.org/10.1016/j.isci.2023.108402',observed_at:date,retrieved_at:new Date().toISOString(),threshold:.1,eligible_pixels:10000,excluded_pixels:0,candidate_clusters:1,score_kind:'uncalibrated neural-network score',validation_status:'research_only',query:{lat:r.lat,lon:r.lon}}};return f;}
test('public feed opens a real-shaped region result and preserves date/source and explicit forecast consent',async({page})=>{
 await page.route('**/assets/monitor-feed.json',r=>r.fulfill({json:feed()}));await page.goto('/platform.html');
 await expect(page.locator('.monitor-card')).toHaveCount(13);const card=page.locator('.monitor-card').filter({hasText:'Karayipler'});
 await openTool(page,'regions');await card.getByRole('button',{name:'Sonucu haritada aç'}).click();await expect(page.locator('#detectionList button')).toHaveCount(1);
 await expect(page.locator('#detectionDates')).toContainText('S2_PUBLIC_SOURCE');await openTool(page,'satellite');await page.locator('#detectionList button').click();await expect(page.locator('#detectionForecast')).toBeDisabled();
 await expect(page.locator('#detectionSource')).toContainText('2026-11-11T10:00:00Z');
});
test('unknown observations are distinct from no candidates, failed refresh retains cards, and mobile has no horizontal overflow',async({page})=>{
 let fail=false;await page.route('**/assets/monitor-feed.json',r=>fail?r.fulfill({status:503,body:'unavailable'}):r.fulfill({json:feed()}));
 await page.setViewportSize({width:390,height:844});await page.goto('/platform.html');await expect(page.locator('.monitor-card')).toHaveCount(13);
 await expect(page.locator('.monitor-card').first()).toContainText('Henüz taranmadı');await expect(page.locator('.monitor-card').filter({hasText:'Hint Okyanusu'})).toContainText('Açık okyanus');
 fail=true;await openTool(page,'regions');await page.locator('#monitorReload').click();await expect(page.locator('#monitorStatus')).toContainText('Yayın alınamadı');await expect(page.locator('.monitor-card')).toHaveCount(13);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('malformed public feed never inserts markup as a working satellite result',async({page})=>{
 const f=feed();f.regions[2].result.metadata.query.lat=0;await page.route('**/assets/monitor-feed.json',r=>r.fulfill({json:f}));await page.goto('/platform.html');await expect(page.locator('#monitorStatus')).toContainText('Yayın alınamadı');await expect(page.locator('.monitor-card')).toHaveCount(0);
});
