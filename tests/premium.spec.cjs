const {openTool}=require('./workspace-helpers.cjs');
const {test, expect} = require('@playwright/test');
require('./experience-fixture.cjs')(test);
const sample = require('../assets/cygnss-latest.json');
const state = require('../assets/cygnss-status.json');

async function open(page) {
  await page.route('**/api/observations', route => route.fulfill({json:[]}));
  await page.route('**/v1/{marine,forecast}?*', route => route.abort());
  await page.goto('/platform.html#intelligence');
  await openTool(page,'layers');await expect(page.locator('#layerDrawer')).toBeVisible();
}

test('workspace starts compact, keyboard disclosures work and reduced motion is respected', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await open(page);
  for (const id of ['analysisPanel','recordsPanel']) {
    await expect(page.locator('#'+id)).not.toHaveAttribute('open','');
  }
  await page.keyboard.press('Tab');await page.locator('#layerDrawer > summary').focus();
  expect(await page.locator('#layerDrawer > summary').evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');
  await page.keyboard.press('Enter');await expect(page.locator('#cygnssGo')).toBeHidden();await page.keyboard.press('Enter');
  await expect(page.locator('#cygnssGo')).toBeVisible();
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  expect(await page.locator('#cygnssGo').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
  await expect(page.locator('.pelagic-gallery,.art-chapter,#stage')).toHaveCount(0);
});

test('opaque fallback is readable without backdrop-filter enhancement', async ({page}) => {
  await page.route('**/css/premium.css*', async route => {
    const response = await route.fetch();
    const css = (await response.text()).split('\n').filter(line=>!line.startsWith('@supports ')).join('\n');
    await route.fulfill({response,body:css});
  });
  await open(page);
  const color = await page.locator('.map-panel').evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
  expect(color).toEqual({background:'rgb(16, 25, 34)',color:'rgb(228, 237, 246)'});
  
  await expect(page.locator('#cygnssGo')).toBeVisible();
});

test('real data date and separate refresh fields are shown honestly', async ({page}) => {
  await open(page);
  
  await page.locator('#cygnssGo').click();
  await expect(page.locator('.cygnss-cell')).toHaveCount(sample.cells.length);
  await openTool(page,'layers');await page.locator('#cygnssUpdates > summary').click();
  await expect(page.locator('#cygnssDataDate')).toContainText('28 Ekim 2026');
  await expect(page.locator('#cygnssUpdateState')).toContainText('Son kontrol başarılı');
  await expect(page.locator('#cygnssNext')).not.toContainText('okunamadı');
  await expect(page.locator('#cygnssLegend')).toContainText('adet/km²');
});

test('failed monthly check preserves data date without claiming a successful refresh', async ({page}) => {
  await page.route('**/assets/cygnss-status.json', route=>route.fulfill({json:{...state,status:'auth_required',
    last_failure_at:'2026-11-18T12:00:00Z',latest_available_date:'2026-11-01'}}));
  await open(page);
  
  await page.locator('#cygnssGo').click();
  await expect(page.locator('.cygnss-cell')).toHaveCount(sample.cells.length);
  await openTool(page,'layers');await page.locator('#cygnssUpdates > summary').click();
  await expect(page.locator('#cygnssDataDate')).toContainText('28 Ekim 2026');
  await expect(page.locator('#cygnssCatalogDate')).toContainText('1 Kasım 2026');
  await expect(page.locator('#cygnssUpdateState')).toContainText('Kaynak erişimi bekleniyor');
  await expect(page.locator('#cygnssUpdateState')).not.toContainText('başarılı');
});

test('failed local reload retains the last good layer and labels the failure', async ({page}) => {
  let fail = false;
  await page.route('**/assets/cygnss-latest.json', route=> fail ? route.fulfill({status:404,body:''}) : route.fulfill({json:sample}));
  await open(page);
  
  await page.locator('#cygnssGo').click();
  await expect(page.locator('.cygnss-cell')).toHaveCount(sample.cells.length);
  await openTool(page,'layers');await page.locator('#cygnssUpdates > summary').click();
  fail = true;
  await page.locator('#cygnssReload').click();
  await expect(page.locator('#cygnssUpdateState')).toContainText('Son veri dosyası okunamadı');
  await expect(page.locator('#cygnssDataDate')).toContainText('28 Ekim 2026');
  await expect(page.locator('.cygnss-cell')).toHaveCount(sample.cells.length);
});

test('overdue monthly schedule does not show a fresh successful-check label', async ({page}) => {
  await page.route('**/assets/cygnss-status.json', route=>route.fulfill({json:{...state,next_check_at:'2020-01-01T00:00:00Z'}}));
  await open(page);
  
  await page.locator('#cygnssGo').click();
  await openTool(page,'layers');await page.locator('#cygnssUpdates > summary').click();
  await expect(page.locator('#cygnssUpdateState')).toContainText('Planlı kontrol zamanı geçti');
});

test('390px touch layout stays readable with open controls and adequate targets', async ({browser}) => {
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await require('./experience-fixture.cjs').prepare(context);
  const page = await context.newPage();
  try {
    await open(page);
    
    await page.locator('#cygnssGo').click();
    await expect(page.locator('.cygnss-cell')).toHaveCount(sample.cells.length);
    await expect(page.locator('#touchMoveBtn')).toBeVisible();
    await openTool(page,'layers');for (const id of ['cygnssGo','gpgpGo','baseBtn']) {
      const box = await page.locator('#'+id).boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  } finally {await context.close();}
});
