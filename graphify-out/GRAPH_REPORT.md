# Graph Report - lockın  (2026-11-20)

## Corpus Check
- 154 files · ~62,563 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .css 14, .cmd 2, (none) 1)

## Summary
- 1055 nodes · 1878 edges · 80 communities (74 shown, 6 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 163 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a516d048`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- detect-pretrained.cjs
- coast.js
- package.json
- pretrained_predict.py
- numpy
- update_cygnss.py
- app.js
- with
- @playwright/test
- ref_node_path
- read_cygnss.py
- UpdateTests
- build_l2a_samples.py
- mount
- openTool
- release.test.js
- public-api.cjs
- ensemble-drift.js
- mount
- workspace-helpers.cjs
- monitor.test.js
- satellite-ui.js
- tracking.test.js
- refresh-monitor.cjs
- json
- Dt
- observations.cjs
- prepare_gpgp_raster.py
- FOCUS
- satellite.cjs
- d
- server.cjs
- ref_node_assert
- detection-api.test.js
- focus-service.test.js
- Qr
- pathlib
- server-helper.cjs
- map.spec.cjs
- ho
- nt
- spatial-drift.test.js
- FOCUS — denetim sonrası devir
- FOCUS — gerçek tespit çekirdeği
- detection-preload.cjs
- cygnss.js
- i18n.js
- ODAK: MARIDA araştırma deneyi
- comparison.test.js
- drift.test.js
- observations.test.js
- README.md
- server.test.js
- FOCUS — ortak çok bölgeli yayın ve tarihli hareket hesabı
- coast.test.js
- z
- ensemble-ui.js
- gpgp.js
- service.js
- simple-workspace.js
- api-origin.test.js
- Deneysel çoklu parçacık sürüklenmesi
- Büyük Pasifik Birikimi araştırma sınırları
- Birikimden ayrılan parçaların koşullu sürüklenme tahmini
- FOCUS sade çalışma alanı — yerel devir
- FOCUS — UNet++ araştırma tespit entegrasyonu
- fields.js
- landing.js
- Codex görevi — FOCUS tespit çekirdeğini haritaya bağla
- CYGNSS-GUNCELLEME.md
- FOCUS final sunum kabul durumu
- mount
- scenes.js
- theme.js
- release.spec.cjs
- KOPUS-GOSTERIM.md

## God Nodes (most connected - your core abstractions)
1. `@playwright/test` - 25 edges
2. `nt()` - 16 edges
3. `mount()` - 16 edges
4. `openTool()` - 16 edges
5. `Dt()` - 15 edges
6. `read_region()` - 14 edges
7. `UpdateTests` - 14 edges
8. `FOCUS` - 14 edges
9. `d()` - 12 edges
10. `st()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `predict()` --indirect_call--> `weather()`  [INFERRED]
  js/app.js → tests/tracking.spec.cjs
- `notify()` --indirect_call--> `result()`  [INFERRED]
  js/release-ui.js → tests/monitor.test.js
- `pack()` --indirect_call--> `result()`  [INFERRED]
  js/report.js → tests/monitor.test.js
- `draw()` --indirect_call--> `result()`  [INFERRED]
  js/tracking-ui.js → tests/monitor.test.js
- `build_file()` --calls--> `read_region()`  [INFERRED]
  tools/update_cygnss.py → ml/read_cygnss.py

## Import Cycles
- None detected.

## Communities (80 total, 6 thin omitted)

### Community 0 - "detect-pretrained.cjs"
Cohesion: 0.05
Nodes (51): find(), BANDS, positions(), PRETRAINED_BANDS, readGrid(), band(), scale(), waterMask() (+43 more)

### Community 1 - "coast.js"
Cohesion: 0.08
Nodes (27): an(), bo(), Do(), Eo(), Er(), fn(), go(), Io() (+19 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (36): {booleanPointInPolygon}, crossing(), {feature}, {lineIntersect}, pointOnLand(), prepare(), create(), dependencies (+28 more)

### Community 3 - "pretrained_predict.py"
Cohesion: 0.11
Nodes (12): download(), main(), read(), load_model(), main(), predict(), read_binary(), main() (+4 more)

### Community 4 - "numpy"
Cohesion: 0.14
Nodes (13): main(), score_features(), check_contract(), contract(), reflectance(), InferenceContractTests, evaluate(), load_split() (+5 more)

### Community 5 - "update_cygnss.py"
Cohesion: 0.11
Nodes (16): main(), atomic_json(), discover(), fetch(), download(), fetch(), due(), iso() (+8 more)

### Community 6 - "app.js"
Cohesion: 0.14
Nodes (25): assumeDetection(), atHour(), candidateForecastMessage(), candidateNeedsAssumption(), cells(), chooseDetection(), clearRoute(), drawPath() (+17 more)

### Community 7 - "with"
Cohesion: 0.07
Nodes (29): concurrency, cancel-in-progress, group, jobs, refresh, name, on, push (+21 more)

### Community 8 - "@playwright/test"
Cohesion: 0.07
Nodes (11): {defineConfig}, @playwright/test, {test,expect}, {defineConfig}, {test,expect}, {test,expect}, {test, expect}, {defineConfig} (+3 more)

### Community 9 - "ref_node_path"
Cohesion: 0.09
Nodes (15): path, {spawn}, startCygnssUpdates(), fs, path, fs, path, port (+7 more)

### Community 10 - "read_cygnss.py"
Cohesion: 0.15
Nodes (7): attributes(), json_value(), number(), read_region(), validate_bbox(), fixture(), ReaderTests

### Community 11 - "UpdateTests"
Cohesion: 0.16
Nodes (5): asset(), granule(), UpdateTests, fail(), bad()

### Community 12 - "build_l2a_samples.py"
Cohesion: 0.14
Nodes (7): choose_scene(), extract(), main(), scene_for(), sha(), labelled_mask(), L2AContractTests

### Community 13 - "mount"
Cohesion: 0.16
Nodes (14): mount(), choose(), clear(), context(), drawResult(), render(), run(), showSnapshot() (+6 more)

### Community 14 - "openTool"
Cohesion: 0.14
Nodes (15): downloadJson(), fs, os, path, routeSample(), sample(), setup(), {test,expect} (+7 more)

### Community 15 - "release.test.js"
Cohesion: 0.16
Nodes (14): load(), normalize(), normalizeWaves(), timestamp(), seeds(), simulate(), assert, start (+6 more)

### Community 16 - "public-api.cjs"
Cohesion: 0.12
Nodes (7): unavailableScenes, assert, setup(), {test}, createApi(), crypto, http

### Community 17 - "ensemble-drift.js"
Cohesion: 0.23
Nodes (14): distance(), move(), nearest(), particle(), simulate(), validPoint(), vectorAt(), velocity() (+6 more)

### Community 18 - "mount"
Cohesion: 0.23
Nodes (12): mount(), clearDrawing(), enable(), fitResult(), notify(), render(), reset(), showSource() (+4 more)

### Community 19 - "workspace-helpers.cjs"
Cohesion: 0.17
Nodes (12): open(), {test,expect}, fs, path, {test,expect}, fs, path, {test,expect} (+4 more)

### Community 20 - "monitor.test.js"
Cohesion: 0.12
Nodes (8): assert, fs, os, path, {test}, os, path, {test,expect}

### Community 21 - "satellite-ui.js"
Cohesion: 0.26
Nodes (15): addObservationActions(), analysisCanvas(), candidates(), changeObservation(), choose(), clear(), refreshObservations(), removeOverlay() (+7 more)

### Community 22 - "tracking.test.js"
Cohesion: 0.18
Nodes (14): move(), normalize(), point(), provider(), getFields(), simulate(), vector(), assert (+6 more)

### Community 23 - "refresh-monitor.cjs"
Cohesion: 0.19
Nodes (11): feed(), {test,expect}, feed(), {test,expect}, weather(), atomic(), fs, initial() (+3 more)

### Community 24 - "json"
Cohesion: 0.25
Nodes (3): main(), read_file(), convert()

### Community 25 - "Dt"
Cohesion: 0.21
Nodes (12): At(), Bt(), et(), it(), yt(), Dt(), Lt(), Ct() (+4 more)

### Community 26 - "observations.cjs"
Cohesion: 0.20
Nodes (10): crypto, file, fs, missing(), mutate(), normalized(), path, queue (+2 more)

### Community 27 - "prepare_gpgp_raster.py"
Cohesion: 0.31
Nodes (4): colorize(), concentrations(), prepare(), RasterTests

### Community 28 - "FOCUS"
Cohesion: 0.14
Nodes (14): Atık tespiti için sonraki geliştirme aşaması, Başlangıç ekranı, deneyim düzenleri ve dil, Birikimden kopan parçaların tahmini, Deneysel alana göre sürüklenme, Deneysel Sentinel-2 spektral analizi, FOCUS, İki tarih karşılaştırması, Model ve kısıtlar (+6 more)

### Community 29 - "satellite.cjs"
Cohesion: 0.21
Nodes (8): analyze(), fdi(), proj4, findScene(), assert, {test}, assert, {test}

### Community 30 - "d"
Cohesion: 0.31
Nodes (13): d(), Jt(), Kr(), le(), N(), No(), O(), on() (+5 more)

### Community 31 - "server.cjs"
Cohesion: 0.27
Nodes (11): validCoordinates(), allowObservationRequest(), detectorStatus(), fs, handleDetection(), http, json(), path (+3 more)

### Community 32 - "ref_node_assert"
Cohesion: 0.18
Nodes (7): assert, http, {test}, assert, {test}, assert, {test}

### Community 33 - "detection-api.test.js"
Cohesion: 0.17
Nodes (9): assert, fs, http, path, preload, start(), {test}, test (+1 more)

### Community 34 - "focus-service.test.js"
Cohesion: 0.21
Nodes (7): mount(), search(), paygCents(), quote(), assert, http, {test}

### Community 35 - "Qr"
Cohesion: 0.24
Nodes (11): co(), Ot(), ut(), wt(), fe(), gn(), lo(), Ne() (+3 more)

### Community 36 - "pathlib"
Cohesion: 0.31
Nodes (4): build(), BuildTests, fixture(), build_file()

### Community 37 - "server-helper.cjs"
Cohesion: 0.18
Nodes (7): assert, {test}, fs, {once}, os, path, {spawn}

### Community 38 - "map.spec.cjs"
Cohesion: 0.22
Nodes (5): {test, expect}, data(), mocks(), png, {test,expect}

### Community 39 - "ho"
Cohesion: 0.27
Nodes (10): b(), F(), mt(), Pt(), ho(), Jo(), ot(), po() (+2 more)

### Community 40 - "nt"
Cohesion: 0.33
Nodes (10): ft(), Pt(), Mt(), nt(), Ct(), it(), K(), mt() (+2 more)

### Community 41 - "spatial-drift.test.js"
Cohesion: 0.27
Nodes (7): interpolate(), nearest(), simulate(), assert, bounds, sea, {test}

### Community 42 - "FOCUS — denetim sonrası devir"
Cohesion: 0.20
Nodes (9): 19 Kasım 2026 — tespit çekirdeği tamamlanan son tur, Denetimde bulunan ve düzeltilenler, FOCUS — denetim sonrası devir, Gerçek deneme kanıtı, İlk denetimde kalan işler — üstteki güncellemeyle birlikte okuyun, İlk denetimdeki görev promptu — bu turda uygulanıp ilerletildi, Korunanlar ve iletişim, Önceki denetim kaydı (+1 more)

### Community 43 - "FOCUS — gerçek tespit çekirdeği"
Cohesion: 0.22
Nodes (7): FOCUS — gerçek tespit çekirdeği, Güncellik ve kaynak, Kaynaklar, Kurulum ve tekrar üretim, Yapılan pilot ve sonuç, Yazılım kontrolleri, Çalışan yol

### Community 44 - "detection-preload.cjs"
Cohesion: 0.31
Nodes (8): detect(), detectorPath, fs, log(), path, pause(), satellite, satellitePath

### Community 45 - "cygnss.js"
Cohesion: 0.46
Nodes (7): buildLegend(), json(), load(), popup(), prepare(), show(), updateState()

### Community 46 - "i18n.js"
Cohesion: 0.39
Nodes (5): apply(), language(), setLanguage(), t(), translate()

### Community 47 - "ODAK: MARIDA araştırma deneyi"
Cohesion: 0.25
Nodes (8): Bağımsız CYGNSS mikroplastik okuyucusu, Canlı L2A ile eşleşen araştırma çekirdeği, Gerçek dosyanın indirilmesi ve doğrulama durumu, Gerçek V3.2 dosyasıyla doğrulama, Haritadaki sınırlı CYGNSS örneğini tekrar üretme, ODAK: MARIDA araştırma deneyi, Sınırlar, Tekrarlama

### Community 48 - "comparison.test.js"
Cohesion: 0.43
Nodes (4): compare(), compareGrids(), assert, {test}

### Community 49 - "drift.test.js"
Cohesion: 0.48
Nodes (5): calculate(), simulate(), vector(), assert, {test}

### Community 50 - "observations.test.js"
Cohesion: 0.29
Nodes (6): list(), assert, fs, os, path, {test}

### Community 51 - "README.md"
Cohesion: 0.29
Nodes (3): 19 Kasım — kapsamı genişleten sonraki uygulama, Bugünkü doğrulama durumu, FOCUS — Canva vaatlerinin ürün kabul koşulları

### Community 52 - "server.test.js"
Cohesion: 0.29
Nodes (4): assert, http, net, {test}

### Community 53 - "FOCUS — ortak çok bölgeli yayın ve tarihli hareket hesabı"
Cohesion: 0.29
Nodes (6): Bitmemiş temel kabul koşulları, FOCUS — ortak çok bölgeli yayın ve tarihli hareket hesabı, Gösterim sırası, İnternetten kullanılan akış, Tarihli sürüklenme, Yenileme ve işletim

### Community 54 - "coast.test.js"
Cohesion: 0.33
Nodes (4): assert, index, mask, {test}

### Community 55 - "z"
Cohesion: 0.73
Nodes (6): z(), Ct(), K(), mt(), Pt(), rt()

### Community 56 - "ensemble-ui.js"
Cohesion: 0.60
Nodes (5): hull(), originLabel(), render(), reset(), sourceLabel()

### Community 57 - "gpgp.js"
Cohesion: 0.47
Nodes (3): load(), popup(), show()

### Community 58 - "service.js"
Cohesion: 0.67
Nodes (5): health(), json(), mount(), update(), platformUrl()

### Community 59 - "simple-workspace.js"
Cohesion: 0.47
Nodes (3): activate(), openTool(), revealHash()

### Community 60 - "api-origin.test.js"
Cohesion: 0.33
Nodes (3): assert, http, {test}

### Community 61 - "Deneysel çoklu parçacık sürüklenmesi"
Cohesion: 0.33
Nodes (6): Deneysel çoklu parçacık sürüklenmesi, Girdiler ve hesap, Kaynaklar, Kontroller, Sonuçların anlamı, Sınırlar ve sonraki doğrulama

### Community 62 - "Büyük Pasifik Birikimi araştırma sınırları"
Cohesion: 0.33
Nodes (5): Büyük Pasifik Birikimi araştırma sınırları, İncelenen arşiv ve dönüşüm, Kaynak ve lisans, Tekrar üretme, Tüm boyut sınıfları raster yoğunluk katmanı

### Community 63 - "Birikimden ayrılan parçaların koşullu sürüklenme tahmini"
Cohesion: 0.33
Nodes (5): Akış ve model, Birikimden ayrılan parçaların koşullu sürüklenme tahmini, Dalga katkısı, Doğrulama, Çıktı ve sınırlar

### Community 64 - "FOCUS sade çalışma alanı — yerel devir"
Cohesion: 0.33
Nodes (5): Değişen dosyalar, FOCUS sade çalışma alanı — yerel devir, Son görünür test sonrası gerçek servis kontrolü, Yerel doğrulama, Önbellek ve yayın

### Community 65 - "FOCUS — UNet++ araştırma tespit entegrasyonu"
Cohesion: 0.33
Nodes (6): API, Doğrulama ve sınırlar, FOCUS — UNet++ araştırma tespit entegrasyonu, Harita ve tarihli adaydan varsayımsal tahmine geçiş, Kapsam, Koordinatörün son doğrulaması — 19 Kasım 2026

### Community 66 - "fields.js"
Cohesion: 0.80
Nodes (4): clear(), selectTime(), setOrigin(), update()

### Community 67 - "landing.js"
Cohesion: 0.80
Nodes (4): apply(), renderPlans(), showPlan(), updateEstimate()

### Community 68 - "Codex görevi — FOCUS tespit çekirdeğini haritaya bağla"
Cohesion: 0.40
Nodes (4): Codex görevi — FOCUS tespit çekirdeğini haritaya bağla, Hazır gerçek model servisi, Uygula, Çalışma sınırları

### Community 69 - "CYGNSS-GUNCELLEME.md"
Cohesion: 0.40
Nodes (4): 18 Kasım 2026 gerçek veri doğrulaması, Doğrulama komutları, Güncelleme davranışı, Yerel Earthdata erişimi

### Community 70 - "FOCUS final sunum kabul durumu"
Cohesion: 0.40
Nodes (4): FOCUS final sunum kabul durumu, Geçici demo sunucusu, Henüz sağlanmamış sunum vaatleri, Çalışan akış

### Community 71 - "mount"
Cohesion: 0.67
Nodes (3): mount(), load(), render()

### Community 72 - "scenes.js"
Cohesion: 0.83
Nodes (3): reset(), search(), setOrigin()

### Community 73 - "theme.js"
Cohesion: 1.00
Nodes (3): apply(), label(), mount()

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `result()` connect `mount` to `mount`, `monitor.test.js`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `detect-pretrained.cjs` be split into smaller, more focused modules?**
  _Cohesion score 0.053613053613053616 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `@playwright/test` to `package.json`, `map.spec.cjs`, `release.spec.cjs`, `openTool`, `workspace-helpers.cjs`, `monitor.test.js`, `refresh-monitor.cjs`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `coast.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08194905869324474 - nodes in this community are weakly interconnected._
- **Why does `weather()` connect `refresh-monitor.cjs` to `app.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0627177700348432 - nodes in this community are weakly interconnected._
- **Should `pretrained_predict.py` be split into smaller, more focused modules?**
  _Cohesion score 0.10606060606060606 - nodes in this community are weakly interconnected._