'use strict';
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const dir = process.env.PELAGIC_DATA_DIR || path.join(__dirname, 'data');
const file = path.join(dir, 'observations.json');
let queue = Promise.resolve();

async function list() {
  try {
    const records = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(records) ? records : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function normalized(input, old) {
  const lat = Number(input.lat), lon = Number(input.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw Error('Geçersiz koordinat.');
  }
  const note = String(input.note || '').trim().slice(0, 1000);
  const scene = String(input.scene || '').slice(0, 150);
  const sceneDate = String(input.sceneDate || '').slice(0, 50);
  const reason = String(input.reason || '').slice(0, 500);
  const status = input.status === 'field_reported' ? 'field_reported' : 'unreviewed';
  if (input.removePhoto !== undefined && typeof input.removePhoto !== 'boolean') {
    throw Error('Fotoğraf kaldırma talebi true veya false olmalı.');
  }
  if (input.removePhoto && input.photo) throw Error('Fotoğraf ekleme ve kaldırma birlikte yapılamaz.');
  // Omitted/null photo means no replacement. Only removePhoto:true deletes it.
  let photo = input.removePhoto ? null : old?.photo || null;
  if (input.photo) {
    const match = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(input.photo);
    if (!match) throw Error('Yalnızca JPEG veya PNG fotoğraf yüklenebilir.');
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length > 1024 * 1024) throw Error('Fotoğraf 1 MB sınırını aşıyor.');
    const valid = match[1] === 'jpeg'
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if (!valid) throw Error('Fotoğraf biçimi doğrulanamadı.');
    photo = input.photo;
  }
  if (status === 'field_reported' && (!photo || !note)) {
    throw Error('Saha bildirimi için fotoğraf ve açıklama gerekli. Fotoğrafı kaldırmak için durumu incelenmemiş kullanıcı bildirimi olarak değiştirin.');
  }
  return {lat, lon, note, scene, sceneDate, reason, status, photo};
}

function missing() {
  const error = Error('Gözlem bulunamadı.');
  error.code = 'NOT_FOUND';
  return error;
}

function mutate(change) {
  const operation = queue.then(async () => {
    const records = await list();
    const result = change(records);
    await fs.mkdir(dir, {recursive: true});
    const temporary = file + '.tmp';
    await fs.writeFile(temporary, JSON.stringify(records, null, 2), 'utf8');
    await fs.rename(temporary, file);
    return result;
  });
  queue = operation.catch(() => {});
  return operation;
}

function write(input, id) {
  return mutate(records => {
    const index = id ? records.findIndex(record => record.id === id) : -1;
    if (id && index < 0) throw missing();
    if (!id && records.length >= 30) throw Error('Yerel gözlem sınırına ulaşıldı.');
    const old = id ? records[index] : null;
    const record = {...normalized(input, old), id: old?.id || crypto.randomUUID(),
      createdAt: old?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      source: 'Kullanıcı bildirimi'};
    if (old) records[index] = record;
    else records.unshift(record);
    return record;
  });
}

function remove(id) {
  return mutate(records => {
    const index = records.findIndex(record => record.id === id);
    if (index < 0) throw missing();
    // Photos are embedded in each record, so removing it also removes its photo.
    records.splice(index, 1);
    return {id, deleted: true};
  });
}

module.exports = {list, save: input => write(input), update: (id, input) => write(input, id), remove};
