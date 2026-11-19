const {test,expect}=require('@playwright/test');
test('jury link skips setup and exported evidence preserves scene and unverified status; changing region clears the old trajectory',async({page})=>{
 await page.goto('/platform.html?demo=1');await expect(page.locator('#experienceDialog')).not.toBeVisible();
 const card=page.locator('.monitor-card').filter({hasText:'Belize'});await card.locator('button').click();await expect(page.locator('#reportDownload')).toBeEnabled();
 const event=page.waitForEvent('download');await page.locator('#reportJSON').click();const file=await(await event).path(),data=JSON.parse(require('fs').readFileSync(file,'utf8'));
 expect(data.report_method).toBe('evidence_template_not_llm');expect(data.detection.metadata.query.lat).toBe(require('../assets/monitor-regions.json').regions.find(r=>r.id==='caribbean').lat);expect(data.validation.field_verified).toBe(false);expect(data.trajectory).toBeNull();
 await page.locator('.monitor-card').filter({hasText:'Kuzey Pasifik'}).locator('button').click();await expect(page.locator('#reportDownload')).toBeDisabled();
});
