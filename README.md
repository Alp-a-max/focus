# FOCUS

## Site yapısı (Kasım 2026)

- `index.html` ana sayfa, `yontem.html` model, veri, sayısal doğrulama ve kaynakça, `platform.html` harita çalışma alanı.
- `giris.html`, `kayit.html`, `hesap.html`, `yonetim.html`, `gizlilik.html` hesap ve abonelik sayfaları; sunucu tarafı `api/` (PHP 8.1+, MySQL). Kurulum: [tools/KURULUM-INFINITYFREE.md](tools/KURULUM-INFINITYFREE.md), güvenlik: [tools/GUVENLIK.md](tools/GUVENLIK.md).
- `model/` sürüklenme modelinin Python referansı ve analitik doğrulaması (`python -m unittest discover -s model`, `python model/validate.py`).
- Yayın paketi: `python tools/paketle.py` → `dist/focus-site.zip`.
- API testleri: `tests/test_api_accounts.py` (yerel PHP + MariaDB).


## Çoklu parçacık sürüklenme senaryoları

Sürüklenme bölümündeki **Senaryoları hesapla**, seçili güncel konum çevresindeki 25 başlangıcı %0, %1 ve %3 rüzgâr varsayımlarıyla hesaplar. 6/12/24 saatlik sonuçlar ve tamamlanamayan parçacık sayıları gösterilir. Harita katmanı temizlenebilir, bütün hesaplanan yollar JSON olarak indirilebilir. Alanlar iki toplu API isteğiyle alınır ve 15 dakika önbelleklenir. Hareket boyunca konum ve saat yeniden örneklenir.

Bu bir deneysel duyarlılık incelemesidir; olasılık veya doğrulanmış atık takibi değildir. Başlangıç yayılımı varsayımsaldır, geçmiş uydu konumlarından bugüne takip yapılmaz. Kıyı ve model kapsamı sınırlıdır. Yöntem, kaynaklar ve doğrulama sınırları [tools/DRIFT-MODELI.md](tools/DRIFT-MODELI.md) içinde açıklanır.

Harita odaklı çalışma alanında katmanlar, deniz koşulları, uydu analizi ve yerel bildirimler ayrı açılır alanlardadır. CYGNSS Kuzey Pasifik örneği 28 Ekim 2026 verisiyle doğrulandı. Aylık kontrol, yerel Earthdata yapılandırması ve doğrulama komutları [CYGNSS güncelleme belgesinde](tools/CYGNSS-GUNCELLEME.md) açıklanır. Bilimsel kapsam 25–30° K, 150–145° B bölgesi, yaklaşık 1° alan ve 30 günlük ortalamadır.

FOCUS, OpenStreetMap, NASA GIBS, Sentinel-2 ve Open-Meteo kullanan yerel sunuculu bir araştırma prototipidir. Doğrulanmış otomatik atık tespiti içermez.

## Çalıştırma

Node.js 20+ ile proje klasöründe `npm.cmd install`, ardından `npm.cmd start` çalıştırın. Varsayılan tam uygulama adresi http://127.0.0.1:8772. Brave'de açmak için `npm.cmd run start:browser` veya `FOCUS-BASLAT.cmd` kullanın. Başlatıcı mevcut sağlıklı FOCUS sunucusunu yeniden kullanır; diğer süreçleri kapatmaz. Yeni başlattığı sunucuyu terminalde Ctrl+C ile durdurabilirsiniz.

`index.html` tanıtım, planlanan fiyatlandırma ve ücretsiz demo girişidir; `platform.html` araştırma çalışma alanıdır. Fiyat, ufuk ve günlük/aylık hakların tek kaynağı `js/plans.js` dosyasıdır. Ücretsiz, kullandıkça öde ve üç abonelik seçeneği gösterilir. Fiyat hesabı tahmin edilen saat üzerinden tamsayı kuruşla yapılır; platformda geçirilen süre üzerinden değildir. Tek kaynak kesimi ve üç rüzgâr senaryosu birlikte bir tahmin hakkıdır. Paket ufku içinde kalan tahmin bir hak; hak biterse veya ufuk aşılırsa PAYG fiyat önizlemesi üretilir. Başarısız/hatalı tahmin ve aynı sonucu tekrar açma için ücret/hak üretilmez. Bu işlev bir önizlemedir; tahsilat veya kota defteri oluşturmaz. Ödeme, paket geçişi, hesap açma ve sunucu taraflı üyelik henüz kurulmadı. 48/72 saatlik motor planlanır; çalışan demo ufukları değişmedi. Paket seçimi ücretli üyelik başlatmaz; araştırma demosunda tüm araçlar incelenebilir. Sade / Araştırma / Gelişmiş yalnızca panel düzenidir.

Live Server 5500'de tanıtım açılabilir. Demo bağlantısı `assets/focus-runtime.json` içindeki yerel 8772 sunucusunun sağlığını kontrol eder. Hazırsa tam uygulamaya yönlendirir. Sağlık bilgisi dışında kullanıcı kayıtları ve işleme uçları farklı origin'e açılmaz. Sunucu çalışmıyorsa çalışma alanı açık bir servis uyarısı verir; HTML yanıtını JSON gibi göstermeye çalışmaz.

Farklı port için `$env:PELAGIC_PORT='8767'; npm.cmd start` kullanabilirsiniz. Live Server geçişi için `assets/focus-runtime.json` içindeki adresi de aynı porta ayarlayın. Eski `node server.cjs` komutu varsayılan 8766'yı korur; `PELAGIC_PORT=0` yalnızca doğrudan sunucu çağrısında boş port ister. Sunucu yalnızca loopback adresine bağlanır; internete yayın veya hesap sistemi değildir.

PowerShell yürütme ilkesi `npm.ps1` dosyasını engellerse `npm.cmd` kullanın; sistem ilkesini değiştirmeniz gerekmez. Kayıt ve fotoğraflar Git dışında `data/observations.json` içinde kalır. `PELAGIC_DATA_DIR` başka bir yerel klasör seçebilir. Testler geçici veri klasörleri veya taklit istekler kullanır.

`npm.cmd test` birim/API testlerini çalıştırır. Mevcut tam uygulamaya karşı arayüz denetimi:

```powershell
$env:ODAK_TEST_URL='http://127.0.0.1:8772'
npx.cmd playwright test -c tests/premium.config.cjs
```

Harita araması, kayıtlı Türkiye kıyı başlangıç noktaları ile `enlem, boylam` girişini destekler; küresel adres arama veya doğrulanmış atık veritabanı değildir. Seçilen noktadan uydu incelemesine geçilebilir. Güncel Chromium/Firefox/Safari ve haricî veri servisleri için internet gerekir.

## Model ve kısıtlar

- Open-Meteo verileri model tahminidir; kullanıcı koordinatı ile model hücresi farklı olabilir. API'nin deniz hücresi seçimi bir kara/deniz doğrulaması değildir. Yaklaşık kara kontrolü Natural Earth 1:50m verisini kullanır; kıyı çizgisi güncel veya küçük adalarda doğru olmayabilir.
- Sürüklenme başlangıç noktasında sorgulanan saatlik akıntı/rüzgâr ile hesaplanır. Konum boyunca akıntı alanı güncellenmez. Saatlik vektörler arasında 15 dakikalık adımlarda zamansal enterpolasyon yapılır; yaklaşık kıyı sınırında rota durdurulur. %0, %1 ve %3 rüzgâr senaryoları karşılaştırılır; bu senaryolar istatistiksel güven aralığı veya doğrulanmış toplama rotası değildir. Rüzgâr yönü geliş yönünden hareket yönüne çevrilir; akıntı yönü hareket yönüdür. Eksik saatler için rota verilmez.
- Vektör katmanları istenirse 3×3 sorgu noktasıyla sınırlı, Open-Meteo model hücrelerinde çizilen ayrık örneklerdir. Sürekli alan veya gözlem değildir. Birim/tarih/geçerlilik kontrolünden geçmeyen vektörler gösterilmez. Örneklerin arası 0,3 enlem/boylam derecesidir; hücreler çakışabilir. Bir seçimde en çok dokuz koordinat ve etkin iki katman için iki çoklu istek yapılır; 15 dakika önbellek ve konum değişiminde 350 ms bekleme uygulanır. Konum kartı beş dakika önbellek kullanır; Yenile düğmesi bu önbelleği temizler.
- NASA GIBS MODIS True Color yalnızca görüntü katmanıdır. Ekrandaki tarih istenen görüntü tarihidir; bulut, veri boşluğu veya servis davranışı nedeniyle her pikselde gerçek görüntü elde edildiği garanti edilemez. Atık göstermez.
- Copernicus STAC üzerinden seçilen noktanın son 30 gündeki beş Sentinel-2 L2A sahnesinin tarihi ve sahne genelindeki bulutluluk oranı aranabilir. Bu katalog verileri işlenmiş atık tespiti değildir. Doğrulanmış atık veritabanı bağlı değildir. Deneysel spektral inceleme alanları ve bu bilgisayarda saklanan kullanıcı bildirimleri, doğrulanmış atık gözlemi veya güven puanı değildir. Haritadaki uyarı veri kaynağının eksikliğini belirtir; o bölgede atık bulunmadığını kanıtlamaz.
- Girişteki rota çizimi şematiktir; gerçek atık konumu veya tahmin sonucu değildir.

## Veri kaynakları

- [Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api), [Open-Meteo Weather](https://open-meteo.com/en/docs): model zamanı UTC; verinin ve API kullanımının atıf ve kullanım koşullarını kontrol edin. Ücretsiz API kullanımı özellikle ticari olmayan kullanım için sınırlandırılmıştır.
- [NASA GIBS](https://www.earthdata.nasa.gov/data/tools/gibs): MODIS Terra Corrected Reflectance True Color; gösterim amacıyla.
- [OpenStreetMap](https://www.openstreetmap.org/copyright): temel harita ve katkı sahipleri atfı.

## Atık tespiti için sonraki geliştirme aşaması

Sentinel-2 sahnelerinde tarih, kapsam, çözünürlük ve bulutluluk doğrulanmalı; atmosfer düzeltmesi ve kara/bulut/gölge maskeleri uygulanmalıdır. FDI gibi yöntemler köpük, yosun ve gemi gibi karıştırıcı örneklerle karşılaştırılmalı; bağımsız etiketli sahalar ve saha gözlemleriyle doğrulanmalıdır. Adaylar gözlem tarihi, işleme sürümü, kaynak, belirsizlik ve doğrulama durumuyla GeoJSON olarak yönetilmeli; kullanıcı bildirimleri doğrulanmış gözlemlerden ayrı tutulmalıdır. [FDI çalışması](https://www.nature.com/articles/s41598-020-62298-z) ve [spektral yorumlama uyarısı](https://repository.library.noaa.gov/view/noaa/68394/noaa_68394_DS1.pdf) başlangıç kaynaklarıdır. Deneysel spektral inceleme ve yayımlanmış araştırma modeliyle atık adayı çıkarımı uygulanmıştır; bağımsız doğrulanmış otomatik plastik sınıflandırması henüz sağlanmamıştır.

- [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/): kamu malı 1:50m kara verisi; küçük adaları, ayrıntılı kıyıları ve güncel değişiklikleri kaçırabilir. Kıyı için operasyonel kullanım uygun değildir.
- [Copernicus Data Space STAC](https://documentation.dataspace.copernicus.eu/APIs/STAC.html): görüntü katalog metaverisi; listedeki bulutluluk sahne geneli içindir.

## Deneysel Sentinel-2 spektral analizi

Bu özellik için tam Node uygulamasını `npm.cmd start` ile açın ve `http://127.0.0.1:8772/platform.html` adresini kullanın. Haritada bir deniz noktası seçin, veri kartındaki **Bölgeyi Analiz Et** düğmesine basın. Sunucu yalnızca yerel bilgisayara bağlanır; seçilen koordinat Sentinel-2 sahnesini bulmak üzere Earth Search ve ilgili bantları okumak üzere AWS açık veri servisine gönderilir. Copernicus şifresi veya API anahtarı bu yöntem için kullanılmaz.

Sunucu seçili nokta çevresindeki yaklaşık 1 km² için son 45 gündeki ve sahne genelinde bulutluluğu en fazla %30 olan tarih sırasıyla en yeni uygun Sentinel-2 L2A sahnesini Earth Search kataloğundan seçer. `sortby=-properties.datetime` ile en fazla 5 sayfa / 100 kayıt taranır; sınır aşılırsa uygun veri bulunamadığı açıkça bildirilir. Devam bağlantısının katalog origin ve yolu doğrulanır. Sağlayıcının [STAC API açıklaması](https://earth-search.aws.element84.com/v1/api.html) esas alınır. Seçim mevcut Copernicus sahne listesindeki tıklamaya bağlı değildir. Bulutluluk oranı tüm sahneye aittir. B08, B06, B11, SCL ve aynı sahnenin gerçek renkli TCI verileri kamuya açık COG dosyalarından bölgesel aralık istekleriyle okunur. SCL sınıfı 6 dışındaki pikseller ile bunların ve analiz kenarının yaklaşık 60 m çevresi dışlanır; sınıflandırma hatalı veya eksik olabilir ve maskenin dışındaki bulutları kapsamaz. B06/B11 20 m olduğundan spektral çıktı yaklaşık 20 m grid olarak gösterilir; uydu fotoğrafı TCI bandının yaklaşık 10 m verisidir. UTM penceresi coğrafi haritaya yaklaşık yerleştirilir.

L2A yüzey yansımasından deneysel `B08 - (B06 + (B11-B06)*((842-665)/(1610-665))*10)` yaklaşımı hesaplanır. Kullanılan yüzey yansıması, özgün makaledeki suya özgü düzeltmenin yerine geçmez; yöntem bu projede doğrulanmamıştır. Her analizde renkler yalnızca geçerli alanın kendi en düşük/en yüksek değerlerine göre ölçeklenir. Renkler çöp, birikim, olasılık veya güven skoru değildir; sahneler arası sayısal karşılaştırma için otomatik renkler kullanılmamalıdır. Yosun, köpük, gemi, dalga, yansıma, kıyı ve maskeleme hataları sonucu etkileyebilir. En az 100 geçerli piksel bulunan sahnelerde, pozitif ve ilgili alanın en yüksek %1 FDI değerleri arasında komşu en az iki hücre içeren gruplar deneysel inceleme alanı olarak önerilebilir; bu eşik bağımsız olarak doğrulanmamıştır ve herhangi bir atık olasılığı veya güven skoru göstermez. Eşik karşılanmaması atık bulunmadığını göstermez. Nokta koordinatları yaklaşık konumdadır.

Kaynaklar: [Earth Search](https://earth-search.aws.element84.com/v1/), [Sentinel-2 açık COG verisi](https://registry.opendata.aws/sentinel-2-l2a-cogs/), [FDI araştırması](https://pmc.ncbi.nlm.nih.gov/articles/PMC7181820/). Değişken hizmet erişimi ve veri kesintilerinde sistem hata mesajı verir. Gerçek atık tespiti için suya özgü düzeltme, uygun kara/bulut/gölge maskeleri, eşik ve bağımsız saha doğrulaması gereklidir.

## Uydu fotoğrafı ve kullanıcı bildirimleri
Analiz edilen sahnenin TCI görseli yaklaşık 10 m çözünürlükte, en fazla 3×3 km alanda gösterilir; analiz katmanı 1×1 km ve yaklaşık 20 m çözünürlüktedir. Sahne kenarında görüntü kesilebilir; karanlık deniz üzerinde görünürlük için parlaklık artırılır. Açıklamadaki yüksek FDI işaretleri atık tespiti değildir. Seçilen nokta kullanıcı tarafından inceleme kaydı olarak eklenebilir; fotoğraflı saha bildirimi yalnızca kullanıcının beyanıdır, kurumsal veya bağımsız doğrulama sayılmaz. Kayıtlar ve fotoğraflar sunucunun çalıştığı bilgisayardaki data/observations.json dosyasında tutulur; başka kullanıcılara otomatik paylaşılmaz, bulut yedeği ve kimlik doğrulama yoktur. Yalnızca JPEG/PNG ve 1 MB sınırı vardır. 30 kayıt sınırı uygulanır. Fotoğraf ve konum özel veri içerebilir; bu klasörün erişimini kullanıcının kontrol etmesi gerekir.

## İki tarih karşılaştırması

Analiz panelindeki İki Tarihi Karşılaştır düğmesi, son 45 günde uygun bir Sentinel-2 sahnesini ve önceki 45 günden ikinci bir sahneyi arar. Izgaraları eşleşen ve her iki sahnede geçerli olan en az 100 su hücresi gerektirir. Yan yana görseller ve medyan FDI farkı, yalnızca deneysel değişim incelemesidir; atık varlığını, türünü, yaşını veya geri dönüşüm değerini belirlemez. Sahne bulutluluğu tüm sahneye aittir; yerel bulut, dalga ve gözlem koşulları sonucu etkileyebilir. Sahneler bulunamaz veya ortak su alanı yetersizse karşılaştırma yapılmaz.

## Başlangıç ekranı, deneyim düzenleri ve dil

Çalışma alanına ilk ziyarette Türkçe / English ve Sade / Araştırma / Gelişmiş seçimi sunulur. Bunlar çalışma alanı düzenleridir; bütün araçlar her düzende kullanılabilir. Sade haritayı ve deniz koşullarını öne çıkarır; Araştırma katman ve uydu analizi panellerini de açar; Gelişmiş vektörler, karşılaştırma ve yerel bildirimleri de açık başlatır. Buz mavisi, deniz yeşili ve gümüş lavanta vurguları koyu FOCUS kimliği içinde düzenleri ayırt eder. Açık paneller kullanıcı tarafından serbestçe kapatılabilir.

Üstteki **Deneyim / Experience** veya çalışma alanındaki **Düzeni ve dili değiştir / Change layout and language** düğmesinden seçim değiştirilebilir. Geri dön / Escape, kaydedilmiş seçime döner. Tercih yalnızca bu tarayıcı ve yerel adres için `odak-experience-v1` anahtarıyla saklanır; tarayıcı depolaması kapalı olsa da ekran çalışır. Yeni düzen seçildiğinde açık panel tercihleri yeniden uygulanır. Katmanların açık/kapalı durumları ve yüklenmiş verileri bu seçimden etkilenmez.

Arayüz metinleri, katman açıklamaları, CYGNSS tarih/sayı biçimleri, hücre bilgileri, model sonuçları ve yaygın hata/onay mesajları iki dillidir. Kullanıcının saha notları ve giriş değerleri çevrilmez; bilimsel veri ve API alanları değiştirilmez. `js/i18n.js` yeni arayüz metinleri için çeviri sözlüğü ve dinamik mesaj kalıplarını içerir. Yeni mesajlar eklenirken her iki dilde kontrol edilmelidir.

Başlangıç akışı için `tests/experience.spec.cjs`; diğer özellik testleri için kayıtlı Türkçe/Standart kullanıcı tercihlerini kuran `tests/experience-fixture.cjs` kullanılır. Testler gerçek yerel kayıtları değiştirmez: gözlem istekleri taklit edilir veya ayrı geçici sunucu/veri klasörü kullanılır.

## Deneysel alana göre sürüklenme

Sürüklenme bölümündeki **Alana Göre Tahmin Et**, seçilen konum çevresinde 3×3 koordinat için Open-Meteo deniz ve rüzgâr model hücrelerini sorgular. Her 15 dakikalık adımda güncel tahmin konumuna en yakın geçerli hücreyi kullanır ve saatlik vektörler arasında enterpolasyon yapar. Hücreler 25 km'den uzaktaysa, saatlik veriler eksikse veya rota sorgulanan alanı terk ederse tahmin iptal edilir. Kıyı kontrolü yaklaşık Natural Earth maskesine dayanır. Seçilen konumda atık bulunduğunu veya önceki uydu görüntüsünden bugüne aynı noktada kaldığını doğrulamaz; geçmişten bugüne takip yapmaz.


## Yapay zekâ ile tarihli atık adayları

Çalışma alanındaki ayrı araştırma paneli, gerçek 12 bantlı Sentinel-2 L2A verisini yayımlanmış UNet++ modeline bağlar. Model bu bilgisayarda hazırlandı; başka kurulumlarda [ML çekirdek belgesindeki](ml/L2A-CEKIRDEK.md) ayrı ortam/ağırlık adımları gerekir. API ve arayüzün tarih/kaynak koruması, açık güncel başlangıç varsayımı ve kontrol komutları [tespit entegrasyon belgesinde](tools/TESPIT-ENTEGRASYON.md). Gözlem eskiyse bugünkü atık konumu sayılmaz; geçmişten bugüne gerçek takip yoktur. İki örnekli pilotta doğru tespitlerle birlikte yanlış alarmlar görüldü; yüksek yerel doğruluk veya satışa hazır bilimsel doğrulama iddiası yapılmaz. [Canva ürün kabul koşulları](tools/URUN-KABUL-KOSULLARI.md) ana geliştirme ölçütüdür.

## Birikimden kopan parçaların tahmini

Haritadaki **Birikimden kopan parçalar nereye gider?** bölümü, seçilen küçük kopuş kesiminden tek seferde veya ilk altı saat boyunca ayrıldığı varsayılan sanal parçaları taşır. Üç rüzgâr etkisi senaryosu, 6/12/24 saatlik görünüm, kaynaklı JSON ve HTML raporu vardır. Dalga koşulları ayrıca gösterilir; sağlayıcının dalga katkılı toplam deniz hızına ek Stokes hızı eklenmez. Salım sayısı ve kopuş olayı varsayımdır. Kapsam ve gerçek veri denemesi [kopuş modeli belgesinde](tools/KOPUS-MODELI.md).

## Ortak çok bölgeli internet yayını ve tarihli hareket

GitHub Pages çalışma alanı, sekiz uluslararası kıyı noktasındaki gerçek Sentinel-2 çıkarım sonuçlarını ortak yayın dosyasından okur. Beş açık okyanus gezinme merkezi ayrıca gösterilir; bunlar gözlem veya çöp adası sınırı değildir. Nokta başına yaklaşık 1 km² incelenir. Otomatik işin hedef kontrol aralığı altı saattir; uydu görüntüsünün çekim zamanı ayrıca korunur.

Aday seçilince gerçek görüntü zamanından bugüne geçmiş akıntı/rüzgâr model alanlarıyla, ardından +24 saat için üç rüzgâr senaryosuyla tarihli sürüklenme hesabı yapılabilir. Bu, aynı atığın ardışık görüntülerde doğrulanmış takibi veya sahada kanıtlanmış güncel konumu değildir. Kapsam, gerçek ilk sonuçlar, kurulum ve gösterim sırası [küresel yayın belgesinde](tools/KURESEL-YAYIN.md).
