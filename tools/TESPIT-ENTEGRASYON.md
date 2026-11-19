# FOCUS — UNet++ araştırma tespit entegrasyonu

## Kapsam

Mevcut `ml/detect-pretrained.cjs` doğrudan çağrılır; ML modülü, Python dosyaları, ağırlıklar ve ham veriler bu görevde değiştirilmez. FDI, CYGNSS ve GPGP ayrı işlevlerdir. Yerel aday akışı kayıt API'sine yazmaz. Tanıtım, Canva, paketler ve ödeme akışları değiştirilmez.

## API

- `GET /api/detection/status`: `available`, `model_id`, `validation_status: research_only`.
- `GET /api/satellite/detection?lat=41.6&lon=30.9`: modülün tarih/kaynak/model sözleşmesini taşıyan GeoJSON çıktısı. Enlem ±79, boylam ±179; tek ve boş olmayan koordinat parametreleri gerekir.
- İki uç da mevcut Host/Origin korumasından geçer. Yapılandırılmış portta localhost/127.0.0.1 Host zorunludur. Origin yoksa yerel istemci kabul edilir; varsa aynı sunucunun izinli origin'lerinden biri gerekir. 5500 yalnızca sağlık bilgisini okuyabilir; tespit, hazırlık durumu ve diğer korumalı API'lere erişemez.
- Sağlık yanıtında `features.detection` ve sınırlı `detection` durum bilgisi bulunur. Bu bilgi doğruluk kanıtı veya modelin o anda boşta olduğu anlamına gelmez.
- Hatalar JSON ve sabit kodlarla döner: 400 `INVALID_COORDINATES`, 405 `METHOD_NOT_ALLOWED`, 429 `ANALYSIS_BUSY`, 503 `MODEL_UNAVAILABLE`, 504 `DETECTION_TIMEOUT`, 502 `DETECTION_FAILED`. Sağlayıcının iç hata metni/dosya yolu kullanıcıya aktarılmaz.
- Analiz, karşılaştırma ve tespit aynı pahalı işlem kilidini paylaşır. Tespit isteği 110 saniyede iptal edilir; istemci ayrılırsa da modüle AbortSignal ile iptal iletilir. Kilit gerçek işçi sonlanmadan açılmaz; iptali geciken sağlayıcıyla üst üste pahalı işlem başlatılmaz. API kabuk komutu üretmez.

## Harita ve tarihli adaydan varsayımsal tahmine geçiş

`platform.html` içinde ayrı **Yapay zekâ ile atık adayları · araştırma** paneli vardır. Arama merkezi mevcut konum seçiminden alınır. Adaylar listeden klavyeyle veya haritadan seçilebilir. İptal, temizleme, boş sonuç, hatadan tekrar deneme ve GeoJSON indirme desteklenir. Kaynak metinleri HTML olarak eklenmez; uzak bağlantı yalnızca sabit makale DOI'sine gider.

Ana sonuç gözlem ve alınma tarihini, sahneyi, kaynağı ve geçerli/maskeli piksel sayılarını gösterir. Sıfır geçerli piksel maske/eksik veri olarak belirtilir. Liste sınırlandıysa toplam küme sayısı ayrıca görünür. Ham skor ve yöntem metaverisi açılır notlardadır; güven yüzdesi üretilmez. Aday piksel sayısı atık parça sayısı veya tonaj değildir. Boş sonuç temiz deniz kanıtı sayılmaz.

Aday seçimi koordinatı, gözlem zamanını, sahne kimliğini, DOI'yi, model kimliğini ve SHA256'ları taşır. Seçim tek başına tahmin başlatmaz. **Bu koordinatı güncel başlangıç varsay** kutusu ve ardından **Varsayımsal 6 / 12 / 24 saat senaryosuna geç** işlemi gerekir. Kullanıcı senaryo bölümünde ayrıca hesaplamayı başlatır. Bu akış tarihli gözlemden bugüne takip değildir.

Kaynak aktarımı yalnızca çoklu parçacık senaryosunda desteklenir. Eski tek rota/alan modelleri bu aday kaynağından otomatik hesaplanmaz; normal elle konum seçimindeki mevcut davranışları korunur. Konum değiştiğinde aday katmanı ve eski tahmin temizlenir. Varsayım kutusu kaldırıldığında senaryo ve indirme sonucu geçersizleşir. Yalnızca aday katmanını temizlemek, daha önce açıkça onaylanmış tahminin gözlem kaynağını sessizce silmez.

GeoJSON metaverisi `selected_candidate_id`, `forecast_assumption`, `historical_tracking:false` eklerini taşır. Senaryo JSON'unda `observation_source` orijinal gözlem/konumu, `assumptions.current_start` onay türünü/zamanını/koordinatını ve `assumptions.historical_tracking:false` sınırı korur. `start_time` güncel çevresel model zamanıdır; `observation_source.observed_at` ile karıştırılmaz. Kayıtlar tarayıcı abonelik hakkı veya doğrulanmış saha tespiti oluşturmaz.

## Doğrulama ve sınırlar

`tests/detection-api.test.js` ve `tests/detection-preload.cjs` yalnızca ayrı geçici veri klasöründe, taklit modelle API/iptal/kilit/hata davranışını sınar. Ön yükleme yalnızca test Node sürecine uygulanır; üretim ML dosyasına veya model ağırlıklarına yazmaz. `tests/detection-ui.spec.cjs` taklit GeoJSON ve çevresel model yanıtlarıyla kaynak aktarımı, açık varsayım, JSON indirme, eski istekler, TR/EN, klavye, metin güvenliği ve 390 px düzenini sınar. Bu testler gerçek tespit doğruluğu veya sahada doğrulanmış başarı olarak yorumlanmaz.

Gerçek 12 bantlı çıkarım ve pozitif/zor negatif saha değerlendirmesi koordinatörün ayrı doğrulamasıdır. Geçmiş çevresel alanlarla izleme, atığın yaşı, geri dönüşüm değeri ve bağımsız yerel doğruluk bu entegrasyonla tamamlanmış sayılmaz.

Doğrulama komutları: `npm.cmd test`; ayrı geçici veri klasörü kullanan yerel test sunucusuna `ODAK_TEST_URL` ayarlayarak `npx.cmd playwright test --config tests/premium.config.cjs`. Genel turda 72 tarayıcı senaryosu ve 53 birim/API testi geçti; bozuk JSON ve son dil/erişilebilirlik ekleriyle ilgili 16 tarayıcı kontrolü ve 8 API kontrolü ayrıca geçti. Gerçek modelin yalnızca hazırlık durumu okundu (`available:true`, `russwurm2023-unetpp-seed1`); bu görevde gerçek çıkarım veya doğruluk denemesi yapılmadı. 8772 inceleme sunucusu korunur; 8773 ayrı geçici kayıt klasörlü inceleme sunucusudur ve aylık CYGNSS güncellemesi bu süreçte kapalıdır. Sunucu kodundaki değişikliklerin 8772 sürecine alınması koordinatörün son incelemesine bırakılır. Git'e yazma işlemi yapılmaz.

Bu görevin dosyaları: `server.cjs`, `platform.html`, `js/detection-ui.js`, `css/detection.css`, `js/app.js`, `js/ensemble-ui.js`, `js/i18n.js`, `tests/server-helper.cjs`, `tests/detection-preload.cjs`, `tests/detection-api.test.js`, `tests/detection-ui.spec.cjs`, `tests/map.spec.cjs` ve bu belge. Harita regresyonundaki katalog seçicisi, yeni panelden bağımsız olarak eski uydu analizi panelini hedefler.

## Koordinatörün son doğrulaması — 19 Kasım 2026

Entegrasyon sonrasında tam paket yeniden çalıştı: 62 Node birim/API ve 73 tarayıcı senaryosu geçti. ML sözleşmesinde ayrıca 8 L2A ve 5 model/aktarım testi geçti. 8772 bu çalışmaya ait sunucu güncel kodla başlatıldı. Gerçek Brave isteği 41.6, 30.9 için 11 Kasım 2026 08:58 UTC tarihli S2A_36TUM_20261111_1_L2A görüntüsünde 10.000 uygun hücreyi işledi ve aday üretmedi; arayüz bunu temiz deniz kanıtı olarak göstermedi. Ayrı iki örnekli bilimsel pilot ve sınırları ml/L2A-CEKIRDEK.md içinde. Kodlama görevindeki taklit model testleriyle gerçek çıkarım birbirinden ayrıdır.
