const {test, expect} = require('@playwright/test');
const data = require('../assets/gpgp-contours.json');

async function open(page) {
  await page.route('**/js/app.js', async route => {
    const response = await route.fetch();
    await route.fulfill({response, body: 'L.Map.addInitHook(function(){window.testMap=this;});\n' + await response.text()});
  });
  await page.route('**/v1/{marine,forecast}?*', route => route.abort());
  await page.goto('/#intelligence');
  await expect(page.locator('#gpgpToggle')).toBeVisible();
}

test('research contours toggle, fit the real bounds, and show source details', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await expect(page.locator('.gpgp-contour')).toHaveCount(0);
  const initial = await page.evaluate(() => window.testMap.getCenter());
  await page.locator('#gpgpToggle').check();
  await expect(page.locator('.gpgp-contour')).toHaveCount(data.features.length);
  expect(await page.evaluate(() => window.testMap.getCenter())).toEqual(initial);
  await page.locator('#gpgpGo').click();
  const actual = await page.evaluate(() => {
    let contours;
    window.testMap.eachLayer(layer => {if (layer.toGeoJSON?.().features?.length === 192) contours = layer;});
    return {bbox: contours.toGeoJSON(false).features.flatMap(f => f.geometry.type === 'LineString' ? f.geometry.coordinates : f.geometry.coordinates.flat()),
      visible: window.testMap.getBounds().contains(contours.getBounds()), zoom: window.testMap.getZoom()};
  });
  expect(actual.visible).toBe(true);
  expect(actual.zoom).toBeLessThan(6);
  expect([Math.min(...actual.bbox.map(p => p[0])), Math.min(...actual.bbox.map(p => p[1])),
    Math.max(...actual.bbox.map(p => p[0])), Math.max(...actual.bbox.map(p => p[1]))]).toEqual(data.bbox);
  await page.locator('#map').scrollIntoViewIfNeeded();
  const point = await page.evaluate(() => {
    let target;
    window.testMap.eachLayer(layer => {if (layer.feature?.properties.ID === 163) target = layer;});
    const points = target.getLatLngs();
    const pixel = window.testMap.latLngToContainerPoint(points[Math.floor(points.length / 2)]);
    return {x: pixel.x, y: pixel.y};
  });
  const coord = await page.locator('#coord').inputValue();
  await page.locator('#map').click({position: point});
  await expect(page.locator('.leaflet-popup-content')).toContainText('tarihî model');
  await expect(page.locator('.leaflet-popup-content')).toContainText('2018');
  await expect(page.locator('.leaflet-popup-content')).toContainText('CC BY 4.0');
  await expect(page.locator('.leaflet-popup-content')).toContainText('eşik');
  await expect(page.locator('#coord')).toHaveValue(coord);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('Lebreton');
  await page.locator('#gpgpToggle').uncheck();
  await expect(page.locator('.gpgp-contour')).toHaveCount(0);
  await expect(page.locator('.leaflet-popup-content')).toHaveCount(0);
  await page.locator('#gpgpGo').click();
  await expect(page.locator('#gpgpToggle')).toBeChecked();
  await expect(page.locator('.gpgp-contour')).toHaveCount(192);
  expect(errors).toEqual([]);
});

test('missing contours show an error and keep the base map usable', async ({page}) => {
  await page.route('**/assets/gpgp-contours.json', route => route.fulfill({status: 404, body: ''}));
  await open(page);
  await page.locator('#gpgpGo').click();
  await expect(page.locator('#gpgpStatus')).toContainText('yüklenemedi');
  await expect(page.locator('#gpgpToggle')).not.toBeChecked();
  await expect(page.locator('.gpgp-contour')).toHaveCount(0);
  await expect(page.locator('#baseBtn')).toBeEnabled();
});

test('all-size raster aligns geographically, toggles with contours and reuses local assets', async ({page}) => {
  const metadata = require('../assets/gpgp-mass.json');
  const requests = [];
  page.on('request', req => requests.push(req.url()));
  await open(page);
  await page.locator('#gpgpGo').click();
  await expect(page.locator('.gpgp-contour')).toHaveCount(192);
  await page.locator('#gpgpMassToggle').check();
  await expect(page.locator('.gpgp-mass-image')).toBeVisible();
  await expect(page.locator('#gpgpMassLegend')).toBeVisible();
  await expect(page.locator('#gpgpMassLegend')).toContainText('Tüm boyut sınıfları · g/km²');
  await expect(page.locator('#gpgpMassLegend span')).toHaveCount(7);
  await expect(page.locator('#gpgpMassLegend')).toContainText('100 000');
  const placement = await page.evaluate(() => {
    let raster;
    window.testMap.eachLayer(layer => { if (layer.options?.className === 'gpgp-mass-image') raster = layer; });
    const bounds = raster.getBounds();
    return {bounds: [[bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]],
      opacity: raster.options.opacity, pane: raster.options.pane,
      loaded: raster.getElement().complete && raster.getElement().naturalWidth > 0};
  });
  expect(placement.bounds).toEqual(metadata.bounds);
  expect(placement.opacity).toBe(.65);
  expect(placement.pane).toBe('gpgpMass');
  expect(placement.loaded).toBe(true);
  await expect(page.locator('.gpgp-contour')).toHaveCount(192);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('CC BY 4.0');
  await page.locator('#gpgpMassToggle').uncheck();
  await expect(page.locator('.gpgp-mass-image')).toHaveCount(0);
  await expect(page.locator('#gpgpMassLegend')).toBeHidden();
  await expect(page.locator('.gpgp-contour')).toHaveCount(192);
  const previousLoads = requests.filter(url => /gpgp-mass\.(png|json)/.test(url)).length;
  await page.locator('#gpgpMassToggle').check();
  await expect(page.locator('.gpgp-mass-image')).toBeVisible();
  expect(requests.filter(url => /gpgp-mass\.(png|json)/.test(url)).length).toBe(previousLoads);
  expect(requests.some(url => /ndownloader\.figshare/.test(url))).toBe(false);
  await page.locator('#gpgpToggle').uncheck();
  await expect(page.locator('.gpgp-contour')).toHaveCount(0);
  await expect(page.locator('.gpgp-mass-image')).toBeVisible();
});

test('missing raster image shows an error without removing contours', async ({page}) => {
  await page.route('**/assets/gpgp-mass.png', route => route.fulfill({status: 404, body: ''}));
  await open(page);
  await page.locator('#gpgpGo').click();
  await expect(page.locator('.gpgp-contour')).toHaveCount(192);
  await page.locator('#gpgpMassToggle').check();
  await expect(page.locator('#gpgpMassStatus')).toContainText('yüklenemedi');
  await expect(page.locator('#gpgpMassToggle')).not.toBeChecked();
  await expect(page.locator('.gpgp-contour')).toHaveCount(192);
  await expect(page.locator('.gpgp-mass-image')).toHaveCount(0);
});
