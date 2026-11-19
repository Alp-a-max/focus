const {test,expect}=require('@playwright/test');

test('five pricing cards stay in one readable desktop row, with a raised middle and a stacked mobile layout',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const ids=['free','payg','starter','professional','enterprise'];
 for(const language of ['tr','en']){
  await page.locator('[data-public-language='+language+']').click();
  for(const width of [1440,1920]){
   await page.setViewportSize({width,height:1200});
   const cards=await page.locator('#planGrid .plan-card').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.plan,x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,right:n.getBoundingClientRect().right,bottom:n.getBoundingClientRect().bottom,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,overflow:n.scrollWidth>n.clientWidth,font:parseFloat(getComputedStyle(n.querySelector('li')).fontSize)})));
   expect(cards.map(c=>c.id)).toEqual(ids);
   expect(Math.max(...cards.map(c=>c.y))-Math.min(...cards.map(c=>c.y))).toBeLessThanOrEqual(20);
   expect(Math.max(...cards.map(c=>c.bottom))-Math.min(...cards.map(c=>c.bottom))).toBeLessThanOrEqual(2);
   for(let i=0;i<5;i++){expect(cards[i].width).toBeGreaterThanOrEqual(230);expect(cards[i].height).toBeGreaterThan(cards[i].width);expect(cards[i].overflow).toBe(false);expect(cards[i].font).toBeGreaterThanOrEqual(14);if(i)expect(cards[i].x).toBeGreaterThan(cards[i-1].right);}
   expect(cards[2].y).toBeLessThan(cards[1].y);expect(cards[2].y).toBeLessThan(cards[3].y);
   expect(cards[4].right).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.setViewportSize({width:390,height:960});
  const mobile=await page.locator('#planGrid .plan-card').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,bottom:n.getBoundingClientRect().bottom,overflow:n.scrollWidth>n.clientWidth})));
  for(let i=0;i<5;i++){expect(mobile[i].x).toBeCloseTo(mobile[0].x);expect(mobile[i].overflow).toBe(false);if(i)expect(mobile[i].y).toBeGreaterThan(mobile[i-1].bottom);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.locator('[data-public-language=tr]').click();await page.setViewportSize({width:1920,height:1200});await page.evaluate(async()=>{await document.fonts.ready;const el=document.querySelector('#plans .section-heading');window.scrollTo({top:el.getBoundingClientRect().top+scrollY-110,behavior:'instant'});});
 const heading=await page.locator('#plans .section-heading').boundingBox(),container=await page.locator('#plans > .container').boundingBox(),note=await page.locator('#pricingCardNote').boundingBox();
 const folder=require('node:path').join(require('node:os').tmpdir(),'focus-presentation');require('node:fs').mkdirSync(folder,{recursive:true});
 await page.screenshot({path:require('node:path').join(folder,'FOCUS-bes-plan-tek-sira-1920.png'),clip:{x:container.x-20,y:heading.y-24,width:container.width+40,height:note.y+note.height-heading.y+48}});
 await page.setViewportSize({width:390,height:960});await page.evaluate(()=>window.scrollTo({top:document.getElementById('planGrid').getBoundingClientRect().top+scrollY-155,behavior:'instant'}));await page.screenshot({path:require('node:path').join(folder,'FOCUS-bes-plan-mobil-390.png')});
});

test('approved forecast-hour pricing is bilingual, planned and readable at desktop and 390px',async({page})=>{
 await page.goto('/#plans');await expect(page.locator('#planGrid .plan-card')).toHaveCount(5);
 await expect(page.locator('[data-plan=free]')).toContainText('3 saate kadar');await expect(page.locator('[data-plan=free]')).toContainText('Günde 5');
 await expect(page.locator('[data-plan=starter]')).toContainText('$69');await expect(page.locator('[data-plan=starter]')).toContainText('$690');
 await expect(page.locator('#pricingScope')).toContainText('üç ayrı hak düşmez');
 await page.locator('#pricingHours').fill('72');await expect(page.locator('#pricingEstimate')).toContainText('$3,60');
 await expect(page.locator('#pricingEstimate')).toContainText('sunulmuyor');
 await expect(page.locator('#pricingLimits')).toContainText('$60');await expect(page.locator('#pricingLimits')).toContainText('Abonelik her kullanımda daha ucuz değildir');
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.locator('[data-plan=professional]')).toContainText('Annual total: $2,790');
 await expect(page.locator('[data-plan=enterprise]')).toContainText('Annual total: $9,990');
 await expect(page.locator('#pricingExamples')).toContainText('12h = $0.60');await expect(page.locator('#pricingExamples')).toContainText('24h = $1.20');
 await expect(page.locator('#pricingExamples')).toContainText('48h = $2.40');await expect(page.locator('#pricingExamples')).toContainText('72h = $3.60');
 await expect(page.locator('#pricingLimits')).toContainText('plan changes are planned, not active');
 await page.locator('#pricingHours').fill('1.5');await expect(page.locator('#pricingEstimate')).toContainText('whole number');
 await page.locator('#pricingHours').fill('12');
 for(const width of [1440,390]){await page.setViewportSize({width,height:960});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>document.getElementById('plans').scrollIntoView({behavior:'instant',block:'start'}));await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),`focus-pricing-${width}.png`)});}
 await page.locator('[data-plan=professional] button').click();await expect(page.locator('#planDialogCopy')).toContainText('collects no payment');
 await expect(page.locator('input[type=password],input[autocomplete=cc-number]')).toHaveCount(0);
});
test('public entry shows FOCUS annual prices and planned memberships without a fake checkout',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.wordmark')).toContainText('FOCUS');
 await expect(page.locator('#planGrid .plan-card')).toHaveCount(5);
 await expect(page.locator('#planGrid')).toContainText('$69');await expect(page.locator('#planGrid')).toContainText('$999');
 await expect(page.locator('#plans')).toContainText('yıllık toplam');
 const pro=page.locator('.plan-card').filter({has:page.getByRole('heading',{name:'Profesyonel',exact:true})});
 await pro.getByRole('button').click();await expect(page.locator('#planDialog')).toBeVisible();
 await expect(page.locator('#planDialogCopy')).toContainText('henüz açılmadı');
 expect(await page.locator('input[type=password],input[autocomplete=cc-number]').count()).toBe(0);
 await page.locator('#planDialogClose').click();await expect(page.locator('#planDialog')).not.toBeVisible();
});
test('public English changes plan language and takes the user to the full local workspace',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'EN',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('#planGrid')).toContainText('USD / month');
 await page.getByRole('link',{name:'Open demo ↗',exact:true}).click();
 await expect(page).toHaveURL(/\/platform\.html$/);await expect(page.locator('#experienceDialog')).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
});
test('mobile public entry stays within the viewport with accessible navigation and cards',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('link',{name:'Paketler',exact:true}).click();await expect(page.locator('#planGrid')).toBeVisible();
 const pro=page.locator('.plan-card').filter({has:page.getByRole('heading',{name:'Profesyonel',exact:true})});await pro.getByRole('button').click();
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
