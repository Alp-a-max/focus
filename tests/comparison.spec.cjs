const {test,expect}=require('@playwright/test');
require('./experience-fixture.cjs')(test);
test.beforeEach(async ({page}) => {await page.route('**/api/observations', route => route.fulfill({json:[]}));});

test('comparison displays two dates and clears when the selected location changes', async ({page})=>{
  await page.route('**/api/satellite/comparison?*', route=>route.fulfill({json:{
    older:{date:'2026-01-01T10:00:00Z',cloud:5,photoWidth:1,photoHeight:1,rgb:[40,60,90]},
    newer:{date:'2026-01-10T10:00:00Z',cloud:7,photoWidth:1,photoHeight:1,rgb:[45,65,95]},
    summary:{commonPixels:150,totalPixels:2500,medianDelta:.0123}
  }}));
  await page.goto('/#intelligence');
  await page.locator('#analysisPanel > summary').click();
  await page.locator('#comparisonPanel > summary').click();
  await expect(page.locator('#comparisonRun')).toBeVisible();
  await page.locator('#comparisonRun').click();
  await expect(page.locator('#comparisonStatus')).toContainText('150 ortak geçerli');
  await expect(page.locator('#comparisonStatus')).toContainText('Çöp tespiti');
  await expect(page.locator('#comparisonOlderLabel')).toContainText('2026-01-01');
  await expect(page.locator('#comparisonNewerLabel')).toContainText('2026-01-10');
  await expect(page.locator('#comparisonOlder')).toBeVisible();
  await page.locator('button[data-name="Ege Denizi"]').click();
  await expect(page.locator('#comparisonImages')).toBeHidden();
});
