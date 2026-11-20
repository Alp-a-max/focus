const {test,expect}=require('@playwright/test');
const {openTool,search,fields,forecast}=require('./workspace-helpers.cjs');
const fs=require('node:fs'),path=require('node:path');

test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});});

test('first visit has one workspace without setup; search, invalid input and a real map click update the forecast source',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await fields(page);await page.goto('/platform.html?demo=1');
 await expect(page.locator('dialog[open]')).toHaveCount(0);await expect(page.locator('#releaseRun')).toBeDisabled();await expect(page.locator('#releasePanel')).toBeHidden();
 await expect(page.locator('#simpleLocation')).toContainText('Henüz bölge');await expect(page.locator('#simpleStage .monitor-card')).toHaveCount(0);
 await search(page,'Antalya');await expect(page.locator('#simpleLocation')).toContainText('36.4500');
 await search(page,'not-a-place');await expect(page.locator('#mapSearchStatus')).toContainText('Enlem, boylam');await expect(page.locator('#simpleLocation')).toContainText('36.4500');
 await search(page,'99, 0');await expect(page.locator('#mapSearchStatus')).toContainText('kapsamı dışında');
 await search(page,'23.7331, -39.2782');await expect(page.locator('#simpleLocation')).toContainText('23.7331');await expect(page.locator('#simpleLocation')).toContainText('-39.2782');
 await page.locator('#releaseConsent').check();await page.locator('#map').click({position:{x:240,y:260}});
 await expect(page.locator('#simpleLocation')).not.toContainText('23.7331');await expect(page.locator('#releaseConsent')).not.toBeChecked();await expect(page.locator('#releaseRun')).toBeDisabled();
 expect(errors).toEqual([]);
});

test('forecast horizons, all three scenarios and JSON/HTML exports work; a new region invalidates the old result and consent',async({page})=>{
 await fields(page);await page.goto('/platform.html');await forecast(page);
 for(const hour of ['6','12','24']){await page.locator('[data-release-hour="'+hour+'"]').click();await expect(page.locator('#releaseHeadline')).toContainText('+'+hour);}
 await expect(page.locator('#releaseTimestamp')).toContainText('Model zamanı:');await expect(page.locator('#simpleScope')).toContainText('Gerçek atık konumu');
 await page.locator('#simpleHow > summary').click();
 for(const scenario of ['0','1','2']){await page.locator('#releaseScenario').selectOption(scenario);await expect(page.locator('.release-position')).toHaveCount(25);}
 await page.locator('#releaseExport').locator('..').locator('summary').click();
 const pending=page.waitForEvent('download');await page.locator('#releaseExport').click();const data=JSON.parse(fs.readFileSync(await(await pending).path(),'utf8'));
 expect(data.scenarios).toHaveLength(3);expect(data.display).toEqual({hour:24,windage:.03});expect(data.assumptions.field_verified).toBe(false);expect(data.source).toMatchObject({lat:36.45,lon:31.3});
 const html=page.waitForEvent('download');await page.locator('#releaseReport').click();expect(fs.readFileSync(await(await html).path(),'utf8')).toContain(data.start_time);
 await search(page,'-30, -110');await expect(page.locator('#releasePanel')).toBeHidden();await expect(page.locator('.release-position')).toHaveCount(0);
 await expect(page.locator('#releaseExport')).toBeDisabled();await expect(page.locator('#releaseConsent')).not.toBeChecked();await expect(page.locator('#simpleLocation')).toContainText('-30.0000');
});

test('failure, retry, cancel and changing location during loading cannot display a stale result',async({page})=>{
 const state={fail:true,delay:100};await fields(page,state);await page.goto('/platform.html');
 await page.locator('#releaseExample').click();
 await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','loading');await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','error');
 await expect(page.locator('#releaseRun')).toHaveText('Tekrar dene');await expect(page.locator('#releaseRun')).toBeEnabled();
 state.fail=false;state.delay=400;await page.locator('#releaseRun').click();await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','loading');await page.locator('#releaseClear').click();
 await page.waitForTimeout(500);await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','ready');await expect(page.locator('#releaseConsent')).not.toBeChecked();
 await page.locator('#releaseConsent').check();await page.locator('#releaseRun').click();await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','loading');await search(page,'-30, -110');
 await page.waitForTimeout(500);await expect(page.locator('#releaseIntro')).toHaveAttribute('data-state','ready');await expect(page.locator('#releasePanel')).toBeHidden();await expect(page.locator('.release-position')).toHaveCount(0);
});

test('tools retain original nodes, support tab keyboard navigation, Escape and focus return, and preserve deep links',async({page})=>{
 await fields(page);await page.goto('/platform.html');
 const nodes=await page.locator('#detectionRun,#gpgpToggle,#cygnssToggle,#recordsPanel,#analysisRun,#ensembleRun').count();expect(nodes).toBe(6);
 await page.locator('#simpleToolsOpen').focus();await page.keyboard.press('Enter');await expect(page.locator('#simpleTab-satellite')).toBeFocused();
 await page.keyboard.press('ArrowRight');await expect(page.locator('#simpleTab-layers')).toBeFocused();await expect(page.locator('#simpleTab-layers')).toHaveAttribute('aria-selected','true');
 await page.keyboard.press('Escape');await expect(page.locator('#simpleTools')).not.toBeVisible();await expect(page.locator('#simpleToolsOpen')).toBeFocused();
 await page.goto('/platform.html?demo=1#laboratory');await expect(page.locator('#simpleTools')).toBeVisible();await expect(page.locator('#simpleTab-advanced')).toHaveAttribute('aria-selected','true');await expect(page.locator('#laboratory')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#simpleToolsOpen')).toBeFocused();
});

test('GPGP boundaries, raster and CYGNSS remain independent, cached and can navigate from tools to the map',async({page})=>{
 await fields(page);let cygnss=0;page.on('request',r=>{if(r.url().includes('assets/cygnss-latest.json'))cygnss++;});await page.goto('/platform.html');await openTool(page,'layers');
 await page.locator('#gpgpToggle').check();await expect(page.locator('.gpgp-contour')).not.toHaveCount(0);await page.locator('#gpgpMassToggle').check();await expect(page.locator('.gpgp-mass-image')).toHaveCount(1);
 await page.locator('#cygnssToggle').check();await expect(page.locator('.cygnss-cell')).toHaveCount(441);await page.locator('#cygnssGo').click();await expect(page.locator('#simpleTools')).not.toBeVisible();
 await openTool(page,'layers');await page.locator('#cygnssToggle').uncheck();await expect(page.locator('.cygnss-cell')).toHaveCount(0);await page.locator('#cygnssToggle').check();await expect(page.locator('.cygnss-cell')).toHaveCount(441);expect(cygnss).toBe(1);
 await page.locator('#gpgpToggle').uncheck();await page.locator('#gpgpMassToggle').uncheck();await page.locator('#cygnssToggle').uncheck();await expect(page.locator('.gpgp-contour,.gpgp-mass-image,.cygnss-cell')).toHaveCount(0);
});

for(const width of [1440,390])test(`TR/EN, dark/light, tools and 44px targets fit ${width}px; save review images`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:960});await fields(page);await page.goto('/platform.html');
 const out=path.join(__dirname,'..','test-results','simple-review');fs.mkdirSync(out,{recursive:true});
 const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 expect(await overflow()).toBe(true);await page.screenshot({path:path.join(out,`workspace-${width}-dark-initial.png`),fullPage:true});
 await forecast(page);await page.locator('#releaseFit').click();await page.screenshot({path:path.join(out,`workspace-${width}-dark-result.png`),fullPage:true});
 for(const id of ['simpleToolsOpen','experienceOpen','themeToggle','releaseRun','releaseFit','releaseBack'])expect((await page.locator('#'+id).boundingBox()).height).toBeGreaterThanOrEqual(44);
 await page.locator('#experienceOpen').click();await expect(page.locator('#releaseHeading')).toHaveText('Create a forecast');await expect(page.locator('#simpleLocation')).toContainText('Offshore Antalya');await expect(page.locator('#releaseTimestamp')).toContainText('Model time:');
 await page.locator('#themeToggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');expect(await overflow()).toBe(true);
 await page.screenshot({path:path.join(out,`workspace-${width}-light-en.png`),fullPage:true});await openTool(page,'satellite');expect(await overflow()).toBe(true);await expect(page.locator('#detectionRun')).toBeVisible();await page.screenshot({path:path.join(out,`tools-${width}-light-en.png`),fullPage:false});
 await page.keyboard.press('Escape');await page.reload();await expect(page.locator('#releaseHeading')).toHaveText('Create a forecast');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});
