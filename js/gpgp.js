/* Historical Lebreton et al. (2018) contours from Figshare, CC BY 4.0. */
window.OdakGpgp = function (map) {
  const panel = document.createElement('div');
  panel.className = 'gpgp-controls';
  panel.innerHTML = `<label><input id="gpgpToggle" type="checkbox"> Büyük Pasifik Birikimi — tarihî araştırma katmanı (2018)</label>
    <p>Modellenmiş mikroplastik kütle yoğunluğu sınırları. Güncel gözlem tarihi belirtilmez.</p>
    <p class="gpgp-legend"><span>10 g/km²</span> · <span>100 g/km²</span> · <span>1 kg/km²</span></p>
    <button id="gpgpGo" type="button">Büyük Pasifik Birikimine Git</button>
    <p id="gpgpStatus" role="status" aria-live="polite">Katman kapalı. Kaynak çizgisine tıklayarak araştırma bilgilerini açabilirsiniz.</p>
    <label><input id="gpgpMassToggle" type="checkbox"> Kütle yoğunluğu · tüm boyut sınıfları (2018 modeli)</label>
    <p>Lebreton ve diğerleri (2018) · tarihî modellenmiş kütle yoğunluğu.</p>
    <div id="gpgpMassLegend" hidden aria-label="Tüm boyut sınıfları kütle yoğunluğu renk açıklaması"></div>
    <p id="gpgpMassStatus" role="status" aria-live="polite">Yoğunluk katmanı kapalı.</p>
    <p><a href="https://doi.org/10.6084/m9.figshare.5873142.v2" target="_blank" rel="noopener noreferrer">Kaynak · Lebreton &amp; Reisser / Figshare</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p>`;
  document.getElementById('researchLayers').append(panel);
  const toggle = panel.querySelector('#gpgpToggle');
  const go = panel.querySelector('#gpgpGo');
  const status = panel.querySelector('#gpgpStatus');
  const colors = {1: '#f4ca64', 2: '#ff873c', 3: '#ed4974'};
  let layer;
  let pending;

  function popup(feature) {
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = 'Büyük Pasifik Birikimi · tarihî model / araştırma';
    content.append(title);
    const text = document.createElement('p');
    text.textContent = `Lebreton ve diğerleri, 2018. ELEV ${feature.properties.ELEV} çizgisi, modellenmiş mikroplastik kütle yoğunluğunun ${ {1:'10 g/km²', 2:'100 g/km²', 3:'1 kg/km²'}[feature.properties.ELEV]} eşik değerini gösterir. Araştırma yılı 2018’dir. Bu katman için tek bir ölçüm tarihi verilmez. Tüm eşikler mikroplastiklere ilişkindir.`;
    content.append(text);
    for (const [label, url] of [
      ['Kaynak · Lebreton ve Reisser, Figshare v2', 'https://doi.org/10.6084/m9.figshare.5873142.v2'],
      ['Makale · Scientific Reports 8, 4666 (2018)', 'https://doi.org/10.1038/s41598-018-22939-w'],
      ['Lisans · CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/']
    ]) {
      const link = document.createElement('a');
      link.textContent = label;
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      content.append(link, document.createElement('br'));
    }
    const conversion = document.createElement('p');
    conversion.textContent = 'Shapefile → GeoJSON biçim dönüşümü. Özgün WGS84 çizgileri korunmuştur.';
    content.append(conversion);
    if (window.FocusPatchInfo) {
      const more = document.createElement('button');
      more.type = 'button';
      more.textContent = 'Fotoğraf ve Wikipedia bilgisi';
      more.addEventListener('click', () => { map.closePopup(); window.FocusPatchInfo.open(map, {id: 'north-pacific', lat: 32, lon: -145}); });
      content.append(more);
    }
    return content;
  }

  async function load() {
    if (layer) return layer;
    if (!pending) {
      status.textContent = 'Araştırma sınırları yükleniyor…';
      pending = fetch('assets/gpgp-contours.json', {signal: AbortSignal.timeout(15000)})
        .then(response => {
          if (!response.ok) throw Error('HTTP ' + response.status);
          return response.json();
        }).then(data => {
          layer = L.geoJSON(data, {
            attribution: 'Lebreton et al. (2018), Lebreton & Reisser / Figshare · CC BY 4.0',
            style: feature => ({color: colors[feature.properties.ELEV], weight: 4, opacity: .95,
              className: 'gpgp-contour', bubblingMouseEvents: false}),
            onEachFeature: (feature, contour) => {
              contour.options.bubblingMouseEvents = false;
              contour.bindPopup(popup(feature), {maxWidth: 340});
              contour.bindTooltip('Tarihî model (2018) · ELEV ' + feature.properties.ELEV);
            }
          });
          if (!layer.getBounds().isValid()) throw Error('Geçerli sınır bulunamadı');
          return layer;
        }).catch(error => { layer = null; throw error; })
        .finally(() => { pending = null; });
    }
    return pending;
  }

  async function show(fit) {
    try {
      const contours = await load();
      if (!toggle.checked) return;
      contours.addTo(map);
      status.textContent = 'Tarihî araştırma katmanı açık · 2018 · çizgiler 10, 100 ve 1000 g/km² mikroplastik eşikleridir.';
      if (fit) map.fitBounds(contours.getBounds(), {padding: [24, 24], animate: false});
    } catch {
      toggle.checked = false;
      status.textContent = 'Araştırma sınırları yüklenemedi. Tekrar açarak deneyebilirsiniz.';
    }
  }
  toggle.addEventListener('change', () => {
    if (toggle.checked) show(false);
    else {
      if (layer) map.removeLayer(layer);
      status.textContent = 'Katman kapalı.';
    }
  });
  go.addEventListener('click', () => { toggle.checked = true; show(true); });

  const massToggle = panel.querySelector('#gpgpMassToggle');
  const massStatus = panel.querySelector('#gpgpMassStatus');
  const massLegend = panel.querySelector('#gpgpMassLegend');
  let massLayer;
  let massPending;
  map.createPane('gpgpMass');
  map.getPane('gpgpMass').style.zIndex = '350';
  map.getPane('gpgpMass').style.pointerEvents = 'none';

  function hideMass() {
    if (massLayer) map.removeLayer(massLayer);
    massLegend.hidden = true;
  }
  async function loadMass() {
    if (massLayer) return massLayer;
    if (!massPending) {
      massPending = fetch('assets/gpgp-mass.json', {signal: AbortSignal.timeout(15000)})
        .then(response => {
          if (!response.ok) throw Error('HTTP ' + response.status);
          return response.json();
        }).then(async metadata => {
          const image = new Image();
          image.src = metadata.image;
          await image.decode();
          massLayer = L.imageOverlay(metadata.image, metadata.bounds, {
            opacity: metadata.opacity, pane: 'gpgpMass', interactive: false,
            className: 'gpgp-mass-image',
            attribution: 'All sizes model · Lebreton et al. (2018), Lebreton & Reisser / Figshare · CC BY 4.0'
          });
          const title = document.createElement('strong');
          title.textContent = 'Tüm boyut sınıfları · g/km²';
          massLegend.replaceChildren(title);
          for (const bin of metadata.bins) {
            const entry = document.createElement('span');
            const swatch = document.createElement('i');
            swatch.style.backgroundColor = bin.color;
            swatch.setAttribute('aria-hidden', 'true');
            entry.append(swatch, document.createTextNode(bin.label));
            massLegend.append(entry);
          }
          const note = document.createElement('p');
          note.textContent = 'Aralıklar alt sınır dâhil, üst sınır hariçtir. Eksik veri şeffaftır. Renkler logaritmik aralıklarla gösterilir.';
          massLegend.append(note);
          return massLayer;
        }).finally(() => { massPending = null; });
    }
    return massPending;
  }
  massToggle.addEventListener('change', async () => {
    if (!massToggle.checked) {
      hideMass();
      massStatus.textContent = 'Yoğunluk katmanı kapalı.';
      return;
    }
    massStatus.textContent = 'Yerel yoğunluk verisi yükleniyor…';
    try {
      const image = await loadMass();
      if (!massToggle.checked) return;
      image.addTo(map);
      massLegend.hidden = false;
      massStatus.textContent = 'Tüm boyut sınıfları · tarihî modellenmiş kütle yoğunluğu (2018) · g/km².';
    } catch {
      massToggle.checked = false;
      hideMass();
      massStatus.textContent = 'Yoğunluk verisi yüklenemedi. Tekrar açarak deneyebilirsiniz.';
    }
  });
};
