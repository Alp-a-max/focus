const {test,expect}=require('@playwright/test');
const {openTool,fields}=require('./workspace-helpers.cjs');
const sample=require('../assets/cygnss-latest.json');
async function open(page){await fields(page);await page.goto('/platform.html');}

test('saved former layout preferences do not gate the single workspace with a setup modal',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('odak-experience-v1',JSON.stringify({mode:'max',language:'tr',completed:true})));
 await open(page);await expect(page.locator('dialog[open]')).toHaveCount(0);await expect(page.locator('#releaseIntro')).toBeVisible();await expect(page.locator('#map')).toBeVisible();
 await page.locator('#experienceOpen').focus();await page.keyboard.press('Enter');await expect(page.locator('html')).toHaveAttribute('lang','en');await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','en');
});

test('English research layers retain source date, units and popup; switching language does not refetch cells',async({page})=>{
 let requests=0;await page.route('**/assets/cygnss-latest.json',r=>{requests++;return r.fulfill({json:sample})});await open(page);await page.locator('#experienceOpen').click();await openTool(page,'layers');
 await expect(page.locator('#cygnssGo')).toBeVisible();await page.locator('#cygnssGo').click();await expect(page.locator('.cygnss-cell')).toHaveCount(441);
 await page.locator('.cygnss-cell').nth(220).click({force:true});await expect(page.locator('.leaflet-popup-content')).toContainText('Microplastic density');await expect(page.locator('.leaflet-popup-content')).toContainText('Sample count');
 await openTool(page,'layers');await expect(page.locator('#cygnssStatus')).toContainText('28 October 2026');await expect(page.locator('#cygnssLegend')).toContainText('items/km');await page.keyboard.press('Escape');
 await page.locator('#experienceOpen').click();await openTool(page,'layers');await expect(page.locator('#cygnssStatus')).toContainText('28 Ekim 2026');expect(requests).toBe(1);
});

test('English local records preserve user text and reject photo-free field reports',async({page})=>{
 await fields(page);await page.route('**/api/observations',r=>r.fulfill({json:[{id:'test',createdAt:'2026-11-19T10:00:00Z',lat:36.45,lon:31.3,note:'Kaynaklar',status:'unreviewed'}]}));await page.goto('/platform.html');await page.locator('#experienceOpen').click();await openTool(page,'records');
 await expect(page.locator('#observationList [data-user-content]')).toHaveText('Kaynaklar');await openTool(page,'advanced');await page.locator('#inspectCenter').click();await page.locator('#inspectionStatus').selectOption('field_reported');await page.locator('#inspectionSave').click();await expect(page.locator('#inspectionFeedback')).toContainText('A field report needs a photo');
});

test('storage unavailable still allows language switching and access to every tool category',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}})});await open(page);await page.locator('#experienceOpen').click();await expect(page.locator('html')).toHaveAttribute('lang','en');
 for(const name of ['layers','regions','conditions','advanced','records','settings','satellite']){await openTool(page,name);await expect(page.locator('#simpleTool-'+name)).toBeVisible();}
 await page.keyboard.press('Escape');await page.locator('#experienceOpen').click();await expect(page.locator('html')).toHaveAttribute('lang','tr');
});
