/* Deterministic sensitivity scenarios. These are not statistical probabilities. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./drift.js'));
  else root.OdakEnsemble = factory(root.PelagicDrift);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(drift) {
  'use strict';
  const DEG = 111.32, STEP = .25;
  function validPoint(p) { return Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 80 && Math.abs(p.lon) < 179; }
  function within(p, bounds) { return p.lat >= bounds.minLat && p.lat <= bounds.maxLat && p.lon >= bounds.minLon && p.lon <= bounds.maxLon; }
  function distance(a, b) { return DEG * Math.hypot(a.lat - b.lat, (a.lon - b.lon) * Math.cos(a.lat * Math.PI / 180)); }
  function nearest(cells, point) {
    let best = Infinity, chosen;
    for (const cell of cells) {
      if (!validPoint(cell)) continue;
      const d = distance(point, cell);
      if (d < best) { best = d; chosen = cell; }
    }
    if (!chosen || best > 25) throw Error('missing');
    return chosen;
  }
  function vectorAt(cell, hour, wind) {
    const index = Math.floor(hour), fraction = hour - index;
    const a = cell.samples?.[index], b = cell.samples?.[index + 1];
    if (!a || !b) throw Error('missing');
    try {
      const va = drift.vector(a.speed, a.direction, wind), vb = drift.vector(b.speed, b.direction, wind);
      return va.map((v, i) => v * (1 - fraction) + vb[i] * fraction);
    } catch { throw Error('missing'); }
  }
  function velocity(input, point, hour, windage) {
    if (!validPoint(point) || !within(point, input.bounds)) throw Error('outside');
    const current = vectorAt(nearest(input.marineCells, point), hour, false);
    if (!windage) return current;
    const wind = vectorAt(nearest(input.windCells, point), hour, true);
    return current.map((v, i) => v + windage * wind[i]);
  }
  function move(point, velocity, hours) {
    return {lat: point.lat + velocity[1] * hours / DEG,
      lon: point.lon + velocity[0] * hours / (DEG * Math.cos(point.lat * Math.PI / 180))};
  }
  function particle(input, start, windage) {
    const points = [{...start, hour: 0}];
    if (input.coast.pointOnLand(start.lat, start.lon)) return {points, state: 'land_start', stoppedAt: 0};
    for (let index = 0; index < 24 / STEP; index++) {
      const hour = index * STEP, previous = points.at(-1);
      try {
        // Midpoint integration: both time and position are sampled again.
        const midpoint = move(previous, velocity(input, previous, hour, windage), STEP / 2);
        const next = {...move(previous, velocity(input, midpoint, hour + STEP / 2, windage), STEP), hour: hour + STEP};
        if (!validPoint(next)) throw Error('outside');
        const hit = input.coast.crossing(previous, next);
        if (hit) {
          const total = distance(previous, next), ratio = total ? Math.min(1, distance(previous, hit) / total) : 0;
          points.push({...hit, hour: hour + STEP * ratio});
          return {points, state: 'coast', stoppedAt: points.at(-1).hour};
        }
        if (input.coast.pointOnLand(next.lat, next.lon)) throw Error('coast_unknown');
        if (!within(next, input.bounds)) throw Error('outside');
        points.push(next);
      } catch (error) {
        return {points, state: ['missing','outside','coast_unknown'].includes(error.message) ? error.message : 'invalid', stoppedAt: hour};
      }
    }
    return {points, state: 'complete', stoppedAt: 24};
  }
  function simulate(input) {
    if (!validPoint(input) || !input.coast || typeof input.coast.pointOnLand !== 'function' || typeof input.coast.crossing !== 'function'
      || !Array.isArray(input.marineCells) || !Array.isArray(input.windCells) || !input.bounds
      || !Object.values(input.bounds).every(Number.isFinite) || input.bounds.minLat >= input.bounds.maxLat
      || input.bounds.minLon >= input.bounds.maxLon || !within(input, input.bounds)) throw Error('Geçersiz senaryo girdisi');
    if (input.coast.pointOnLand(input.lat, input.lon)) throw Error('Başlangıç kara maskesinde');
    const radiusKm = input.radiusKm ?? .5;
    if (!Number.isFinite(radiusKm) || radiusKm < 0 || radiusKm > 2) throw Error('Başlangıç yayılımı geçersiz');
    const starts = [];
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
      starts.push({lat: input.lat + y * radiusKm / (2 * DEG),
        lon: input.lon + x * radiusKm / (2 * DEG * Math.cos(input.lat * Math.PI / 180))});
    }
    return {radiusKm, stepMinutes: 15, method: 'midpoint-nearest-model-cells',
      scenarios: [0,.01,.03].map(windage => ({windage, particles: starts.map(p => particle(input, p, windage))}))};
  }
  function snapshot(scenario, hour) {
    if (![6,12,24].includes(hour)) throw Error('Geçersiz gösterim saati');
    const counts = {active: 0, coast: 0, land_start: 0, missing: 0, outside: 0, coast_unknown: 0, invalid: 0};
    const points = scenario.particles.map((p, id) => {
      const terminated = p.state !== 'complete' && p.stoppedAt <= hour;
      const state = terminated ? p.state : 'active';
      counts[state]++;
      const point = terminated ? p.points.at(-1) : p.points.findLast(x => x.hour <= hour);
      return {...point, id, state};
    });
    return {points, counts, total: points.length};
  }
  return {simulate, snapshot, distance};
});
