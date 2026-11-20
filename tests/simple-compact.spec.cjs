const {test,expect}=require('@playwright/test');
const {fields,forecast,openTool}=require('./workspace-helpers.cjs');
const path=require('node:path'),fs=require('node:fs');
for(const [width,height] of [[390,844],[912,740]])test(`map and model caveat stay in the first viewport without a scrolling control card at ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});await fields(page);await page.goto('/platform.html');
 const out=path.join(__dirname,'..','test-results','simple-review');fs.mkdirSync(out,{recursive:true});
 for(const language of ['tr','en']){
  if(language==='en')await page.locator('#experienceOpen').click();
  const map=await page.locator('.map-wrap').boundingBox();expect(map.y).toBeLessThan(width===390?410:150);expect(height-map.y).toBeGreaterThan(400);
  await expect(page.locator('#simpleScope')).toBeInViewport();await expect(page.locator('#releaseConsent')).toBeInViewport();
  expect(await page.locator('.simple-control').evaluate(el=>getComputedStyle(el).overflowY)).toBe('visible');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:path.join(out,`compact-${width}-${language}-initial.png`)});
 }
 await forecast(page);await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 const map=await page.locator('.map-wrap').boundingBox();expect(map.y).toBeLessThan(width===390?440:150);await expect(page.locator('#simpleScope')).toBeInViewport();
 if(width===912)await expect(page.locator('#releaseTimestamp')).toBeInViewport();
 await page.screenshot({path:path.join(out,`compact-${width}-en-result.png`)});
 await openTool(page,'satellite');
 for(const id of ['detectionExport','reportJSON','reportDownload','trackingExport'])expect((await page.locator('#'+id).boundingBox()).height).toBeGreaterThanOrEqual(44);
 await page.screenshot({path:path.join(out,`compact-${width}-tools.png`)});
});

test('all local workspace JS and CSS references use the same cache version',async({page,request})=>{
 await fields(page);await page.goto('/platform.html');
 const files=await page.locator('script[src^="js/"],link[href^="css/"]').evaluateAll(nodes=>nodes.map(el=>el.getAttribute(el.tagName==='SCRIPT'?'src':'href')));
 expect(files.length).toBeGreaterThan(20);const versions=new Set(files.map(file=>new URL(file,'http://localhost').searchParams.get('v')));expect(versions.size).toBe(1);expect([...versions][0]).toBeTruthy();
 for(const file of ['js/simple-workspace.js','css/simple-workspace.css'])expect((await request.get('/'+files.find(f=>f.startsWith(file+'?')))).status()).toBe(200);
});

test('a Paris land start is explained before requesting forecast fields and never creates a route',async({page})=>{
 await fields(page);let releases=0;page.on('request',r=>{if(r.url().includes('/v1/marine')&&new URL(r.url()).searchParams.get('hourly')?.includes('wave_period'))releases++;});
 await page.goto('/platform.html');await page.locator('#mapSearchInput').fill('48.85, 2.35');await page.locator('#mapSearchForm button').click();await page.locator('#releaseConsent').check();await page.locator('#releaseRun').click();
 await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','error');await expect(page.locator('#releaseStatus')).toContainText('Seçili konum karada');expect(releases).toBe(0);await expect(page.locator('.release-position')).toHaveCount(0);await expect(page.locator('#releaseExport')).toBeDisabled();
 await page.locator('#experienceOpen').click();await expect(page.locator('#releaseStatus')).toContainText('This location is on land');
});
