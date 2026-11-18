const {test,expect}=require('@playwright/test');
async function setup(page,{fail=false,delay=0}={}) {
  let fields=0;
  await page.route('**/api/observations',r=>r.fulfill({json:[]}));
  await page.route('**/v1/{marine,forecast}?*',async route=>{
    const u=new URL(route.request().url()),isMarine=u.pathname.includes('marine');
    const sk=isMarine?'ocean_current_velocity':'wind_speed_10m',dk=isMarine?'ocean_current_direction':'wind_direction_10m';
    const lats=u.searchParams.get('latitude').split(','),lons=u.searchParams.get('longitude').split(',');
    const isField=!u.searchParams.has('current');
    if(isField)fields++;
    if(isField&&delay)await new Promise(resolve=>setTimeout(resolve,delay));
    if(isField&&fail)return route.fulfill({status:503,body:''});
    const start=Math.floor(Date.now()/3600000)*3600000;
    const time=Array.from({length:72},(_,h)=>new Date(start+h*3600000).toISOString().slice(0,16));
    const items=lats.map((lat,i)=>({latitude:+lat,longitude:+lons[i],utc_offset_seconds:0,
      current:{time:time[0],[sk]:isMarine?1:10,[dk]:isMarine?90:180,wave_height:.6,sea_surface_temperature:20},
      current_units:{[sk]:'km/h',[dk]:'°'},hourly_units:{[sk]:'km/h',[dk]:'°'},
      hourly:{time,[sk]:time.map(()=>isMarine?1:10),[dk]:time.map(()=>isMarine?90:180)}}));
    await route.fulfill({json:items.length===1?items[0]:items});
  });
  await page.goto('/#laboratory');
  await expect(page.locator('#ensembleRun')).toBeVisible();
  return ()=>fields;
}
test('three scenarios share two field requests, switch time, export and clear without changing the selected origin',async({page})=>{
  const requests=await setup(page);
  const origin=await page.locator('#coord').inputValue();
  await page.locator('#ensembleRun').click();
  await expect(page.locator('#ensembleStatus')).toContainText('3 senaryo');
  await expect(page.locator('.ensemble-particle')).toHaveCount(75);
  await expect(page.locator('#ensembleStatus')).toContainText('6 saat');
  await expect(page.locator('#ensembleStatus')).toContainText('bir güven aralığı değildir');
  await expect(page.locator('#ensembleSummary .ensemble-card')).toHaveCount(3);
  expect(requests()).toBe(2);
  await page.locator('[data-ensemble-hour="24"]').click();
  await expect(page.locator('#ensembleStatus')).toContainText('Bazı parçacıkların hesabı tamamlanamadı');
  await expect(page.locator('#ensembleSummary')).toContainText('alan dışı');
  await expect(page.locator('#coord')).toHaveValue(origin);
  await page.locator('#ensembleRun').click();
  await expect(page.locator('#ensembleRun')).toBeEnabled();expect(requests()).toBe(2);
  const download=page.waitForEvent('download');await page.locator('#ensembleExport').click();
  expect((await download).suggestedFilename()).toBe('odak-suruklenme-senaryolari.json');
  await page.locator('#ensembleClear').click();
  await expect(page.locator('.ensemble-particle')).toHaveCount(0);
  await expect(page.locator('#ensembleExport')).toBeDisabled();
});
test('location change invalidates stale in-flight results',async({page})=>{
  await setup(page,{delay:500});
  await page.locator('#ensembleRun').click();
  await page.locator('button[data-name="Karadeniz"]').click();
  await expect(page.locator('#ensembleOrigin')).toContainText('41.6000');
  await page.waitForTimeout(600);
  await expect(page.locator('.ensemble-particle')).toHaveCount(0);
  await expect(page.locator('#ensembleExport')).toBeDisabled();
  await expect(page.locator('#ensembleRun')).toBeEnabled();
});
test('failed model service gives a retryable error without drawing synthetic zero routes',async({page})=>{
  await setup(page,{fail:true});await page.locator('#ensembleRun').click();
  await expect(page.locator('#ensembleStatus')).toContainText('HTTP 503');
  await expect(page.locator('.ensemble-particle')).toHaveCount(0);
  await expect(page.locator('#ensembleRun')).toBeEnabled();
});
test('390px layout supports snapshots without horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await setup(page);
  await page.locator('#ensembleRun').click();
  await expect(page.locator('.ensemble-particle')).toHaveCount(75);
  await page.locator('[data-ensemble-hour="12"]').click();
  await expect(page.locator('[data-ensemble-hour="12"]')).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const box=await page.locator('#ensembleRun').boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);
});
