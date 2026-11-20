const {test,expect}=require('@playwright/test');
const path=require('node:path'),os=require('node:os');
test.beforeEach(async({page})=>{
 await page.route('**/api/observations**',r=>r.fulfill({json:[]}));
 await page.route('**/v1/{marine,forecast}?*',r=>r.abort());
});
test('theme toggle works with the keyboard and persists across reloads and both pages',async({page})=>{
 await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.getByRole('button',{name:'Açık temaya geç'}).focus();await page.keyboard.press('Enter');
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 expect(await page.evaluate(()=>localStorage.getItem('focus-theme'))).toBe('light');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.goto('/platform.html?demo=1');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.getByRole('button',{name:'Koyu temaya geç'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});
test('theme labels follow TR/EN and the light pricing/dialog surfaces stay readable',async({page})=>{
 await page.goto('/');await page.locator('#themeToggle').click();await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.locator('#themeToggle')).toHaveAttribute('aria-label','Switch to dark theme');
 await expect(page.locator('[data-plan=starter]')).toContainText('$69');
 const palette=await page.locator('[data-plan=free]').evaluate(el=>({background:getComputedStyle(el).backgroundColor,text:getComputedStyle(el.querySelector('li')).color}));
 expect(palette).toEqual({background:'rgb(255, 255, 255)',text:'rgb(57, 87, 109)'});
 await page.locator('[data-plan=professional] button').click();await expect(page.locator('#planDialog')).toBeVisible();
 await expect(page.locator('#planDialogCopy')).toContainText('collects no payment');
 await page.locator('#planDialogClose').click();await page.getByRole('button',{name:'TR',exact:true}).click();
 await expect(page.locator('#themeToggle')).toHaveAttribute('aria-label','Koyu temaya geç');
});
for(const url of ['/','/platform.html?demo=1'])for(const width of [1440,390])test(`light/dark layout and 44px target ${url} ${width}`,async({page})=>{
 await page.setViewportSize({width,height:960});await page.goto(url);await page.locator('#themeToggle').click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const box=await page.locator('#themeToggle').boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
 if(url!=='/'){
  expect(await page.locator('#map').evaluate(el=>getComputedStyle(el).filter)).toBe('none');
  await expect(page.locator('.metric strong').first()).toHaveCSS('color','rgb(35, 76, 103)');
  await expect(page.locator('#releaseOptions > summary')).toHaveCSS('color','rgb(36, 75, 100)');
  await page.locator('.map-panel').screenshot({path:path.join(os.tmpdir(),`focus-theme-workspace-${width}-light.png`)});
 }else await page.screenshot({path:path.join(os.tmpdir(),`focus-theme-landing-${width}-light.png`)});
 await page.locator('#themeToggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('theme remains usable when browser storage is unavailable',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}})});
 await page.goto('/');await page.locator('#themeToggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.locator('#themeToggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});
