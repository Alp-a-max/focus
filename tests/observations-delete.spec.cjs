const {test: base, expect} = require('@playwright/test');
const {launchServer} = require('./server-helper.cjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aWQAAAAASUVORK5CYII=';
const test = base.extend({
  local: async ({}, use) => {
    const cleanup = [];
    const server = launchServer({after: callback => cleanup.push(callback)});
    try { await use({...server, base:await server.ready()}); }
    finally { for (const callback of cleanup) await callback(); }
  }
});

async function open(page, request, local) {
  for (const note of ['Birinci kayıt', 'İkinci kayıt']) {
    const response = await request.post(local.base + '/api/observations', {
      data:{lat:36.45, lon:31.3, note, status:'field_reported', photo}
    });
    expect(response.status()).toBe(201);
  }
  await page.route('**/v1/{marine,forecast}?*', route => route.abort());
  await page.goto(local.base + '/#intelligence');
  await page.locator('#recordsPanel > summary').click();
  await expect(page.locator('#observationList > li')).toHaveCount(2);
  await expect(page.locator('.observation-marker')).toHaveCount(2);
}

test('cancel and confirm deletion remove only the selected record, photo and map marker', async ({page, request, local}) => {
  await open(page, request, local);
  const first = page.locator('#observationList > li').filter({hasText:'Birinci kayıt'});
  await first.getByRole('button', {name:'BİLDİRİMİ GÜNCELLE'}).click();
  let writes = 0;
  page.on('request', req => {if (req.method() === 'DELETE') writes++;});
  page.once('dialog', dialog => dialog.dismiss());
  await first.getByRole('button', {name:'BİLDİRİMİ SİL', exact:true}).click();
  await expect(page.locator('#observationFeedback')).toContainText('iptal');
  expect(writes).toBe(0);
  await expect(page.locator('#observationList > li')).toHaveCount(2);
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('fotoğrafı');
    await dialog.accept();
  });
  await first.getByRole('button', {name:'BİLDİRİMİ SİL', exact:true}).click();
  await expect(page.locator('#observationList > li')).toHaveCount(1);
  await expect(page.locator('.observation-marker')).toHaveCount(1);
  await expect(page.locator('#analysisDetails')).toBeHidden();
  const stored = JSON.parse(await fs.readFile(path.join(local.dir, 'observations.json'), 'utf8'));
  expect(stored).toHaveLength(1);
  expect(stored[0].note).toBe('İkinci kayıt');
  expect(stored[0].photo).toBe(photo);
});

test('editing preserves a photo, explicit removal needs confirmation and prevents photo-free field claims', async ({page, request, local}) => {
  await open(page, request, local);
  let mutations = 0;
  page.on('request', req => {if (['POST', 'PUT', 'DELETE'].includes(req.method())) mutations++;});
  const first = page.locator('#observationList > li').filter({hasText:'Birinci kayıt'});
  await first.getByRole('button', {name:'BİLDİRİMİ GÜNCELLE'}).click();
  await page.locator('#inspectionSave').click();
  await expect(page.locator('#inspectionFeedback')).toContainText('korundu');
  await expect(first.locator('img')).toHaveAttribute('src', photo);
  const beforeCancel = mutations;
  page.once('dialog', dialog => dialog.dismiss());
  await first.getByRole('button', {name:'YALNIZCA FOTOĞRAFI KALDIR'}).click();
  await expect(page.locator('#observationFeedback')).toContainText('iptal');
  expect(mutations).toBe(beforeCancel);
  await expect(first.locator('img')).toHaveCount(1);
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('incelenmemiş');
    await dialog.accept();
  });
  await first.getByRole('button', {name:'YALNIZCA FOTOĞRAFI KALDIR'}).click();
  await expect(first.locator('img')).toHaveCount(0);
  await expect(page.locator('#inspectionStatus')).toHaveValue('unreviewed');
  await expect(page.locator('.observation-marker')).toHaveCount(2);
  await page.locator('#inspectionStatus').selectOption('field_reported');
  await page.locator('#inspectionSave').click();
  await expect(page.locator('#inspectionFeedback')).toContainText('fotoğraf ve açıklama gerekli');
  const records = await (await request.get(local.base + '/api/observations')).json();
  expect(records.find(record => record.note === 'Birinci kayıt').photo).toBeNull();
  expect(records.find(record => record.note === 'Birinci kayıt').status).toBe('unreviewed');
});
