/* Independently dated, regional CYGNSS number-density sample. */
window.OdakCygnss = function (map) {
  const panel = document.createElement('div');
  panel.className = 'cygnss-controls';
  panel.innerHTML = `<label><input id="cygnssToggle" type="checkbox"> CYGNSS · Kuzey Pasifik</label>
    <p>25–30° K, 150–145° B ile sınırlı yoğunluk örneği. Yaklaşık 1° alan ve 30 günlük ortalama.</p>
    <button id="cygnssGo" type="button">CYGNSS Örnek Bölgesine Git</button>
    <div id="cygnssLegend" hidden aria-label="CYGNSS adet/km² renk açıklaması"></div>
    <p id="cygnssStatus" role="status" aria-live="polite">CYGNSS katmanı kapalı.</p>
    <details class="plain-details" id="cygnssUpdates"><summary>Veri tarihi ve aylık kontrol</summary>
      <dl class="update-dates"><dt>Gösterilen veri</dt><dd id="cygnssDataDate">Katmanı açın</dd>
      <dt>Katalogda son görülen veri</dt><dd id="cygnssCatalogDate">Henüz okunmadı</dd>
      <dt>Son başarılı kontrol</dt><dd id="cygnssSuccess">Henüz okunmadı</dd>
      <dt>Son başarısız deneme</dt><dd id="cygnssFailure">Henüz okunmadı</dd>
      <dt>Sonraki kontrol</dt><dd id="cygnssNext">Henüz okunmadı</dd></dl>
      <p id="cygnssUpdateState" role="status">Aylık kontrol bilgisi katmanla birlikte yüklenir.</p>
      <button id="cygnssReload" type="button">Yerel veriyi yenile</button>
    </details>
    <p><a href="https://doi.org/10.5067/CYGNS-L3P32" target="_blank" rel="noopener noreferrer">NASA PO.DAAC / CYGNSS V3.2 · kaynak</a></p>`;
  document.getElementById('researchLayers').append(panel);
  const $ = id => panel.querySelector('#' + id);
  const toggle = $('cygnssToggle'), status = $('cygnssStatus'), legend = $('cygnssLegend');
  const bins = [0, 12750, 13000, 13250, 13500, 13750];
  const colors = ['#443983', '#31688e', '#21918c', '#35b779', '#90d743', '#fde725'];
  const labels = ['<12 750', '12 750–<13 000', '13 000–<13 250', '13 250–<13 500', '13 500–<13 750', '≥13 750'];
  const format = value => value.toLocaleString('tr-TR', {maximumFractionDigits: 2});
  const dateFormat = value => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString('tr-TR', {
      timeZone:'UTC', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit'
    }) + ' UTC' : 'Bilgi yok';
  };
  let layer, data, pending, warning = '';
  map.createPane('cygnss');
  map.getPane('cygnss').style.zIndex = '375';

  function popup(row, sample) {
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = 'CYGNSS · Kuzey Pasifik örneği';
    content.append(title);
    for (const line of [dateFormat(sample.date),
      `Hücre merkezi ${format(row[0])}°, ${format(row[1])}°`,
      `Mikroplastik yoğunluğu ${format(row[2])} adet/km²`, `Örnek sayısı ${format(row[3])}`,
      '30 gün ve yaklaşık 1° alanda ortalama. Kareler 0,25° yayın ızgarasını gösterir.'
    ]) {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      content.append(paragraph);
    }
    const source = document.createElement('a');
    source.textContent = 'NASA PO.DAAC · DOI 10.5067/CYGNS-L3P32';
    source.href = 'https://doi.org/10.5067/CYGNS-L3P32';
    source.target = '_blank'; source.rel = 'noopener noreferrer';
    content.append(source);
    return content;
  }

  function prepare(sample) {
    const date = new Date(sample.date);
    if (sample.schema_version !== 1 || sample.source_doi !== '10.5067/CYGNS-L3P32' ||
        sample.source_units !== 'count km-2' || !/^\d{4}-\d{2}-\d{2}T12:00:00Z$/.test(sample.date) ||
        !Number.isFinite(date.getTime()) || date.toISOString().replace('.000Z','Z') !== sample.date || date > new Date() ||
        sample.grid_step_deg !== .25 || sample.averaging_days !== 30 || sample.averaging_degrees !== 1 ||
        JSON.stringify(sample.columns) !== JSON.stringify(['lat', 'lon', 'mp_concentration', 'num_mp_samples']) ||
        !Array.isArray(sample.cells) || sample.cells.length > 441) throw Error('Geçersiz örnek dosyası');
    const group = L.featureGroup(), positions = new Set();
    for (const row of sample.cells) {
      if (!Array.isArray(row) || row.length !== 4) throw Error('Geçersiz hücre');
      const [lat, lon, value, samples] = row;
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 25 || lat > 30 || lon < -150 || lon > -145 ||
          !Number.isInteger(lat * 4) || !Number.isInteger(lon * 4) || positions.has(`${lat},${lon}`)) throw Error('Geçersiz koordinat');
      positions.add(`${lat},${lon}`);
      if (!Number.isFinite(value) || value < 0 || !Number.isInteger(samples) || samples <= 0) continue;
      const bin = bins.findLastIndex(min => value >= min);
      L.rectangle([[lat - .125, lon - .125], [lat + .125, lon + .125]], {
        pane:'cygnss', className:'cygnss-cell', stroke:false, fillColor:colors[bin], fillOpacity:.7,
        bubblingMouseEvents:false, attribution:'NASA PO.DAAC / CYGNSS V3.2 · ' + sample.date.slice(0,10) + ' · DOI 10.5067/CYGNS-L3P32'
      }).bindPopup(popup(row, sample), {maxWidth:300}).addTo(group);
    }
    if (!group.getBounds().isValid()) throw Error('Geçerli hücre yok');
    return group;
  }

  function buildLegend() {
    const title = document.createElement('strong');
    title.textContent = 'CYGNSS mikroplastik yoğunluğu · adet/km²';
    legend.replaceChildren(title);
    labels.forEach((label, i) => {
      const entry = document.createElement('span'), swatch = document.createElement('i');
      swatch.style.backgroundColor = colors[i]; swatch.setAttribute('aria-hidden','true');
      entry.append(swatch, document.createTextNode(label)); legend.append(entry);
    });
    const note = document.createElement('p');
    note.textContent = 'Alt sınırlar dâhil, üst sınırlar hariçtir. Eksik hücreler çizilmez.';
    legend.append(note);
  }

  async function json(url) {
    const response = await fetch(url, {cache:'no-store', signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw Error('Yerel veri okunamadı');
    return response.json();
  }

  function updateState(state) {
    $('cygnssDataDate').textContent = dateFormat(data.date);
    $('cygnssCatalogDate').textContent = /^\d{4}-\d{2}-\d{2}$/.test(state.latest_available_date || '')
      ? dateFormat(state.latest_available_date + 'T12:00:00Z').replace(' 12:00 UTC', '') : 'Bilgi yok';
    $('cygnssSuccess').textContent = state.last_success_at ? dateFormat(state.last_success_at) : 'Başarılı kontrol yok';
    $('cygnssFailure').textContent = state.last_failure_at ? dateFormat(state.last_failure_at) : 'Kayıtlı başarısız deneme yok';
    $('cygnssNext').textContent = state.next_check_at ? dateFormat(state.next_check_at) : 'Plan bilgisi okunamadı';
    const matching = state.displayed_date === data.date && state.latest_available_date === data.date.slice(0,10)
      && state.catalog_updated_at === data.catalog_updated_at && state.displayed_source_sha256 === data.source_sha256;
    const overdue = Number.isFinite(Date.parse(state.next_check_at)) && Date.parse(state.next_check_at) < Date.now();
    $('cygnssUpdateState').textContent = warning || (state.status === 'ready' && matching
      ? overdue ? 'Planlı kontrol zamanı geçti. Son doğrulanan bölgesel veri gösteriliyor.'
        : 'Son kontrol başarılı. Gösterilen veri katalogdaki son doğrulanan tarihle eşleşiyor.'
      : state.status === 'auth_required' ? 'Kaynak erişimi bekleniyor. Son sağlam veri gösteriliyor.'
      : state.status === 'error' ? 'Son güncelleme denemesi başarısız. Son sağlam veri gösteriliyor.'
      : 'Aylık kontrol bilgisi bu veri sürümü için doğrulanamadı.');
  }

  async function load(refresh = false) {
    if (layer && !refresh) return layer;
    if (!pending) {
      $('cygnssReload').disabled = true;
      pending = (async () => {
        warning = '';
        let candidate, sample;
        try {
          sample = await json('assets/cygnss-latest.json'); candidate = prepare(sample);
        } catch {
          warning = 'Son veri dosyası okunamadı. Son sağlam bölgesel örnek gösteriliyor.';
          if (!layer) {
            sample = await json('assets/cygnss-north-pacific-20180816.json'); candidate = prepare(sample);
          }
        }
        if (candidate) {
          if (layer) map.removeLayer(layer);
          layer = candidate; data = sample; buildLegend();
        }
        const state = await json('assets/cygnss-status.json').catch(() => ({}));
        updateState(state);
        return layer;
      })().finally(() => { pending = null; $('cygnssReload').disabled = false; });
    }
    return pending;
  }

  async function show(fit, refresh = false) {
    status.textContent = 'CYGNSS örneği yükleniyor…';
    try {
      const cells = await load(refresh);
      if (!toggle.checked) return;
      cells.addTo(map); legend.hidden = false;
      status.textContent = `${cells.getLayers().length} geçerli hücre · ${dateFormat(data.date)} · adet/km² · 30 günlük, yaklaşık 1° ortalama.`;
      if (fit) map.fitBounds(cells.getBounds(), {padding:[24,24], animate:false});
    } catch {
      if (!layer) toggle.checked = false;
      legend.hidden = !toggle.checked;
      status.textContent = 'CYGNSS örneği yüklenemedi. Tekrar açarak deneyebilirsiniz.';
    }
  }
  toggle.addEventListener('change', () => {
    if (toggle.checked) show(false);
    else { if (layer) map.removeLayer(layer); legend.hidden = true; status.textContent = 'CYGNSS katmanı kapalı.'; }
  });
  $('cygnssGo').addEventListener('click', () => { toggle.checked = true; show(true); });
  $('cygnssReload').addEventListener('click', () => show(false, true));
};
