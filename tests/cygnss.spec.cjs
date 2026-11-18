const {test, expect} = require('@playwright/test');
require('./experience-fixture.cjs')(test);
const data = require('../assets/cygnss-latest.json');

async function open(page) {
  await page.route('**/js/app.js', async route => {
    const response = await route.fetch();
    await route.fulfill({response, body:'L.Map.addInitHook(function(){window.testMap=this;});\n' + await response.text()});
  });
  await page.route('**/v1/{marine,forecast}?*', route => route.abort());
  await page.route('**/api/observations', route => route.fulfill({json:[]}));
  await page.goto('/#intelligence');
  await page.locator('#layerDrawer > summary').click();
  await expect(page.locator('#cygnssToggle')).toBeVisible();
}

test('441 real cells align, show source values and reuse the cached layer independently of GPGP', async ({page}) => {
  let loads = 0;
  page.on('request', request => {if (request.url().includes('/assets/cygnss-latest.json')) loads++;});
  await open(page);
  const original = await page.evaluate(() => window.testMap.getCenter());
  await page.locator('#cygnssToggle').check();
  await expect(page.locator('.cygnss-cell')).toHaveCount(441);
  expect(await page.evaluate(() => window.testMap.getCenter())).toEqual(original);
  await page.locator('#cygnssGo').click();
  const geometry = await page.evaluate(() => {
    const result = [];
    window.testMap.eachLayer(layer => {
      if (layer.options.className !== 'cygnss-cell') return;
      const b = layer.getBounds();
      result.push([b.getSouth(), b.getWest(), b.getNorth(), b.getEast(), window.testMap.getBounds().contains(b)]);
    });
    return result;
  });
  expect(geometry).toEqual(data.cells.map(([lat,lon]) => [lat-.125,lon-.125,lat+.125,lon+.125,true]));
  await expect(page.locator('#cygnssLegend')).toContainText('adet/km²');
  await expect(page.locator('#cygnssStatus')).toContainText('30 günlük');
  await page.locator('#map').scrollIntoViewIfNeeded();
  const point = await page.evaluate(() => {const p=window.testMap.latLngToContainerPoint([27.5,-147.5]);return {x:p.x,y:p.y};});
  const coord = await page.locator('#coord').inputValue();
  await page.locator('#map').click({position: point});
  const popup = page.locator('.leaflet-popup-content');
  await expect(popup).toContainText(new Date(data.date).toLocaleDateString('tr-TR',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}));
  await expect(popup).toContainText(data.cells.find(row=>row[0]===27.5&&row[1]===-147.5)[2].toLocaleString('tr-TR',{maximumFractionDigits:2}) + ' adet/km²');
  await expect(popup).toContainText(data.cells.find(row=>row[0]===27.5&&row[1]===-147.5)[3].toLocaleString('tr-TR'));
  await expect(popup).toContainText('10.5067/CYGNS-L3P32');
  await expect(page.locator('#coord')).toHaveValue(coord);
  await page.locator('#cygnssToggle').uncheck();
  await expect(page.locator('.cygnss-cell')).toHaveCount(0);
  await expect(page.locator('#cygnssLegend')).toBeHidden();
  await page.locator('#cygnssToggle').check();
  await expect(page.locator('.cygnss-cell')).toHaveCount(441);
  expect(loads).toBe(1);
  await page.locator('#gpgpGo').click();
  await expect(page.locator('.gpgp-contour')).toHaveCount(192);
  await page.locator('#gpgpMassToggle').check();
  await expect(page.locator('.gpgp-mass-image')).toBeAttached();
  await expect(page.locator('#gpgpMassLegend')).toContainText('g/km²');
  await expect(page.locator('#cygnssLegend')).toContainText('adet/km²');
  await page.locator('#cygnssToggle').uncheck();
  await expect(page.locator('.gpgp-contour')).toHaveCount(192);
  await expect(page.locator('.gpgp-mass-image')).toBeAttached();
});

test('390px mobile stays in one column without overflow and fits the sample', async ({page}) => {
  await page.setViewportSize({width:390, height:844});
  await open(page);
  await page.locator('#cygnssGo').click();
  await expect(page.locator('.cygnss-cell')).toHaveCount(441);
  const dimensions = await page.evaluate(() => {
    const grid = document.querySelector('.dash-grid');
    return {overflow:document.documentElement.scrollWidth > innerWidth,
      mapHeight:document.querySelector('#map').offsetHeight,
      oneColumn:grid.children[1].getBoundingClientRect().top >= grid.children[0].getBoundingClientRect().bottom};
  });
  expect(dimensions).toEqual({overflow:false, mapHeight:420, oneColumn:true});
  await expect(page.locator('#cygnssLegend')).toBeVisible();
});

for (const failure of ['missing', 'malformed']) test(`${failure} asset fails clearly and can be retried`, async ({page}) => {
  let failed = true;
  await page.route('**/assets/cygnss-north-pacific-20180816.json', route=>route.fulfill({status:404,body:''}));
  await page.route('**/assets/cygnss-latest.json', route => {
    if (!failed) return route.fulfill({json:data});
    return failure === 'missing' ? route.fulfill({status:404, body:''}) : route.fulfill({json:{cells:[]}});
  });
  await open(page);
  await page.locator('#cygnssGo').click();
  await expect(page.locator('#cygnssStatus')).toContainText('yüklenemedi');
  await expect(page.locator('#cygnssToggle')).not.toBeChecked();
  await expect(page.locator('.cygnss-cell')).toHaveCount(0);
  failed = false;
  await page.locator('#cygnssToggle').check();
  await expect(page.locator('.cygnss-cell')).toHaveCount(441);
});

test('missing concentration is omitted and an unchecked pending layer stays off', async ({page}) => {
  const modified = JSON.parse(JSON.stringify(data));
  modified.cells[0][2] = null;
  await page.route('**/assets/cygnss-latest.json', async route => {
    await new Promise(resolve => setTimeout(resolve, 350));
    await route.fulfill({json:modified});
  });
  await open(page);
  await page.locator('#cygnssToggle').check();
  await page.locator('#cygnssToggle').uncheck();
  await page.waitForResponse('**/assets/cygnss-latest.json');
  await expect(page.locator('.cygnss-cell')).toHaveCount(0);
  await page.locator('#cygnssToggle').check();
  await expect(page.locator('.cygnss-cell')).toHaveCount(440);
  await expect(page.locator('#cygnssStatus')).toContainText('440 geçerli');
});
