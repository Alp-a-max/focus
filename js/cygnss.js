/* Local, historical CYGNSS V3.2 sample. Values are number density, count/km². */
window.OdakCygnss = function (map) {
  const panel = document.createElement('div');
  panel.className = 'cygnss-controls';
  panel.innerHTML = `<label><input id="cygnssToggle" type="checkbox"> CYGNSS mikroplastik örneği · 16 Ağustos 2018</label>
    <p>Sınırlı Kuzey Pasifik örneği · 25–30° K, 150–145° B. Yaklaşık 1° alan ve 30 günlük ortalamayı temsil eden tarihî yoğunluk tahmini.</p>
    <button id="cygnssGo" type="button">CYGNSS Örnek Bölgesine Git</button>
    <div id="cygnssLegend" hidden aria-label="CYGNSS adet/km² renk açıklaması"></div>
    <p id="cygnssStatus" role="status" aria-live="polite">CYGNSS katmanı kapalı.</p>
    <p><a href="https://doi.org/10.5067/CYGNS-L3P32" target="_blank" rel="noopener noreferrer">Kaynak · NASA PO.DAAC / CYGNSS V3.2</a></p>`;
  document.getElementById('gpgpGo').closest('.gpgp-controls').after(panel);
  const toggle = panel.querySelector('#cygnssToggle');
  const status = panel.querySelector('#cygnssStatus');
  const legend = panel.querySelector('#cygnssLegend');
  const bins = [0, 12750, 13000, 13250, 13500, 13750];
  const colors = ['#443983', '#31688e', '#21918c', '#35b779', '#90d743', '#fde725'];
  const labels = ['<12 750', '12 750–<13 000', '13 000–<13 250', '13 250–<13 500', '13 500–<13 750', '≥13 750'];
  const format = value => value.toLocaleString('tr-TR', {maximumFractionDigits: 2});
  let layer, pending;
  map.createPane('cygnss');
  map.getPane('cygnss').style.zIndex = '375';

  function popup(row) {
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = 'CYGNSS · tarihî Kuzey Pasifik örneği';
    content.append(title);
    for (const line of [
      '16 Ağustos 2018 · 12:00 UTC',
      `Hücre merkezi ${format(row[0])}°, ${format(row[1])}°`,
      `Mikroplastik yoğunluğu ${format(row[2])} adet/km²`,
      `Örnek sayısı ${format(row[3])}`,
      '30 gün ve yaklaşık 1° alanda ortalama. Görünen kare, 0,25° koordinat ızgarasını temsil eder.'
    ]) {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      content.append(paragraph);
    }
    const source = document.createElement('a');
    source.textContent = 'Kaynak · NASA PO.DAAC · DOI 10.5067/CYGNS-L3P32';
    source.href = 'https://doi.org/10.5067/CYGNS-L3P32';
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    content.append(source);
    return content;
  }

  function prepare(data) {
    if (data.schema_version !== 1 || data.source_doi !== '10.5067/CYGNS-L3P32' ||
        data.source_units !== 'count km-2' || data.date !== '2018-08-16T12:00:00Z' ||
        data.grid_step_deg !== .25 || data.averaging_days !== 30 || data.averaging_degrees !== 1 ||
        JSON.stringify(data.columns) !== JSON.stringify(['lat', 'lon', 'mp_concentration', 'num_mp_samples']) ||
        !Array.isArray(data.cells) || data.cells.length > 441) throw Error('Geçersiz örnek dosyası');
    const group = L.featureGroup();
    const positions = new Set();
    for (const row of data.cells) {
      if (!Array.isArray(row) || row.length !== 4) throw Error('Geçersiz hücre');
      const [lat, lon, value, samples] = row;
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 25 || lat > 30 || lon < -150 || lon > -145 ||
          !Number.isInteger(lat * 4) || !Number.isInteger(lon * 4) || positions.has(`${lat},${lon}`)) throw Error('Geçersiz koordinat');
      positions.add(`${lat},${lon}`);
      if (!Number.isFinite(value) || value < 0 || !Number.isInteger(samples) || samples <= 0) continue;
      const bin = bins.findLastIndex(min => value >= min);
      L.rectangle([[lat - .125, lon - .125], [lat + .125, lon + .125]], {
        pane: 'cygnss', className: 'cygnss-cell', stroke: false, fillColor: colors[bin],
        fillOpacity: .7, bubblingMouseEvents: false,
        attribution: 'NASA PO.DAAC / CYGNSS V3.2 · 16 Aug 2018 · DOI 10.5067/CYGNS-L3P32'
      }).bindPopup(popup(row), {maxWidth: 300}).addTo(group);
    }
    if (!group.getBounds().isValid()) throw Error('Geçerli hücre yok');
    return group;
  }

  function buildLegend() {
    const title = document.createElement('strong');
    title.textContent = 'CYGNSS mikroplastik yoğunluğu · adet/km²';
    legend.replaceChildren(title);
    labels.forEach((label, i) => {
      const entry = document.createElement('span');
      const swatch = document.createElement('i');
      swatch.style.backgroundColor = colors[i];
      swatch.setAttribute('aria-hidden', 'true');
      entry.append(swatch, document.createTextNode(label));
      legend.append(entry);
    });
    const note = document.createElement('p');
    note.textContent = 'Alt sınırlar dâhil, üst sınırlar hariçtir. Eksik hücreler çizilmez.';
    legend.append(note);
  }

  async function load() {
    if (layer) return layer;
    if (!pending) {
      pending = fetch('assets/cygnss-north-pacific-20180816.json', {signal: AbortSignal.timeout(15000)})
        .then(response => {
          if (!response.ok) throw Error('HTTP ' + response.status);
          return response.json();
        }).then(data => {
          layer = prepare(data);
          buildLegend();
          return layer;
        }).finally(() => { pending = null; });
    }
    return pending;
  }

  async function show(fit) {
    status.textContent = 'CYGNSS örneği yükleniyor…';
    try {
      const cells = await load();
      if (!toggle.checked) return;
      cells.addTo(map);
      legend.hidden = false;
      status.textContent = `${cells.getLayers().length} geçerli hücre · 16 Ağustos 2018 · adet/km² · 30 günlük, yaklaşık 1° ortalama.`;
      if (fit) map.fitBounds(cells.getBounds(), {padding: [24, 24], animate: false});
    } catch {
      toggle.checked = false;
      if (layer) map.removeLayer(layer);
      legend.hidden = true;
      status.textContent = 'CYGNSS örneği yüklenemedi. Tekrar açarak deneyebilirsiniz.';
    }
  }
  toggle.addEventListener('change', () => {
    if (toggle.checked) show(false);
    else {
      if (layer) map.removeLayer(layer);
      legend.hidden = true;
      status.textContent = 'CYGNSS katmanı kapalı.';
    }
  });
  panel.querySelector('#cygnssGo').addEventListener('click', () => { toggle.checked = true; show(true); });
};
