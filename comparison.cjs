'use strict';

// These figures describe a spectral change, not detected litter or its age.
function compareGrids(older, newer) {
  const count = newer.width * newer.height;
  if (older.width !== newer.width || older.height !== newer.height ||
      older.values?.length !== count || newer.values?.length !== count ||
      older.gridCoordinates?.length !== count || newer.gridCoordinates?.length !== count) {
    throw Error('Sahnelerin analiz ızgaraları uyumlu değil.');
  }
  const differences = [];
  for (let i = 0; i < count; i++) {
    const a = older.gridCoordinates[i], b = newer.gridCoordinates[i];
    if (!Array.isArray(a) || !Array.isArray(b) || !a.every(Number.isFinite) || !b.every(Number.isFinite) ||
        Math.abs(a[0] - b[0]) > 0.00001 || Math.abs(a[1] - b[1]) > 0.00001) {
      throw Error('Sahnelerin konum ızgaraları eşleşmiyor; karşılaştırma yapılmadı.');
    }
    if (Number.isFinite(older.values[i]) && Number.isFinite(newer.values[i])) differences.push(newer.values[i] - older.values[i]);
  }
  if (differences.length < 100) throw Error('İki sahnede ortak geçerli su alanı yetersiz; karşılaştırma yapılmadı.');
  differences.sort((a, b) => a - b);
  const middle = Math.floor(differences.length / 2);
  const median = differences.length % 2 ? differences[middle] : (differences[middle - 1] + differences[middle]) / 2;
  return { commonPixels: differences.length, totalPixels: count, medianDelta: median };
}

async function compare(lat, lon, analyze) {
  const newer = await analyze(lat, lon);
  const before = new Date(new Date(newer.date).getTime() - 86400000).toISOString();
  const older = await analyze(lat, lon, { before });
  if (older.sceneId === newer.sceneId || new Date(older.date) >= new Date(newer.date)) throw Error('Farklı tarihli iki sahne bulunamadı.');
  return { older, newer, summary: compareGrids(older, newer) };
}
module.exports = { compare, compareGrids };
