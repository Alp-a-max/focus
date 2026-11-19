/* UI-only translation. Original text is retained per node for lossless switching.
   Inputs, user content, numerical source data and machine-facing attributes are never translated. */
(()=>{
  'use strict';
  const entries=`
Bölge seç|Choose a region
Kopuşu hesapla|Calculate release
Sonucu incele|Inspect the result
Kuzey Pasifik örneğini seç|Choose the North Pacific example
Kesim ve salım ayrıntıları|Section and release settings
Haritada rüzgâr senaryosu|Windage displayed on map
%0 — yalnız akıntı|0% — current only
%1 — düşük rüzgâr etkisi|1% — low windage
%3 — yüksek rüzgâr etkisi|3% — high windage
Kaynağa dön|Return to source
Tüm sonucu göster|Fit the full result
Veri ve rapor indir|Download data and report
Dalga koşulları|Wave conditions
Seçili koordinat; atık tespiti değil|Selected coordinate; not a waste detection
Birikimden kopan parçalar nereye gider?|Where do fragments released from an accumulation travel?
Birikimin kenarındaki bir kopuş kesimini haritadan seçin. Bu kesimden ayrıldığı varsayılan sanal parçaların 6, 12 ve 24 saat sonraki yayılımını inceleyin.|Select a release section at the edge of an accumulation. Explore the spread of virtual fragments assumed to detach from this section after 6, 12 and 24 hours.
Seçili harita noktasını kopuş kesimi yap|Use the selected map point as a release section
Kesimin yarıçapı|Section radius
Kopuş senaryosu|Release scenario
Başlangıçta tek kopuş|Single release at the start
İlk 6 saat boyunca her saat|Hourly during the first 6 hours
Bu kesimden parçaların ayrıldığını varsayarak tahmin oluştur.|Create a forecast assuming fragments detach from this section.
Kopan parçaların yayılımını hesapla|Calculate fragment spread
Temizle / iptal et|Clear / cancel
Senaryo verisini indir|Download scenario data
Raporu indir|Download report
Tahmin ufku|Forecast horizon
Önce haritada deniz üzerinde bir kopuş kesimi seçin.|First select a release section at sea on the map.
Model ve varsayımlar|Model and assumptions
Girdiler değişti; yeni senaryo hesaplanabilir.|Inputs changed; calculate a new scenario.
Kopuş kesiminin akıntı, rüzgâr ve dalga model alanları yükleniyor…|Loading current, wind and wave model fields for the release section…
Seçili noktada kopuş tahmini oluştur →|Create a breakaway forecast at the selected point →
Seçili noktada yapay zekâ adaylarını incele →|Inspect AI candidates at the selected point →
Daire, sizin seçtiğiniz küçük kopuş kesimidir; çöp adasının ölçülmüş sınırı değildir. Tek kopuşta 25, altı saatlik salımda saatte 5 olmak üzere 30 sanal parçacık kullanılır. Parçacık sayısı gerçek çöp sayısı veya tonaj değildir. Kopuşun gerçekleşmesi, zamanı ve miktarı ölçülmüş bir kırılma modeliyle tahmin edilmez; senaryo olarak girilir.|The circle is your selected small release section, not a measured garbage-patch boundary. A single release uses 25 virtual particles; the six-hour release uses 5 per hour, 30 in total. Particle counts do not represent actual waste counts or tonnage. Detachment, timing and amount are scenario inputs rather than outputs of a measured fragmentation model.
Üç senaryoda doğrudan rüzgâr etkisi %0, %1 ve %3 alınır. Saatlik toplam yüzey deniz hızı ve rüzgâr alanları, 15 dakikalık adımlarda konuma göre yeniden örneklenir. Dalga yüksekliği, yönü ve periyodu ayrıca gösterilir. Sağlayıcı deniz hızını dalga ve gelgit katkılarını da içeren ürün olarak tanımlar; dalga etkisini iki kez saymamak için buna ayrıca Stokes hızı eklenmez. Dalga katkısı bu üründen ayrı bir vektör olarak doğrulanamaz.|The three scenarios use 0%, 1% and 3% direct windage. Hourly total surface-current and wind fields are resampled by position at 15-minute steps. Wave height, direction and period are displayed separately. The provider describes the current product as including wave and tidal contributions; no additional Stokes velocity is added to avoid double counting. The wave contribution cannot be independently verified as a separate vector from this product.
Kıyıda, eksik veride veya sorgu alanı dışında hesap durur. Son noktalar senaryo konumlarıdır. Yayılım bir olasılık yüzdesi veya bağımsız doğrulanmış gerçek takip değildir.|The calculation stops at the coast, missing data or the query-domain boundary. Endpoints are scenario positions. The spread is not a probability percentage or an independently validated observed track.
Deniz ve dalga verisi tanımları|Current and wave data definitions
Rüzgâr verisi|Wind data
Türkiye ve dünyadaki izleme noktalarını veya koordinatları arayın. Konum bulunması atık bulunduğunu göstermez.|Search monitoring points in Turkey and worldwide, or enter coordinates. Finding a location does not mean finding waste.
Antalya, Mumbai, Cakarta veya 41.6, 30.9|Antalya, Mumbai, Jakarta or 41.6, 30.9
Ortak uydu sonuçları küresel izleme ağında yayımlanır. Yeni isteğe bağlı tarama ve kişisel kayıtlar yerel çalışma alanındadır. Tarihli sürüklenme hesabı bu yayında kullanılabilir.|Shared satellite results are published in the global monitoring network. New on-demand scans and personal records are available in the local workspace. Dated drift calculations are available on this website.
İzleme ağına git|Go to monitoring network

Araştırma demosu · Tüm araçlar inceleme için açık.|Research demo · All tools are open for exploration.
Nereden başlamak istersiniz?|Where would you like to start?
Karadeniz, Antalya veya 41.6, 30.9|Black Sea, Antalya or 41.6, 30.9
Konumu bul ↗|Find location ↗
Türkiye kıyılarındaki başlangıç noktalarını veya koordinatları arayın. Konum bulunması atık bulunduğunu göstermez.|Search coastal starting points in Turkey or enter coordinates. Finding a location does not mean finding waste.
Seçili noktada uydu incelemesine geç →|Investigate the selected point with satellite data →
Bu ad için kayıt yok. Enlem, boylam girerek devam edebilirsiniz.|No matching name. Enter latitude, longitude to continue.
Koordinat model kapsamı dışında.|Coordinates are outside the model coverage.
Bir kıyı bölgesi veya enlem, boylam girin.|Enter a coastal area or latitude, longitude.
Tam çalışma alanını aç|Open the full workspace
Bağlantıyı kontrol et|Check connection
Çalışma alanı bağlantısı|Workspace connection
Harita ve modeller açık. Uydu incelemesi ve kayıtlar için tam çalışma alanına geçin.|The map and models are available. Open the full workspace for satellite investigation and reports.
Uydu inceleme ve kayıt servisi şu anda bağlı değil. FOCUS başlatıldıktan sonra bağlantıyı yeniden kontrol edin.|Satellite investigation and report services are disconnected. Start FOCUS and check the connection again.
İnceleme servisine ulaşılamıyor. Tam çalışma alanını açın veya bağlantıyı yeniden kontrol edin.|The investigation service is unavailable. Open the full workspace or check the connection again.
Yerel bildirim servisine ulaşılamıyor. Tam çalışma alanını açın.|The local report service is unavailable. Open the full workspace.
İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.|The operation timed out. Please try again.
Servis yanıtı okunamadı. Lütfen tekrar deneyin.|The service response could not be read. Please try again.

Sade|Simple
Araştırma|Research
Gelişmiş|Advanced
Ana sayfa|Home
Yıllık paketleri incele|Explore annual plans
İleri modeller ve karşılaştırma|Advanced models and comparison
FOCUS — Araştırma çalışma alanı|FOCUS — Research workspace
Harita|Map
Sürüklenme|Drift
Kaynaklar|Sources
OKYANUS ARAŞTIRMA PLATFORMU|OCEAN RESEARCH WORKSPACE
Okyanusu|Explore the ocean
veriyle keşfet.|through data.
Uydu verileri, deniz koşulları ve sürüklenme modelleri. Aynı haritada, kaynakları ve sınırlarıyla.|Satellite data, sea conditions and drift models. One map, with sources and limitations in view.
Haritayı aç|Open the map
Veri kaynakları|Data sources
ÇALIŞMA ALANI|WORKSPACE
Denizi keşfet.|Explore the sea.
Haritadan bir deniz noktası seçin. Araştırma katmanlarını açın veya seçili konumun deniz koşullarını inceleyin.|Select a point at sea. Explore research layers or inspect sea conditions at the selected location.
HARİTA / OPENSTREETMAP|MAP / OPENSTREETMAP
HARİTA KATMANI|MAP LAYER
SEÇİLEN NOKTA|SELECTED POINT
KAYNAK: OPENSTREETMAP|SOURCE: OPENSTREETMAP
UYDU GÖRÜNTÜSÜ ≠ ATIK TESPİTİ|SATELLITE IMAGE ≠ WASTE DETECTION
Nokta seçmek için haritaya tıkla; sürükleyerek gez, + / − ile yakınlaştır.|Click to select a point, drag to explore, and use + / − to zoom.
Katmanlar|Layers
Araştırma · uydu · vektörler|Research · satellite · vectors
Rüzgâr ve akıntı alanı|Wind and current fields
İleri kontrol|Advanced controls
Model vektörleri|Model vectors
Model saati (UTC)|Model time (UTC)
Güncel saat|Current hour
+3 saat|+3 hours
+6 saat|+6 hours
+12 saat|+12 hours
+24 saat|+24 hours
Rüzgâr alanı (açık mavi)|Wind field (light blue)
Akıntı alanı (yeşil)|Current field (green)
Kapalı|Off
Oklar hareket yönünü gösterir; rüzgâr verisi geldiği yönden çevrilir. Noktalar seçili konum çevresindeki sınırlı model örnekleridir. Değer için okun üzerine gelin veya odaklanın.|Arrows show the direction of movement; wind bearings are converted from their incoming direction. Points are limited model samples around your location. Hover over or focus an arrow for its value.
HARİTAYI TAŞI|MOVE THE MAP
SAYFAYI KAYDIR|SCROLL THE PAGE
Haritayı sürükle; sayfayı kaydırmak için SAYFAYI KAYDIR seç.|Drag the map; choose SCROLL THE PAGE to scroll again.
Haritada gezinmek için HARİTAYI TAŞI seç; + / − ile yakınlaştır.|Choose MOVE THE MAP to explore; use + / − to zoom.
Uydu görüntüsü|Satellite image
Temel harita|Base map
Verileri yenile|Refresh data
CSV indir|Download CSV
Deniz koşulları|Sea conditions
BAĞLANIYOR|CONNECTING
Antalya Açıkları|Offshore Antalya
EGE|AEGEAN
KARADENİZ|BLACK SEA
DALGA YÜKSEKLİĞİ|WAVE HEIGHT
DENİZ SICAKLIĞI|SEA TEMPERATURE
AKINTI HIZI|CURRENT SPEED
RÜZGÂR HIZI|WIND SPEED
km/sa|km/h
Veri kaynaklarına bağlanılıyor…|Connecting to data sources…
BU NOKTANIN SÜRÜKLENMESİNİ GÖR ↗|EXPLORE DRIFT FROM THIS POINT
Model ve kapsam notları|Model and coverage notes
Bu ölçümler canlı API üzerinden alınan|These values come from an online API and are
model tabanlı tahminlerdir|model-based forecasts
; sahada ölçülmüş atık yoğunluğu veya doğrulanmış plastik tespiti değildir. Kıyı akıntısı verileri sınırlı doğruluğa sahiptir. Kıyı denetimi yaklaşık 1:50m Natural Earth verisini kullanır; küçük adalar ve yeni kıyı değişiklikleri eksik olabilir. Deniz modeli en yakın uygun hücreyi kullanabilir.|; they are not field measurements of waste density or confirmed plastic detections. Coastal currents have limited accuracy. Coast checks use approximate 1:50m Natural Earth data; small islands and recent coastline changes may be missing. The marine model may select the nearest suitable cell.
Uydu analizi|Satellite analysis
Görüntü kataloğu|Image catalogue
Seçilen nokta çevresindeki son 30 günün uydu sahnelerini bul. Sahne bulutluluğu tüm görüntüye aittir; listelenmesi atık tespiti değildir.|Find satellite scenes from the last 30 days around the selected point. Cloud cover describes the whole scene; a listed scene is not a waste detection.
Uydu sahnelerini ara|Search satellite scenes
Seçilen konum için katalog araması yapılmadı.|No catalogue search for this location yet.
Spektral inceleme|Spectral inspection
Seçili noktanın çevresindeki yaklaşık 1 km² alanda son 45 günden sahne bulutluluğu %30 veya daha düşük ilk uygun Sentinel-2 sahnesinin bantlarını işle. Renkler yalnızca göreceli FDI değerleridir; çöp tespiti veya güven düzeyi değildir.|Process bands from the first suitable Sentinel-2 scene in the last 45 days with scene cloud cover at or below 30%, over about 1 km² around this point. Colours show relative FDI values, not waste detections or confidence levels.
Bölgeyi analiz et|Analyse this area
Katmanı kaldır|Remove layer
Seçili nokta için analiz yapılmadı.|No analysis for this point yet.
İki tarihi karşılaştır|Compare two dates
Aynı bölgenin iki uygun Sentinel-2 sahnesini incele. Görüntülerdeki değişim, çöp tespiti veya atığın yeni olduğunu göstermez.|Inspect two suitable Sentinel-2 scenes of the same area. Changes in the images do not establish waste detection or the age of waste.
Henüz karşılaştırma yapılmadı.|No comparison yet.
Harita katmanı|Map layer
Aynı sahnenin uydu fotoğrafı|Satellite photo from the same scene
Deneysel FDI farkı|Experimental FDI difference
Analizden sonra spektral inceleme noktaları burada görünür.|Spectral inspection points appear here after analysis.
Seçili noktayı incele|Inspect the selected point
İNCELEME NOKTASI — ATIK OLDUĞU DOĞRULANMADI|INSPECTION POINT — WASTE NOT CONFIRMED
Sürüklenmeyi incele|Explore drift
Saha açıklaması|Field notes
Saha fotoğrafı (isteğe bağlı, JPEG/PNG, en fazla 1 MB)|Field photo (optional, JPEG/PNG, up to 1 MB)
Bildirim durumu|Report status
İncelenmemiş kullanıcı bildirimi|Unreviewed user report
Fotoğraflı saha bildirimi (kullanıcı beyanı)|Field report with photo (user statement)
Bu bilgisayara kaydet|Save on this computer
Gözlem henüz kaydedilmedi.|Observation not saved yet.
Yerel bildirimler|Local reports
Bu bilgisayarda|On this computer
Yerel kayıtlar yükleniyor…|Loading local reports…
SÜRÜKLENME MODELİ|DRIFT MODEL
Hareketi öngör.|Explore the movement.
Seçili konum için akıntı ve rüzgâr girdileriyle varsayımsal sürüklenme senaryosunu inceleyin.|Explore a hypothetical drift scenario from the selected location using current and wind inputs.
Senaryo ayarları|Scenario settings
Model girdileri|Model inputs
SEÇİLEN KONUM|SELECTED LOCATION
TAHMİN SÜRESİ|FORECAST DURATION
3 SAAT|3 HOURS
6 SAAT|6 HOURS
12 SAAT|12 HOURS
24 SAAT|24 HOURS
RÜZGÂR SÜRÜKLENME KATSAYISI (VARSAYIM)|WINDAGE COEFFICIENT (ASSUMPTION)
%0 — SADECE AKINTI|0% — CURRENT ONLY
%1 — DÜŞÜK RÜZGÂR ETKİSİ|1% — LOW WINDAGE
%3 — YÜKSEK RÜZGÂR ETKİSİ|3% — HIGH WINDAGE
Rotayı haritada göster|Show trajectory on the map
Alan verileriyle hesapla · deneysel|Calculate with spatial fields · experimental
Alan modelinin sınırları|Spatial model limitations
Alan tahmini için çevredeki model hücreleri sorgulanır. Eski tarihli uydu görüntüsündeki bir noktanın bugünkü konumu bilinmez; bu işlem geçmişten bugüne takip yapmaz.|The spatial forecast queries surrounding model cells. The current position of a point seen in an older satellite image is unknown; this does not track it from the past to the present.
Noktasal modelin sınırları|Point model limitations
Bu basitleştirilmiş noktasal tahmin başlangıç konumundaki saatlik API vektörlerini kullanır. Saatlik veriler arasında vektörler 15 dakikalık adımlarla hesaplanır; yaklaşık kıyı maskesine ulaşınca rota durur. Yeni konumlarda akıntı yeniden örneklenmez; gerçek atık konumu veya toplama rotası olarak kullanılamaz.|This simplified point forecast uses hourly API vectors at the starting location. Vectors are interpolated in 15-minute steps; the trajectory stops at the approximate coast mask. Currents are not resampled at new locations. This is not an actual waste location or a collection route.
Model sonucu|Model result
VERİ BEKLENİYOR|WAITING FOR DATA
Önce canlı deniz verisinin gelmesini bekle, ardından tahmini hesapla. Sonuçlar gerçek tahmin girdilerine dayalı basitleştirilmiş bir modeldir.|Wait for sea data, then calculate the forecast. Results are a simplified model based on actual forecast inputs.
Kaynaklar ve yöntem|Sources and method
Araştırma notları|Research notes
Katman tarihleri ve birimleri farklıdır. Araştırma sonuçları saha teyidi gerektirir. Veriler, kaynaklarının kapsam ve çözünürlük sınırlarıyla sunulur.|Layers have different dates and units. Research results require field verification. Data retain the coverage and resolution limitations of their sources.
GPGP · Lebreton ve Reisser|GPGP · Lebreton and Reisser
Gözlemle.|Observe.
NASA GIBS servisinden gerçek tarihli MODIS uydu görüntülerini harita üzerinde görüntüle. Görüntü tarihini ve kaynağını şeffaf biçimde sun.|View dated MODIS satellite imagery from NASA GIBS on the map, with its requested date and source clearly identified.
Yorumla.|Interpret.
Open-Meteo deniz ve hava tahminlerinden dalga, yüzey sıcaklığı, akıntı ve rüzgâr verilerini koordinata göre sorgula.|Query wave, sea-surface temperature, current and wind forecasts from Open-Meteo at your coordinates.
Öngör.|Anticipate.
Akıntı ve rüzgâr girdileriyle varsayımsal sürüklenme analizi yap. Gerçek plastik algılama için ayrı bir uydu görüntüsü işleme ve doğrulama modeli gereklidir.|Explore hypothetical drift using current and wind inputs. Actual plastic detection requires separate satellite image processing and validation.
Okyanus araştırma platformu|Ocean research workspace
Kaynaklar ve araştırma notları ↗|Sources and research notes
Deneyim|Experience
Standart|Standard
BAKIŞ AÇINI SEÇ|CHOOSE YOUR PERSPECTIVE
Okyanus büyük.|A vast ocean.
Odağın sana özel.|A workspace of your own.
Aynı veriler, sana uygun bir çalışma alanı. Dilini ve başlangıç düzenini seç; dilediğinde değiştir.|The same data, a workspace that suits you. Choose your language and starting layout. Change them whenever you like.
Nasıl çalışmak istersin?|How would you like to work?
Keşfetmeye başla.|Start exploring.
Harita ön planda. Deniz koşulları açık, diğer araçlar ihtiyacın olduğunda elinin altında.|The map comes first. Sea conditions are open, with every other tool ready when you need it.
SADE BAŞLANGIÇ|A SIMPLE START
Veriye yakından bak.|Look closer at the data.
Araştırma katmanları ve uydu analizi açık. Karşılaştırma ve model araçlarına hızlı geçiş.|Research layers and satellite analysis are open. Move easily into comparisons and modelling.
ANALİZ ODAKLI|FOCUSED ON ANALYSIS
Kontrolü genişlet.|Expand your perspective.
Vektörler, karşılaştırma ve kayıt panelleri de açık. Daha fazla ayrıntı, tek çalışma alanı.|Vectors, comparisons and reports are open too. More detail in one workspace.
GENİŞ ÇALIŞMA ALANI|THE EXPANDED WORKSPACE
Üç düzen de tüm araçlara erişir. Seçimin yalnızca başlangıçta açık olan panelleri değiştirir ve bu tarayıcıda hatırlanır.|Every layout includes all tools. Your choice only changes which panels start open and is remembered in this browser.
Çalışma alanını aç|Enter the workspace
Araştırma verileri ve varsayımsal modeller. Anlık çöp konumu veya doğrulanmış atık tespiti değildir.|Research data and hypothetical models. Not real-time waste locations or confirmed waste detections.
Düzeni ve dili değiştir|Change layout and language
Sade başlangıç · Tüm araçlar açılır panellerde.|A simple start · All tools are available in expandable panels.
Analiz odaklı · Katmanlar ve uydu analizi açık.|Focused on analysis · Layers and satellite analysis are open.
Geniş çalışma alanı · İleri kontroller açık.|Expanded workspace · Advanced controls are open.
Büyük Pasifik Birikimi — tarihî araştırma katmanı (2018)|Great Pacific Garbage Patch — historical research layer (2018)
Modellenmiş mikroplastik kütle yoğunluğu sınırları. Güncel gözlem tarihi belirtilmez.|Modelled microplastic mass-density contours. No present-day observation date is implied.
Büyük Pasifik Birikimine Git|Go to the Great Pacific Garbage Patch
Katman kapalı. Kaynak çizgisine tıklayarak araştırma bilgilerini açabilirsiniz.|Layer off. Click a contour to view its research details.
Kütle yoğunluğu · tüm boyut sınıfları (2018 modeli)|Mass density · all size classes (2018 model)
Lebreton ve diğerleri (2018) · tarihî modellenmiş kütle yoğunluğu.|Lebreton et al. (2018) · historical modelled mass density.
Yoğunluk katmanı kapalı.|Density layer off.
Kaynak · Lebreton & Reisser / Figshare|Source · Lebreton & Reisser / Figshare
Büyük Pasifik Birikimi · tarihî model / araştırma|Great Pacific Garbage Patch · historical model / research
Kaynak · Lebreton ve Reisser, Figshare v2|Source · Lebreton and Reisser, Figshare v2
Makale · Scientific Reports 8, 4666 (2018)|Paper · Scientific Reports 8, 4666 (2018)
Lisans · CC BY 4.0|Licence · CC BY 4.0
Shapefile → GeoJSON biçim dönüşümü. Özgün WGS84 çizgileri korunmuştur.|Converted from Shapefile to GeoJSON. Original WGS84 contours are preserved.
Araştırma sınırları yükleniyor…|Loading research contours…
Tarihî araştırma katmanı açık · 2018 · çizgiler 10, 100 ve 1000 g/km² mikroplastik eşikleridir.|Historical research layer on · 2018 · contours are microplastic thresholds of 10, 100 and 1000 g/km².
Araştırma sınırları yüklenemedi. Tekrar açarak deneyebilirsiniz.|Could not load research contours. Toggle the layer to try again.
Katman kapalı.|Layer off.
Tüm boyut sınıfları · g/km²|All size classes · g/km²
Aralıklar alt sınır dâhil, üst sınır hariçtir. Eksik veri şeffaftır. Renkler logaritmik aralıklarla gösterilir.|Ranges include the lower bound and exclude the upper bound. Missing data are transparent. Colours use logarithmic intervals.
Yerel yoğunluk verisi yükleniyor…|Loading local density data…
Tüm boyut sınıfları · tarihî modellenmiş kütle yoğunluğu (2018) · g/km².|All size classes · historical modelled mass density (2018) · g/km².
Yoğunluk verisi yüklenemedi. Tekrar açarak deneyebilirsiniz.|Could not load density data. Toggle the layer to try again.
CYGNSS · Kuzey Pasifik|CYGNSS · North Pacific
25–30° K, 150–145° B ile sınırlı yoğunluk örneği. Yaklaşık 1° alan ve 30 günlük ortalama.|Density sample limited to 25–30° N, 150–145° W. An average over about 1° and 30 days.
CYGNSS Örnek Bölgesine Git|Go to the CYGNSS sample region
CYGNSS katmanı kapalı.|CYGNSS layer off.
Veri tarihi ve aylık kontrol|Data date and monthly checks
Gösterilen veri|Displayed data
Katmanı açın|Open the layer
Katalogda son görülen veri|Latest data seen in the catalogue
Henüz okunmadı|Not read yet
Son başarılı kontrol|Last successful check
Son başarısız deneme|Last failed attempt
Sonraki kontrol|Next check
Aylık kontrol bilgisi katmanla birlikte yüklenir.|Monthly check details load with the layer.
Yerel veriyi yenile|Reload local data
NASA PO.DAAC / CYGNSS V3.2 · kaynak|NASA PO.DAAC / CYGNSS V3.2 · source
CYGNSS · Kuzey Pasifik örneği|CYGNSS · North Pacific sample
30 gün ve yaklaşık 1° alanda ortalama. Kareler 0,25° yayın ızgarasını gösterir.|Average over 30 days and about 1°. Squares show the 0.25° publication grid.
CYGNSS mikroplastik yoğunluğu · adet/km²|CYGNSS microplastic density · items/km²
Alt sınırlar dâhil, üst sınırlar hariçtir. Eksik hücreler çizilmez.|Lower bounds included; upper bounds excluded. Missing cells are not drawn.
Bilgi yok|No information
Başarılı kontrol yok|No successful check
Kayıtlı başarısız deneme yok|No recorded failed attempt
Plan bilgisi okunamadı|Schedule could not be read
Planlı kontrol zamanı geçti. Son doğrulanan bölgesel veri gösteriliyor.|The scheduled check is overdue. Displaying the last validated regional data.
Son kontrol başarılı. Gösterilen veri katalogdaki son doğrulanan tarihle eşleşiyor.|Last check successful. Displayed data match the latest validated catalogue date.
Kaynak erişimi bekleniyor. Son sağlam veri gösteriliyor.|Awaiting source access. Displaying the last good data.
Son güncelleme denemesi başarısız. Son sağlam veri gösteriliyor.|Last update attempt failed. Displaying the last good data.
Aylık kontrol bilgisi bu veri sürümü için doğrulanamadı.|Monthly check information could not be verified for this data version.
Son veri dosyası okunamadı. Son sağlam bölgesel örnek gösteriliyor.|Latest data file could not be read. Displaying the last good regional sample.
CYGNSS örneği yükleniyor…|Loading the CYGNSS sample…
CYGNSS örneği yüklenemedi. Tekrar açarak deneyebilirsiniz.|Could not load the CYGNSS sample. Toggle the layer to try again.
YÜKLENİYOR|LOADING
Deniz ve rüzgâr verileri yükleniyor…|Loading sea and wind data…
Güncel veriler yükleniyor…|Loading current data…
HARİTA HATASI|MAP ERROR
Harita kütüphanesi yüklenemedi. İnternet bağlantısını kontrol edin.|Could not load the map library. Check your internet connection.
Uydu görüntüsü · NASA MODIS|Satellite image · NASA MODIS
Harita · OpenStreetMap|Map · OpenStreetMap
NASA KATMANI YÜKLENEMEDİ|NASA LAYER FAILED TO LOAD
UYDU KATMANI|SATELLITE LAYER
HARİTA KISMEN YÜKLENEMEDİ|MAP PARTIALLY FAILED TO LOAD
Seçilen Koordinat|Selected coordinates
İnceleme Noktası|Inspection point
KIYI VERİSİ HATASI|COAST DATA ERROR
Kıyı maskesi yüklenemedi. Sayfayı yenileyip tekrar deneyin.|Could not load the coast mask. Refresh the page and try again.
Kıyı maskesi yüklenmediği için tahmin oluşturulamadı.|A forecast could not be generated because the coast mask did not load.
KARA NOKTASI|LAND POINT
Seçilen nokta yaklaşık kara maskesinde. Haritadan bir deniz noktası seçin.|This point falls within the approximate land mask. Select a point at sea.
Kara noktasından sürüklenme tahmini yapılamaz.|Cannot forecast drift from a point on land.
Deniz ve rüzgâr istekleri başarısız oldu. Bağlantınızı kontrol edip tekrar deneyin.|Sea and wind requests failed. Check your connection and try again.
Deniz verisi isteği başarısız oldu. Bağlantıyı veya veri kapsamını kontrol edip tekrar deneyin.|The sea data request failed. Check your connection or data coverage and try again.
Rüzgâr verisi isteği başarısız oldu. Tekrar deneyin.|The wind data request failed. Try again.
İSTEK BAŞARISIZ|REQUEST FAILED
DENİZ VERİSİ YOK|NO SEA DATA
Bu koordinat için deniz verisi bulunamadı. Haritadan başka bir deniz noktası seçin.|No sea data were found at these coordinates. Select another point at sea.
VERİ HAZIR|DATA READY
Kaynak:|Source:
Seçilen koordinat:|Selected coordinates:
Deniz model hücresi:|Marine model cell:
Model zamanı:|Model time:
Arayüz güncelleme zamanı:|Interface updated:
Yeterli saatlik akıntı veya rüzgâr verisi yok; tahmin oluşturulamadı.|Not enough hourly current or wind data to generate a forecast.
EKSİK VERİ|MISSING DATA
HESAPLANDI|CALCULATED
Başlangıç|Start
Bitiş|End
Tahmini kıyı teması|Estimated coast contact
Önce geçerli deniz ve rüzgâr verilerinin yüklenmesini bekleyin.|Wait for valid sea and wind data to load first.
Bu konum alan örnekleme kapsamı dışında.|This location is outside the spatial sampling coverage.
Çevredeki akıntı ve rüzgâr model hücreleri yükleniyor…|Loading surrounding current and wind model cells…
DENEYSEL ALAN TAHMİNİ|EXPERIMENTAL SPATIAL FORECAST
Bu bilgisayarda henüz bildirim yok.|No reports on this computer yet.
Kullanıcının saha fotoğrafı|User field photo
BİLDİRİMİ GÜNCELLE|EDIT REPORT
BİLDİRİMİ SİL|DELETE REPORT
FOTOĞRAFI KALDIR|REMOVE PHOTO
Bu bilgisayarda saklanır.|Stored on this computer.
Gözlem kaydedildi.|Observation saved.
Gözlem güncellendi.|Observation updated.
Bildirim silindi.|Report deleted.
Silme iptal edildi.|Deletion cancelled.
Fotoğraf kaldırma iptal edildi.|Photo removal cancelled.
Fotoğraf kaldırıldı.|Photo removed.
Kullanıcının fotoğraflı saha bildirimi|User field report with photo
Kullanıcının seçtiği konum; otomatik atık tespiti değildir.|User-selected location; not an automatic waste detection.
Seçili konum için analiz yapılmadı.|No analysis for this location yet.
İki tarih için sahneler aranıyor ve işleniyor; birkaç dakika sürebilir…|Searching and processing scenes for two dates; this may take a few minutes…
Sentinel-2 bantları indiriliyor ve işleniyor; bu işlem biraz sürebilir…|Downloading and processing Sentinel-2 bands; this may take a while…
Geçerli veri az; karşılaştırma yapılamıyor.|Too little valid data for comparison.
Pozitif yüksek FDI noktası bulunmadı; bu, atık bulunmadığını kanıtlamaz.|No high positive FDI points found; this does not prove that waste is absent.
Bildirimler ve fotoğraflar yalnızca bu bilgisayarda saklanır.|Reports and photos are stored only on this computer.
Ana gezinme|Main navigation
Dil / Language|Language / Dil
Vektör katmanları|Vector layers
Tüm boyut sınıfları kütle yoğunluğu renk açıklaması|All size classes mass-density legend
CYGNSS adet/km² renk açıklaması|CYGNSS items/km² colour legend
Yakınlaştır|Zoom in
Uzaklaştır|Zoom out
`;
  const dictionary=new Map(entries.trim().split('\n').filter(Boolean).map(line=>{const i=line.indexOf('|');return[line.slice(0,i),line.slice(i+1)]}));
  dictionary.set('Yapay zekâ adayı','AI candidate');
  dictionary.set('Bu uydu adayı için güncel başlangıç varsayımı gerekli.','A current-start assumption is required for this satellite candidate.');
  dictionary.set('Bu aday için kaynak bilgisi korunan çoklu senaryoyu kullanın.','Use the multi-particle scenarios that retain this candidate’s source information.');
  const extra=`
Yayılım senaryoları|Dispersion scenarios
Deneysel · 24 saat|Experimental · 24 hours
Tek rota yerine olası hareketler.|Explore possible movements.
Seçilen deniz noktasının çevresinden 25 sanal parçacık başlatın. Akıntı ve rüzgârın farklı etkilerini aynı haritada inceleyin.|Release 25 virtual particles around the selected point. Explore different current and wind effects on the same map.
Senaryoları hesapla ↗|Calculate scenarios
Senaryo zamanı|Scenario time
6 saat|6 hours
12 saat|12 hours
24 saat|24 hours
Haritada gör ↑|View on map
Katmanı temizle|Clear layer
Senaryoyu indir|Download scenario
Hesaplanmadı. Başlangıç, seçili noktanın bugün bulunduğu varsayılan konumudur.|Not calculated. The selected point is assumed to be the starting location today.
Varsayımlar ve veri kaynakları|Assumptions and data sources
Başlangıç noktaları seçili koordinatın doğu–batı ve kuzey–güney yönlerinde ±500 m çevresinde bir kare oluşturur. Bu yayılım ölçülmüş belirsizlik değildir. Her senaryoda aynı 25 başlangıç kullanılır; rüzgâr etkileri %0, %1 ve %3 varsayımlarıdır.|Starting points form a square extending ±500 m east–west and north–south from the selected location. This spread is not measured uncertainty. Each scenario uses the same 25 starts, with assumed windage of 0%, 1% and 3%.
15 dakikalık orta nokta adımlarında en yakın model hücresi yeniden seçilir, saatlik hız vektörleri zaman içinde ara değerlerle hesaplanır. Akıntı/rüzgâr alanı sınırlı ve kabadır; kıyı maskesi yaklaşık Natural Earth verisidir. Dalgaların Stokes sürüklenmesi, batma ve nesne özellikleri modellenmez.|The nearest model cell is reselected at 15-minute midpoint steps, with hourly velocity vectors interpolated over time. The current/wind field is limited and coarse; the coast mask uses approximate Natural Earth data. Wave Stokes drift, sinking and object properties are not modelled.
Boyanan alan, kullanılabilir senaryo noktalarının dış sınırıdır; bir güven aralığı veya olasılık haritası değildir. Nokta bilgileri durma zamanını gösterir. Alan dışına çıkan ve verisi eksilen parçacıklar için son bilinen hesaplama konumu gösterilir.|The shaded area is the outer boundary of available scenario points, not a confidence interval or probability map. Point details show the stopping time. Particles leaving the field or losing data are shown at their last calculated location.
Eski uydu görüntüleri, CYGNSS ve GPGP katmanları güncel başlangıç konumu sağlamaz. Bu özellik geçmişten bugüne takip yapmaz; sahada atık bulunduğunu doğrulamaz. Tahminler bağımsız saha verisiyle henüz doğrulanmadı.|Older satellite images, CYGNSS and GPGP layers do not provide present-day starting positions. This does not track from the past to the present or confirm waste in the field. Forecasts have not yet been validated against independent field data.
Yöntem referansı · DEEP-PLAST|Method reference · DEEP-PLAST
Hesaplanan konum|Calculated location
Yaklaşık kıyı maskesinde durdu|Stopped at the approximate coast mask
Başlangıç kara maskesinde|Start within the land mask
Model verisi yetersiz; son hesaplanan konum|Insufficient model data; last calculated location
Sorgulanan alanın dışına çıkacak; son hesaplanan konum|Would leave the queried area; last calculated location
Kıyı geçişi doğrulanamadı; son hesaplanan konum|Coast crossing not verified; last calculated location
Hesaplama tamamlanamadı|Calculation incomplete
Deneysel senaryo; atık varlığı veya gerçek konumu doğrulanmadı.|Experimental scenario; waste presence or actual location not verified.
Konum veya girdiler değişti. Yeni başlangıç için senaryoları hesaplayın.|Location or inputs changed. Calculate scenarios for the new start.
Çevredeki saatlik akıntı ve rüzgâr alanları yükleniyor…|Loading surrounding hourly current and wind fields…
Kıyı maskesi yüklenemedi.|Could not load the coast mask.
Başlangıç kara maskesinde; deniz noktası seçin.|The start is within the land mask; select a sea point.
Veri isteği zaman aşımına uğradı. Tekrar deneyin.|Data request timed out. Try again.
Copernicus kataloğunda son 30 gün aranıyor…|Searching the last 30 days in the Copernicus catalogue…
Son 30 gün · En fazla 5 sahne · Copernicus Data Space|Last 30 days · Up to 5 scenes · Copernicus Data Space
Son 30 günde bu konum çevresinde katalog sahnesi bulunamadı.|No catalogue scenes found near this location in the last 30 days.
Katalog isteği zaman aşımına uğradı.|Catalogue request timed out.
Katalog verisine erişilemedi; tekrar deneyin.|Could not access catalogue data; try again.
Yükleniyor…|Loading…
Bu alanda geçerli vektör verisi yok|No valid vector data in this area
İstek zaman aşımına uğradı|Request timed out
Veri alınamadı; tekrar deneyin|Could not retrieve data; try again
Konum değişti; güncelleniyor…|Location changed; updating…
Analizden sonra inceleme alanları burada görünür.|Inspection areas appear here after analysis.
Kullanıcının seçimi|User selection
Kaydı güncelleyebilirsiniz.|You can edit this report.
Kullanıcının saha bildirimi|User field report
Bildirimler ve fotoğraflar yalnızca bu bilgisayarda tutulur. Silinen kayıtla birlikte kayıtlı fotoğrafı da kaldırılır.|Reports and photos are stored only on this computer. Deleting a report also removes its saved photo.
YALNIZCA FOTOĞRAFI KALDIR|REMOVE PHOTO ONLY
Bu bildirimin kayıtlı fotoğrafı bu bilgisayardan kaldırılacak. Bildirim incelenmemiş kullanıcı bildirimi durumuna geçecek. Devam edilsin mi?|The saved photo will be removed from this computer. The report will become an unreviewed user report. Continue?
Bu bildirim ve kayıtlı fotoğrafı bu bilgisayardan silinecek. Devam edilsin mi?|This report and its saved photo will be deleted from this computer. Continue?
İşlem iptal edildi. Kayıt ve fotoğraf korundu.|Action cancelled. The report and photo were kept.
İşlem tamamlanamadı.|The action could not be completed.
Fotoğraf kaldırıldı. Bildirim incelenmemiş kullanıcı bildirimi durumunda korundu.|Photo removed. The report was kept as an unreviewed user report.
Bildirim ve kayıtlı fotoğrafı bu bilgisayardan silindi.|The report and its saved photo were deleted from this computer.
İşlem tamamlanamadı. Tekrar deneyin.|The action could not be completed. Try again.
Saha bildirimi için fotoğraf ve açıklama gerekli. Fotoğraf olmadan incelenmemiş kullanıcı bildirimi seçin.|A field report needs a photo and notes. Without a photo, select an unreviewed user report.
En fazla 1 MB JPEG veya PNG seçin.|Choose a JPEG or PNG up to 1 MB.
Fotoğraf okunamadı.|Could not read the photo.
Kayıt yapılamadı.|Could not save the report.
Bu bilgisayara kaydedildi. Yeni fotoğraf seçilmediyse mevcut fotoğraf korundu.|Saved on this computer. The existing photo was kept if no new photo was selected.
Kayıt servisi kullanılamıyor; siteyi 8766 portundan açın.|Local report service unavailable. Open the site through the local Node server.
Analiz sunucusu çalışmıyor. Siteyi node server.cjs ile 8766 portunda açın.|Analysis server unavailable. Open the site through the local Node server.
Analiz sunucusu yanıt vermedi.|The analysis server did not respond.
Analiz yanıtı geçersiz.|Invalid analysis response.
Analiz yapılamadı.|Analysis could not be completed.
Karşılaştırma yapılamadı.|Comparison could not be completed.
Uydu görüntüsü yanıtı geçersiz.|Invalid satellite image response.
Geri dön|Go back
belirtilmedi|not provided
belirtilmedi UTC|not provided UTC
Beklenen sayıda model hücresi alınamadı.|Did not receive the expected number of model cells.
Model birimleri, UTC zamanı veya koordinatları doğrulanamadı.|Model units, UTC time or coordinates could not be verified.
Model saatleri geçersiz veya yineleniyor.|Model timestamps are invalid or duplicated.
Aynı model hücresi için tutarsız veri alındı.|Received inconsistent data for the same model cell.
Bu bölgede geçerli model vektörü yok.|No valid model vectors in this region.
Konum model kapsamı dışında.|Location is outside model coverage.
Model isteği iptal edildi.|Model request cancelled.
Geçersiz senaryo girdisi|Invalid scenario input
Başlangıç yayılımı geçersiz|Invalid initial spread
Geçersiz gösterim saati|Invalid display time
Rota yakınında geçerli model hücresi yok|No valid model cell near the trajectory
Rota üzerinde saatlik model verisi eksik|Missing hourly model data along the trajectory
Geçersiz alansal tahmin girdisi|Invalid spatial forecast input
Seçilen nokta kara maskesinde|Selected point is within the land mask
Rota örneklenen alanın dışına çıktı|Trajectory left the sampled area
Tahmin kapsam dışında|Forecast outside coverage
Tarih çizgisini aşan rota desteklenmiyor|Trajectories crossing the date line are not supported
Kıyı geçişi doğrulanamadı|Coast crossing could not be verified
Geçerli bir Sentinel-2 konumu seçin.|Select a valid Sentinel-2 location.
Görüntü kataloğuna erişilemedi.|Could not access the image catalogue.
Katalog yanıtı geçersiz.|Invalid catalogue response.
Son 45 günde uygun bulutluluğa sahip Sentinel-2 sahnesi bulunamadı.|No Sentinel-2 scene with suitable cloud cover was found in the last 45 days.
Bu sahnenin koordinat sistemi desteklenmiyor.|This scene coordinate system is not supported.
Desteklenmeyen görüntü kaynağı.|Unsupported image source.
Seçilen alan sahne sınırına çok yakın; farklı bir nokta seçin.|This area is too close to the scene edge; select another point.
Bulut, kara veya sınır maskesi nedeniyle analiz edilebilir su pikseli kalmadı; başka bir nokta seçin.|No analysable water pixels remain after cloud, land or edge masking; select another point.
Sahnelerin analiz ızgaraları uyumlu değil.|Scene analysis grids are incompatible.
Sahnelerin konum ızgaraları eşleşmiyor; karşılaştırma yapılmadı.|Scene coordinate grids do not match; no comparison was made.
İki sahnede ortak geçerli su alanı yetersiz; karşılaştırma yapılmadı.|Insufficient common valid water area in the two scenes; no comparison was made.
Farklı tarihli iki sahne bulunamadı.|Could not find two scenes with different dates.
Geçersiz koordinat.|Invalid coordinates.
Fotoğraf kaldırma talebi true veya false olmalı.|Photo removal flag must be true or false.
Fotoğraf ekleme ve kaldırma birlikte yapılamaz.|Cannot add and remove a photo at the same time.
Yalnızca JPEG veya PNG fotoğraf yüklenebilir.|Only JPEG or PNG photos can be uploaded.
Fotoğraf 1 MB sınırını aşıyor.|Photo exceeds the 1 MB limit.
Fotoğraf biçimi doğrulanamadı.|Photo format could not be verified.
Saha bildirimi için fotoğraf ve açıklama gerekli. Fotoğrafı kaldırmak için durumu incelenmemiş kullanıcı bildirimi olarak değiştirin.|A field report needs a photo and notes. To remove the photo, change the status to an unreviewed user report.
Yerel gözlem sınırına ulaşıldı.|Local report limit reached.
Gördüğünüzü ve gözlem tarihini yazın|Describe what you saw and when you observed it
VERİ YETERSİZ|INSUFFICIENT DATA
Model verisi alınamadı|Could not retrieve model data
Yeterli model hücresi bulunamadı|Not enough model cells were found
BAŞLANGIÇ|START
BİTİŞ|END
TRAJECTORY / NOT TO SCALE|TRAJECTORY / NOT TO SCALE
Saatlik model tahmini; en yakın model hücresi. Kaynak modelinin üretim zamanı API yanıtında doğrulanmadı.|Hourly model forecast; nearest model cell. The source model production time was not verified in the API response.
Uydu fotoğrafı aynı sahnenin gerçek renk ürünüdür; yaklaşık 10 m çözünürlükte en fazla 3×3 km alan gösterir ve deniz için parlaklığı artırılmıştır. Kıyı ve bulut gölgesi hataları olabilir. FDI katmanı yaklaşık 1×1 km alanı 20 m çözünürlükte gösterir. Bulut, kara, sınıflandırılmamış alan ve görüntü kenarlarına yaklaşık 60 m güvenlik payı uygulanır; bazı etkiler maskelenemeyebilir. Atık tespiti değildir.|The satellite photo is a true-colour product from the same scene, showing up to 3×3 km at about 10 m resolution, brightened for sea visibility. Coast and cloud-shadow artefacts may occur. The FDI layer covers about 1×1 km at 20 m resolution. An approximately 60 m buffer surrounds cloud, land, unclassified areas and image edges; some effects may remain unmasked. This is not waste detection.
`;
  const more=`
Analiz edilen Sentinel-2 sahnesinin yaklaşık gerçek renkli görüntüsü|Approximate true-colour image of the analysed Sentinel-2 scene
Önceki uydu sahnesi|Earlier satellite scene
Sonraki uydu sahnesi|Later satellite scene
Katalog sayfalaması tekrarlanıyor.|Catalogue pagination is repeating.
Katalog zaman sıralaması doğrulanamadı.|Could not verify catalogue time ordering.
Katalog devam bağlantısı doğrulanamadı.|Could not verify catalogue continuation link.
Katalog tarama sınırına ulaşıldı. Bu aramada uygun sahne doğrulanamadı.|Catalogue search limit reached. No suitable scene could be verified in this search.
Görüntü arama tarihi geçersiz.|Invalid image search date.
`;
  for(const line of more.trim().split('\n')){const i=line.indexOf('|');dictionary.set(line.slice(0,i),line.slice(i+1));}
  for(const line of extra.trim().split('\n')){const i=line.indexOf('|');dictionary.set(line.slice(0,i),line.slice(i+1));}
  let language='tr';
  const originals=new WeakMap(),attributes=new WeakMap();
  const normalize=text=>text.replace(/\s+/g,' ').trim();
  const patterns=[
    [/^(.+) seçildi\. Bu konumda atık olup olmadığı henüz bilinmiyor\.$/,'$1 selected. Waste presence at this location is unknown.'],
    [/^Model servisi yanıt vermedi \(HTTP (\d+)\)\.$/,'Model service did not respond (HTTP $1).'],
    [/^NASA MODIS TRUE COLOR · İstenen uydu görüntüsü tarihi: (.+)$/,'NASA MODIS TRUE COLOR · Requested image date: $1'],
    [/^(\d+) yerel kullanıcı bildirimi$/,'$1 local user reports'],
    [/^(\d+) spektral inceleme noktası; atık olup olmadığı bilinmiyor\.$/,'$1 spectral inspection points; presence of waste is unknown.'],
    [/^İNCELEME ALANI (\d+)$/,'INSPECTION AREA $1'],
    [/^(\d+) komşu hücre · doğrulanmadı$/,'$1 neighbouring cells · unverified'],
    [/^Tarihî model \(2018\) · ELEV (\d)$/,'Historical model (2018) · ELEV $1'],
    [/^Hücre merkezi (.+)$/,'Cell centre $1'],
    [/^Mikroplastik yoğunluğu (.+) adet\/km²$/,'Microplastic density $1 items/km²'],
    [/^Örnek sayısı (.+)$/,'Sample count $1'],
    [/^(\d+) geçerli hücre · (.+) · adet\/km² · 30 günlük, yaklaşık 1° ortalama\.$/,'$1 valid cells · $2 · items/km² · 30-day average over about 1°.'],
    [/^Lebreton ve diğerleri, 2018\. ELEV (\d) çizgisi, modellenmiş mikroplastik kütle yoğunluğunun (.+) eşik değerini gösterir\. Araştırma yılı 2018’dir\. Bu katman için tek bir ölçüm tarihi verilmez\. Tüm eşikler mikroplastiklere ilişkindir\.$/,'Lebreton et al., 2018. ELEV $1 indicates a modelled microplastic mass-density threshold of $2. Research year: 2018. No single measurement date is provided for this layer. All contour thresholds refer to microplastics.'],
    [/^Seçili başlangıç: (.+) · Güncel model saati kullanılır\.$/,'Selected start: $1 · Uses the current model time.'],
    [/^%(\d+) rüzgâr etkisi$/,'$1% windage'],
    [/^(\d+)\/(\d+) ilerleyen · (\d+) kıyıda duran$/,'$1/$2 moving · $3 stopped at the coast'],
    [/^(\d+) alan dışı · (\d+) veri eksik · (\d+) karada başlangıç(.*)$/,(m,outside,missing,land,tail)=>`${outside} outside field · ${missing} missing data · ${land} land starts${tail.replace(' tamamlanamayan',' incomplete')}`],
    [/^%(\d+) rüzgâr · Parçacık (\d+)$/,'$1% windage · Particle $2'],
    [/^Konum: (.+)$/,'Position: $1'],
    [/^Hesaplanan zaman: (.+)$/,'Calculated time: $1'],
    [/^İnceleme alanı (\d+)(?:,| ·) doğrulanmadı$/,'Inspection area $1 · unverified'],
    [/^(Önceki|Sonraki): (.+) · sahne bulutluluğu %(.+)$/,(m,label,date,cloud)=>(label==='Önceki'?'Earlier: ':'Later: ')+date+' · scene cloud cover '+cloud+'%'],
    [/^(.+) · Sahne bulutluluğu: (.+) · (.+)$/,'$1 · Scene cloud cover: $2 · $3'],
    [/^(\d+) nokta · (.+)$/,'$1 points · $2'],
    [/^Rüzgâr \(geldiği yön\): (.+) km\/sa · (.+)$/,'Wind (from): $1 km/h · $2'],
    [/^Akıntı \(gittiği yön\): (.+) km\/sa · (.+)$/,'Current (towards): $1 km/h · $2'],
    [/^(.+) · (Kullanıcının fotoğraflı saha bildirimi|İncelenmemiş kullanıcı bildirimi)$/,(m,meta,label)=>meta+' · '+dictionary.get(label)],
    [/^(.+) · Bu konum güncel atık konumu olarak doğrulanmadı\.$/,(m,meta)=>(meta==='Uydu bilgisi yok'?'No satellite information':meta)+' · This is not a confirmed present-day waste location.'],
    [/^Sahne: (.+)$/,'Scene: $1'],
    [/^Pozitif FDI \((.+)\); alanın en yüksek %1 değerleri arasında birbirine komşu (\d+) hücre\. Bulut ve kara sınıflarının çevresine yaklaşık 60 m maske uygulanır\. Deneysel incelemedir; atık tespiti veya güven puanı değildir\.$/,'Positive FDI ($1); $2 neighbouring cells among the highest 1% of values in the area. An approximately 60 m mask surrounds cloud and land classes. Experimental inspection, not waste detection or a confidence score.'],
    [/^(\d+) ortak geçerli su hücresi \/ (\d+); medyan FDI değişimi (.+)\. Fark; bulut, dalga, yansıma veya farklı görüntü koşullarından kaynaklanabilir\. Çöp tespiti veya atık yaşı değildir\.$/,'$1 common valid water cells / $2; median FDI change $3. Differences may be due to cloud, waves, reflections or different imaging conditions. This is not waste detection or waste age.']
  ];
  function t(text){
    if(language!=='en')return text;
    const clean=normalize(text);let result=dictionary.get(clean);
    if(result===undefined){for(const [pattern,replacement] of patterns){if(pattern.test(clean)){result=clean.replace(pattern,replacement);break}}}
    if(result===undefined&&/^(Model başlangıcı|\d+ saat ·|Senaryo oluşturulamadı:|Tahmin oluşturulamadı:|Alan tahmini oluşturulamadı:|\d{4}-.*Sahne bulutluluğu)/.test(clean)){
      result=clean;
      const clauses=[
        ['Varsayılan kopuş merkezi:','Assumed release centre:'],[' · yarıçap ',' · radius '],['Gerçek birikim sınırı ölçümü değildir.','Not a measured accumulation boundary.'],['doğrudan rüzgâr etkisi','direct windage'],[' ilerliyor',' moving'],[' kıyıda durdu',' stopped at coast'],[' başlangıç karada',' land start'],[' veri eksik',' missing data'],[' alan dışında',' outside domain'],[' kıyı belirsiz',' coast uncertain'],[' hesap hatası',' calculation error'],[' henüz ayrılmadı',' not yet released'],['Kopuş merkezi yakınında +','Near release centre at +'],[' saat dalga modeli: yükseklik ','h wave model: height '],[' · geldiği yön ',' · from direction '],[' · periyot ',' · period '],['Ek bir dalga sürüklenme hızı uygulanmadı.','No additional wave-drift velocity was applied.'],['Bu kesime 25 km içinde dalga hücresi bulunamadı; dalga koşulları bilinmiyor.','No wave cell was found within 25 km; wave conditions are unknown.'],[' · senaryo başına ',' · per scenario '],[' sanal parçacık. Eksik veri veya kıyı nedeniyle duran parçalar belirtilir.',' virtual particles. Stops due to missing data or coast contact are shown.'],['Hesap tamamlanamadı:','Calculation did not complete:'],['Model servisi zaman aşımı.','Model service timeout.'],['bilinmiyor','unknown'],
        ['Model başlangıcı:','Model start:'],['Model başlangıcı','Model start'],['Verinin alınması:','Data retrieved:'],['farklı akıntı,','distinct current cells,'],['farklı rüzgâr hücresi.','distinct wind cells.'],
        ['Bazı parçacıkların hesabı tamamlanamadı; aşağıdaki sayıları ve son hesaplanan konumları inceleyin.','Some particles could not be fully calculated; inspect the counts and last calculated positions below.'],
        ['Tüm başlangıçlar için bu saate kadar hesap tamamlandı.','Calculations completed up to this hour for all starts.'],['Bu yayılım bir güven aralığı değildir.','This spread is not a confidence interval.'],['3 senaryo, toplam 75 parçacık.','3 scenarios, 75 particles in total.'],
        ['15 dakikalık adımlar kullanılır; akıntı konuma göre yeniden örneklenmez. Yaklaşık kıyı maskesi küçük adaları kaçırabilir. Varsayımsaldır; atık tespiti veya güvenli rota değildir.','Uses 15-minute steps; currents are not resampled by location. The approximate coast mask may miss small islands. Hypothetical, not waste detection or a safe route.'],
        ['Son koordinat:','End coordinates:'],['Senaryolar:','Scenarios:'],['belirgin bir yön olmadan','with no clear direction'],['kuzeydoğuya','northeast'],['kuzeybatıya','northwest'],['güneydoğuya','southeast'],['güneybatıya','southwest'],['kuzeye','north'],['güneye','south'],['doğuya','east'],['batıya','west'],[' saatte kıyı maskesine ulaştı',' hours to reach the coast mask'],[' saatlik tahmin','-hour forecast'],['Yaklaşık','Approximately'],['yaklaşık','approximately'],[' (kıyı)',' (coast)'],[' saat',' hours'],['son nokta','end position'],
        ['Yol boyunca çevre model hücrelerinden ara değer hesaplandı.','Interpolated surrounding model cells along the trajectory.'],['Kıyı maskesinde durdu.','Stopped at the coast mask.'],['Deneyseldir; gerçek atık konumu veya toplama rotası değildir.','Experimental; not an actual waste location or collection route.'],
        ['Yol boyunca en yakın ','Along the trajectory, the nearest '],[' akıntı ve ',' current and '],[' rüzgâr model hücresi kullanıldı',' wind model cells were used'],['; yaklaşık kıyı maskesine ulaşıldı.','; the approximate coast mask was reached.'],['15 dakikalık adımlar; model hücreleri kaba ve kıyı maskesi yaklaşıktır. Başlangıçtaki atık varlığı ve güncel konumu doğrulanmadı; gerçek takip veya güvenli toplama rotası değildir.','15-minute steps; model cells are coarse and the coast mask is approximate. Waste presence and its current location at the start have not been verified; this is not actual tracking or a safe collection route.'],
        ['Sahne bulutluluğu %','Scene cloud cover (%) '],[' geçerli / ',' valid / '],[' maskeli hücre.',' masked cells.'],['FDI aralığı','FDI range'],['renkler görecelidir, çöp veya güven skoru göstermez.','colours are relative and do not indicate waste or a confidence score.'],
        ['Senaryo oluşturulamadı:','Could not generate scenario:'],['Tahmin oluşturulamadı:','Could not generate forecast:'],['Alan tahmini oluşturulamadı:','Could not generate spatial forecast:']
      ];
      for(const [from,to] of [...dictionary].sort((a,b)=>b[0].length-a[0].length))if(from.length>24)result=result.replaceAll(from,to);
      for(const [from,to] of clauses)result=result.replaceAll(from,to);
    }
    return result===undefined?text:text.replace(text.trim(),result);
  }
  function translate(root=document.body){
    if(!root)return;
    const nodes=[];
    if(root.nodeType===Node.TEXT_NODE)nodes.push(root);
    else {const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push(walker.currentNode)}
    for(const node of nodes){
      if(!node.parentElement||node.parentElement.closest('script,style,textarea,[data-user-content],[translate=no],.language-picker'))continue;
      const current=node.nodeValue,record=originals.get(node);
      const original=record&&current===record.rendered?record.original:current;
      const rendered=t(original);originals.set(node,{original,rendered});
      if(current!==rendered)node.nodeValue=rendered;
    }
    if(root.nodeType===Node.ELEMENT_NODE||root===document.body){
      for(const el of [root,...root.querySelectorAll('[aria-label],[title],[placeholder],[alt]')]){
        if(el.closest('[data-user-content],[translate=no],.language-picker'))continue;
        let records=attributes.get(el)||{};
        for(const name of ['aria-label','title','placeholder','alt']){
          if(!el.hasAttribute(name))continue;
          const current=el.getAttribute(name),record=records[name],original=record&&record.rendered===current?record.original:current,rendered=t(original);
          records[name]={original,rendered};if(current!==rendered)el.setAttribute(name,rendered);
        }
        attributes.set(el,records);
      }
    }
  }
  const observer=new MutationObserver(changes=>{
    for(const change of changes){
      if(change.type==='characterData')translate(change.target);
      else if(change.type==='attributes')translate(change.target);
      else change.addedNodes.forEach(node=>{if(node.nodeType===Node.TEXT_NODE||node.nodeType===Node.ELEMENT_NODE)translate(node)});
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder','alt']});
  window.OdakI18n={t,translate,get language(){return language},get locale(){return language==='en'?'en-GB':'tr-TR'},setLanguage(value){
    const changed=language!==value;language=value==='en'?'en':'tr';document.documentElement.lang=language;
    document.title=t('FOCUS — Araştırma çalışma alanı');translate();
    if(changed)window.dispatchEvent(new CustomEvent('odak:language',{detail:{language}}));
  }};
})();
