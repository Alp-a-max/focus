/* Bounded, shared Open-Meteo model fields for current-time drift scenarios. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OdakForecastData = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const cache = new Map();
  function timestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:00(?::00)?Z?$/.test(value)) return NaN;
    return Date.parse(value.replace(/Z$/, '') + 'Z');
  }
  function normalize(raw, type, startTime) {
    const items = Array.isArray(raw) ? raw : [raw];
    if (!items.length || items.length > 9) throw Error('Beklenen sayıda model hücresi alınamadı.');
    const speed = type === 'current' ? 'ocean_current_velocity' : 'wind_speed_10m';
    const direction = type === 'current' ? 'ocean_current_direction' : 'wind_direction_10m';
    const cells = new Map();
    for (const item of items) {
      if (!item || !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)
        || Math.abs(item.latitude) > 80 || Math.abs(item.longitude) >= 179
        || item.utc_offset_seconds !== 0 || item.hourly_units?.[speed] !== 'km/h'
        || item.hourly_units?.[direction] !== '°' || !Array.isArray(item.hourly?.time)) {
        throw Error('Model birimleri, UTC zamanı veya koordinatları doğrulanamadı.');
      }
      const indices = new Map();
      item.hourly.time.forEach((value, i) => {
        const time = timestamp(value);
        if (!Number.isFinite(time) || indices.has(time)) throw Error('Model saatleri geçersiz veya yineleniyor.');
        indices.set(time, i);
      });
      const samples = Array.from({length:25}, (_, h) => {
        const index = indices.get(startTime + h * 3600000);
        const s = item.hourly[speed]?.[index], d = item.hourly[direction]?.[index];
        // Nulls remain missing. They stop affected trajectories in the model.
        return Number.isFinite(s) && s >= 0 && Number.isFinite(d) && d >= 0 && d <= 360
          ? {speed:s, direction:d} : {speed:null, direction:null};
      });
      const key = item.latitude + ',' + item.longitude;
      const cell = {lat:item.latitude, lon:item.longitude, samples};
      if (cells.has(key) && JSON.stringify(cells.get(key).samples) !== JSON.stringify(samples)) throw Error('Aynı model hücresi için tutarsız veri alındı.');
      cells.set(key, cell);
    }
    if (![...cells.values()].some(c => c.samples.some(s => s.speed !== null))) throw Error('Bu bölgede geçerli model vektörü yok.');
    return [...cells.values()];
  }
  async function load(lat, lon, {signal, now=Date.now(), fetchImpl=fetch}={}) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 79.5 || Math.abs(lon) > 178.5) throw Error('Konum model kapsamı dışında.');
    const startTime = Math.floor(now / 3600000) * 3600000;
    const key = [lat.toFixed(4),lon.toFixed(4),startTime].join(':');
    const saved = cache.get(key);
    if (saved && now - saved.at < 15 * 60000 && now >= saved.at) return saved.value;
    const points = [];
    for (let y=-1; y<=1; y++) for (let x=-1; x<=1; x++) points.push([lat+y*.2,lon+x*.2]);
    const params = new URLSearchParams({latitude:points.map(p=>p[0].toFixed(4)).join(','),
      longitude:points.map(p=>p[1].toFixed(4)).join(','), timezone:'UTC', forecast_days:'3'});
    const urls = [
      'https://marine-api.open-meteo.com/v1/marine?' + params + '&hourly=ocean_current_velocity,ocean_current_direction&cell_selection=nearest',
      'https://api.open-meteo.com/v1/forecast?' + params + '&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh'
    ];
    const timeout = AbortSignal.timeout(30000), combined = signal ? AbortSignal.any([signal,timeout]) : timeout;
    const raw = await Promise.all(urls.map(async url => {
      const response = await fetchImpl(url, {signal:combined});
      if (!response.ok) throw Error('Model servisi yanıt vermedi (HTTP ' + response.status + ').');
      return response.json();
    }));
    if (combined.aborted) throw Error('Model isteği iptal edildi.');
    const value = {startTime:new Date(startTime).toISOString(), retrievedAt:new Date().toISOString(),
      marineCells:normalize(raw[0],'current',startTime), windCells:normalize(raw[1],'wind',startTime),
      bounds:{minLat:lat-.2,maxLat:lat+.2,minLon:lon-.2,maxLon:lon+.2},
      sources:['Open-Meteo Marine (SMOC akıntı modeli)','Open-Meteo Weather'],
      notes:'Saatlik model tahmini; en yakın model hücresi. Kaynak modelinin üretim zamanı API yanıtında doğrulanmadı.'};
    cache.set(key,{at:now,value});
    if (cache.size > 8) cache.delete(cache.keys().next().value);
    return value;
  }
  return {load, normalize};
});
