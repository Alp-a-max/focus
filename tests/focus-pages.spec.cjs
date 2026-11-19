const {test,expect}=require('@playwright/test');
test('public entry shows FOCUS annual prices and planned memberships without a fake checkout',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.wordmark')).toContainText('FOCUS');
 await expect(page.locator('#planGrid .plan-card')).toHaveCount(3);
 await expect(page.locator('#planGrid')).toContainText('$20');await expect(page.locator('#planGrid')).toContainText('$100');
 await expect(page.locator('#plans')).toContainText('yıllık toplam');
 const pro=page.locator('.plan-card').filter({has:page.getByRole('heading',{name:'Pro',exact:true})});
 await pro.getByRole('button').click();await expect(page.locator('#planDialog')).toBeVisible();
 await expect(page.locator('#planDialogCopy')).toContainText('henüz açılmadı');
 expect(await page.locator('input[type=password],input[autocomplete=cc-number]').count()).toBe(0);
 await page.locator('#planDialogClose').click();await expect(page.locator('#planDialog')).not.toBeVisible();
});
test('public English changes plan language and takes the user to the full local workspace',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('#planGrid')).toContainText('USD / year');
 await page.getByRole('link',{name:'Open demo ↗',exact:true}).click();
 await expect(page).toHaveURL(/\/platform\.html$/);await expect(page.locator('#experienceDialog')).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
});
test('mobile public entry stays within the viewport with accessible navigation and cards',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('link',{name:'Paketler',exact:true}).click();await expect(page.locator('#planGrid')).toBeVisible();
 const pro=page.locator('.plan-card').filter({has:page.getByRole('heading',{name:'Pro',exact:true})});await pro.getByRole('button').click();
 expect(await page.locator('#planDialog').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
});
async function platform(page){
 await page.addInitScript(()=>localStorage.setItem('odak-experience-v1',JSON.stringify({mode:'max',language:'tr',completed:true})));
 await page.route('**/api/observations',r=>r.fulfill({json:[]}));
 await page.route('**/v1/{marine,forecast}?*',r=>r.abort());await page.goto('/platform.html');
}
test('map search selects a known location, handles invalid input and exposes the next real investigation step',async({page})=>{
 await platform(page);await page.locator('#mapSearchInput').fill('Karadeniz');await page.locator('#mapSearchForm button').click();
 await expect(page.locator('#coord')).toHaveValue('41.6000° N / 30.9000° E');
 await expect(page.locator('#mapSearchStatus')).toContainText('atık olup olmadığı henüz bilinmiyor');
 await page.locator('#mapSearchInput').fill('91,30');await page.locator('#mapSearchForm button').click();
 await expect(page.locator('#mapSearchStatus')).toContainText('model kapsamı dışında');
 await page.locator('#mapSearchInspect').click();await expect(page.locator('#analysisRun')).toBeVisible();
});
test('HTML or missing service errors are human-readable for analysis and comparison',async({page})=>{
 await page.route('**/api/satellite/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html>offline</html>'}));
 await platform(page);await page.locator('#analysisRun').click();await expect(page.locator('#analysisStatus')).toContainText('İnceleme servisine ulaşılamıyor');
 await page.locator('#comparisonRun').click();await expect(page.locator('#comparisonStatus')).toContainText('İnceleme servisine ulaşılamıyor');
 await expect(page.locator('#comparisonStatus')).not.toContainText('Unexpected token');
});
test('legacy deep links still lead to the matching workspace section',async({page})=>{
 await page.goto('/#intelligence');await expect(page).toHaveURL(/\/platform\.html#intelligence$/);
});


test('full processing note translates before partial clauses and restores its original text',async({page})=>{
 await platform(page);
 const note='Uydu fotoğrafı aynı sahnenin gerçek renk ürünüdür; yaklaşık 10 m çözünürlükte en fazla 3×3 km alan gösterir ve deniz için parlaklığı artırılmıştır. Kıyı ve bulut gölgesi hataları olabilir. FDI katmanı yaklaşık 1×1 km alanı 20 m çözünürlükte gösterir. Bulut, kara, sınıflandırılmamış alan ve görüntü kenarlarına yaklaşık 60 m güvenlik payı uygulanır; bazı etkiler maskelenemeyebilir. Atık tespiti değildir.';
 await page.route('**/api/satellite/analysis?*',r=>r.fulfill({json:{date:'2026-10-22T08:58:00Z',sceneId:'S2A_TEST',cloud:12.3,validPixels:1936,maskedPixels:564,width:50,height:50,min:-.01,max:.01,values:Array(2500).fill(.001),rgb:Array(7500).fill(50),bounds:[[41.59,30.89],[41.61,30.91]],note}}));
 await page.locator('#analysisRun').click();await expect(page.locator('#analysisStatus')).toContainText('Atık tespiti değildir.');
 await page.locator('#experienceOpen').click();await page.locator('[data-language=en]').click();await page.locator('#experienceStart').click();
 await expect(page.locator('#analysisStatus')).toContainText('The satellite photo is a true-colour product');
 await expect(page.locator('#analysisStatus')).not.toContainText('çözünürlük');
 await expect(page.locator('#scenePreview')).toHaveAttribute('alt','Approximate true-colour image of the analysed Sentinel-2 scene');
 await page.locator('#experienceOpen').click();await page.locator('[data-language=tr]').click();await page.locator('#experienceStart').click();
 await expect(page.locator('#analysisStatus')).toContainText(note);
});
