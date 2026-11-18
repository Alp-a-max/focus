const {test,expect}=require('@playwright/test');
const sample=require('../assets/cygnss-latest.json');
async function open(page){
  await page.route('**/api/observations',r=>r.fulfill({json:[]}));
  await page.route('**/v1/{marine,forecast}?*',r=>r.abort());
  await page.goto('/');
  await expect(page.locator('#experienceDialog')).toBeVisible();
}
async function enter(page,language='tr',mode='standard'){
  await page.locator('[data-language='+language+']').click();
  await page.locator('[name=experience][value='+mode+']').check();
  await page.locator('#experienceStart').click();
  await expect(page.locator('#experienceDialog')).not.toBeVisible();
}
test('first visit, keyboard selection, Turkish copy and persistence',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);
  await expect(page.getByRole('heading',{name:'Okyanus büyük. Odağın sana özel.'})).toBeVisible();
  await page.locator('[name=experience][value=standard]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[name=experience][value=pro]')).toBeChecked();
  await page.locator('#experienceStart').click();
  await expect(page.locator('#analysisPanel')).toHaveAttribute('open','');
  await expect(page.locator('#experienceBadge')).toHaveText('Pro · TR');
  await page.reload();await expect(page.locator('#experienceDialog')).not.toBeVisible();
  await expect(page.locator('#experienceBadge')).toHaveText('Pro · TR');
  expect(errors).toEqual([]);
});
for(const mode of ['standard','pro','max'])test(`${mode} preset changes only disclosure defaults and keeps all tools`,async({page})=>{
  await open(page);await enter(page,'tr',mode);
  for(const id of ['layerDrawer','analysisPanel'])expect(await page.locator('#'+id).evaluate(e=>e.open)).toBe(mode!=='standard');
  for(const id of ['vectorPanel','recordsPanel','comparisonPanel'])expect(await page.locator('#'+id).evaluate(e=>e.open)).toBe(mode==='max');
  await expect(page.locator('#conditionsPanel')).toHaveAttribute('open','');
  await expect(page.locator('#ensembleRun')).toBeVisible();
  if(mode==='standard')await page.locator('#layerDrawer > summary').click();
  await page.locator('#cygnssGo').click();await expect(page.locator('.cygnss-cell')).toHaveCount(441);
});
test('English research layers, dates, units, popup and switch back without refetching',async({page})=>{
  let requests=0;
  await page.route('**/assets/cygnss-latest.json',r=>{requests++;return r.fulfill({json:sample})});
  await open(page);await enter(page,'en','max');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('#analysisRun')).toHaveText('Analyse this area');
  await expect(page.locator('#apiState')).toHaveText('REQUEST FAILED',{timeout:30000});
  await page.locator('#cygnssGo').click();await expect(page.locator('.cygnss-cell')).toHaveCount(441);
  await expect(page.locator('#cygnssStatus')).toContainText('28 October 2026');
  await expect(page.locator('#cygnssLegend')).toContainText('items/km²');
  await page.locator('.cygnss-cell').nth(220).click({force:true});
  await expect(page.locator('.leaflet-popup-content')).toContainText('Sample count');
  await expect(page.locator('.leaflet-popup-content')).toContainText('Microplastic density');
  await expect(page.locator('.leaflet-popup-content')).toContainText('0.25°');
  await page.locator('#experienceOpen').click();await enter(page,'tr','pro');
  await expect(page.locator('#cygnssStatus')).toContainText('28 Ekim 2026');
  await expect(page.locator('#analysisRun')).toHaveText('Bölgeyi analiz et');
  expect(requests).toBe(1);
});
test('English local report validation and user-written text are preserved',async({page})=>{
  await open(page);
  await page.route('**/api/observations',r=>r.fulfill({json:[{id:'test',createdAt:'2026-11-19T10:00:00Z',lat:36.45,lon:31.3,note:'Kaynaklar',status:'unreviewed'}]}));
  await page.reload();await enter(page,'en','max');
  await expect(page.locator('#observationList [data-user-content]')).toHaveText('Kaynaklar');
  await page.locator('#inspectCenter').click();
  await page.locator('#inspectionStatus').selectOption('field_reported');
  await page.locator('#inspectionSave').click();
  await expect(page.locator('#inspectionFeedback')).toContainText('A field report needs a photo');
});
test('storage unavailable still allows starting, language change and all controls',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}})});
  await open(page);await enter(page,'en','standard');
  await expect(page.locator('#experienceBadge')).toHaveText('Standard · EN');
  await page.locator('#experienceOpen').click();await enter(page,'tr','max');
  await expect(page.locator('#experienceBadge')).toHaveText('Max · TR');
});
test('English model results and disclosures translate fully; cancel restores saved preferences',async({page})=>{
  await open(page);
  await page.route('**/v1/{marine,forecast}?*',route=>{
    const u=new URL(route.request().url()),marine=u.pathname.includes('marine');
    const time=Array.from({length:72},(_,i)=>new Date(Math.floor(Date.now()/3600000)*3600000+i*3600000).toISOString().slice(0,16));
    const speed=marine?'ocean_current_velocity':'wind_speed_10m',direction=marine?'ocean_current_direction':'wind_direction_10m';
    const lats=u.searchParams.get('latitude').split(','),lons=u.searchParams.get('longitude').split(',');
    const items=lats.map((lat,i)=>({latitude:+lat,longitude:+lons[i],utc_offset_seconds:0,current:{time:time[0],[speed]:marine?1:10,[direction]:marine?90:180,wave_height:.6,sea_surface_temperature:20},current_units:{[speed]:'km/h',[direction]:'°'},hourly_units:{[speed]:'km/h',[direction]:'°'},hourly:{time,[speed]:time.map(()=>marine?1:10),[direction]:time.map(()=>marine?90:180)}}));
    return route.fulfill({json:items.length===1?items[0]:items});
  });
  await enter(page,'en','max');await page.locator('#refreshBtn').click();
  await expect(page.locator('#predictionState')).toHaveText('CALCULATED');
  await expect(page.locator('#predictionText')).toContainText('not waste detection');
  await page.locator('#ensembleRun').click();await expect(page.locator('#ensembleStatus')).toContainText('3 scenarios');
  await page.locator('#gpgpGo').click();await expect(page.locator('#gpgpStatus')).toContainText('Historical research layer on');
  await page.locator('#gpgpMassToggle').check();await expect(page.locator('#gpgpMassStatus')).toContainText('All size classes');
  await page.locator('#experienceOpen').click();await page.locator('[data-language=tr]').click();
  await page.locator('#experienceCancel').click();
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('#experienceBadge')).toHaveText('Max · EN');
  const untranslated=await page.evaluate(()=>{
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),found=[];
    while(walker.nextNode()){
      const n=walker.currentNode,p=n.parentElement;
      if(!p||p.closest('script,style,.language-picker,[data-user-content]')||!p.checkVisibility())continue;
      if(/[çğıöşüÇĞİÖŞÜ]/.test(n.textContent))found.push(n.textContent.trim());
    }
    return found;
  });
  expect(untranslated).toEqual([]);
});
for(const width of [390,1440])test(`layout and touch targets ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  await open(page);
  await page.locator('[data-language=en]').click();
  expect(await page.locator('#experienceDialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await expect(page.locator('#experienceStart')).toBeEnabled();
  await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),`odak-welcome-${width}.png`),fullPage:true});
  await enter(page,'en','max');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('#cygnssGo')).toBeVisible();
  for(const id of ['experienceOpen','experienceChange','cygnssGo'])expect((await page.locator('#'+id).boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),`odak-workspace-${width}.png`),fullPage:true});
});
