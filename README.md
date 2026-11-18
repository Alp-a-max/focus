# ODAK

## Çoklu parçacık sürüklenme senaryoları

Sürüklenme bölümündeki **Senaryoları hesapla**, seçili güncel konum çevresindeki 25 başlangıcı %0, %1 ve %3 rüzgâr varsayımlarıyla hesaplar. 6/12/24 saatlik sonuçlar ve tamamlanamayan parçacık sayıları gösterilir. Harita katmanı temizlenebilir, bütün hesaplanan yollar JSON olarak indirilebilir. Alanlar iki toplu API isteğiyle alınır ve 15 dakika önbelleklenir. Hareket boyunca konum ve saat yeniden örneklenir.

Bu bir deneysel duyarlılık incelemesidir; olasılık veya doğrulanmış atık takibi değildir. Başlangıç yayılımı varsayımsaldır, geçmiş uydu konumlarından bugüne takip yapılmaz. Kıyı ve model kapsamı sınırlıdır. Yöntem, kaynaklar ve doğrulama sınırları [tools/DRIFT-MODELI.md](tools/DRIFT-MODELI.md) içinde açıklanır.

Harita odaklı çalışma alanında katmanlar, deniz koşulları, uydu analizi ve yerel bildirimler ayrı açılır alanlardadır. CYGNSS Kuzey Pasifik örneği 28 Ekim 2026 verisiyle doğrulandı. Aylık kontrol, yerel Earthdata yapılandırması ve doğrulama komutları [CYGNSS güncelleme belgesinde](tools/CYGNSS-GUNCELLEME.md) açıklanır. Bilimsel kapsam 25–30° K, 150–145° B bölgesi, yaklaşık 1° alan ve 30 günlük ortalamadır.

ODAK, OpenStreetMap, NASA GIBS, Sentinel-2 ve Open-Meteo kullanan yerel sunuculu bir araştırma prototipidir. Doğrulanmış otomatik atık tespiti içermez.

## Çalıştırma

Node.js 20+ kuruluysa proje klasöründe aşağıdaki komutları çalıştırın. Sunucu hazır adresini terminale yazınca http://127.0.0.1:8766 adresini açın. Sunucuyu durdurmak için Ctrl+C kullanın.

```powershell
npm install
npm start
```

PowerShell `npm.ps1` için çalıştırma ilkesi hatası verirse aynı komutları `npm.cmd install`, `npm.cmd start` ve testler için `npm.cmd test` şeklinde çalıştırın. Böylece sistemin çalıştırma ilkesini değiştirmeniz gerekmez. Doğrudan `node server.cjs` komutu da desteklenir.

8766 portu kullanımdayken sunucu anlaşılır bir mesajla ve hata çıkış koduyla kapanır. Kendi açtığınız önceki sunucuyu Ctrl+C ile durdurabilir veya PowerShell'de alternatif port seçebilirsiniz.

```powershell
$env:PELAGIC_PORT = '8767'
npm.cmd start
```

Bu durumda http://127.0.0.1:8767 adresini açın. Varsayılan porta dönmek için `Remove-Item Env:PELAGIC_PORT` çalıştırın. `PELAGIC_PORT=0` işletim sisteminden boş port ister ve seçilen adres terminalde gösterilir. Gözlem kayıtları ve fotoğraflar varsayılan olarak `data/observations.json` dosyasında saklanır. `PELAGIC_DATA_DIR` farklı bir kayıt klasörü seçer. HTTP testleri ayrı geçici klasörler ve işletim sisteminin ayırdığı boş portlar kullanır, test sunucusu kapandıktan sonra geçici klasörler temizlenir.

VS Code Live Server arayüzü açabilir. Yerel gözlem ve uydu API'leri için Node sunucusunu kullanın. Servisler ve kütüphaneler için internet gerekir. Tarayıcıda güncel Chromium, Firefox veya Safari kullanın. API anahtarı projeye gömülmemiştir.

`npm test` matematik testlerini, `npm run test:e2e` Playwright testlerini çalıştırır. Playwright yapılandırması varsayılan olarak Windows'taki Brave yolunu kullanır; farklı bilgisayarda `playwright.config.cjs` içindeki yolu değiştirin veya Playwright Chromium kullanın. Testte üretilen API verileri yalnızca test ağına yönlendirilir.

## Model ve kısıtlar

- Open-Meteo verileri model tahminidir; kullanıcı koordinatı ile model hücresi farklı olabilir. API'nin deniz hücresi seçimi bir kara/deniz doğrulaması değildir. Yaklaşık kara kontrolü Natural Earth 1:50m verisini kullanır; kıyı çizgisi güncel veya küçük adalarda doğru olmayabilir.
- Sürüklenme başlangıç noktasında sorgulanan saatlik akıntı/rüzgâr ile hesaplanır. Konum boyunca akıntı alanı güncellenmez. Saatlik vektörler arasında 15 dakikalık adımlarda zamansal enterpolasyon yapılır; yaklaşık kıyı sınırında rota durdurulur. %0, %1 ve %3 rüzgâr senaryoları karşılaştırılır; bu senaryolar istatistiksel güven aralığı veya doğrulanmış toplama rotası değildir. Rüzgâr yönü geliş yönünden hareket yönüne çevrilir; akıntı yönü hareket yönüdür. Eksik saatler için rota verilmez.
- Vektör katmanları istenirse 3×3 sorgu noktasıyla sınırlı, Open-Meteo model hücrelerinde çizilen ayrık örneklerdir. Sürekli alan veya gözlem değildir. Birim/tarih/geçerlilik kontrolünden geçmeyen vektörler gösterilmez. Örneklerin arası 0,3 enlem/boylam derecesidir; hücreler çakışabilir. Bir seçimde en çok dokuz koordinat ve etkin iki katman için iki çoklu istek yapılır; 15 dakika önbellek ve konum değişiminde 350 ms bekleme uygulanır. Konum kartı beş dakika önbellek kullanır; Yenile düğmesi bu önbelleği temizler.
- NASA GIBS MODIS True Color yalnızca görüntü katmanıdır. Ekrandaki tarih istenen görüntü tarihidir; bulut, veri boşluğu veya servis davranışı nedeniyle her pikselde gerçek görüntü elde edildiği garanti edilemez. Atık göstermez.
- Copernicus STAC üzerinden seçilen noktanın son 30 gündeki beş Sentinel-2 L2A sahnesinin tarihi ve sahne genelindeki bulutluluk oranı aranabilir. Bu katalog verileri işlenmiş atık tespiti değildir. Doğrulanmış atık veritabanı bağlı değildir. Deneysel spektral inceleme alanları ve bu bilgisayarda saklanan kullanıcı bildirimleri, doğrulanmış atık gözlemi veya güven puanı değildir. Haritadaki uyarı veri kaynağının eksikliğini belirtir; o bölgede atık bulunmadığını kanıtlamaz.
- Dekoratif 3B sahne yalnızca giriş görünürken ve sekme etkinken çalışır; 768 px altında ve azaltılmış hareket tercihinde açılmaz.

## Veri kaynakları

- [Open-Meteo Marine](https://open-meteo.com/en/docs/marine-weather-api), [Open-Meteo Weather](https://open-meteo.com/en/docs): model zamanı UTC; verinin ve API kullanımının atıf ve kullanım koşullarını kontrol edin. Ücretsiz API kullanımı özellikle ticari olmayan kullanım için sınırlandırılmıştır.
- [NASA GIBS](https://www.earthdata.nasa.gov/data/tools/gibs): MODIS Terra Corrected Reflectance True Color; gösterim amacıyla.
- [OpenStreetMap](https://www.openstreetmap.org/copyright): temel harita ve katkı sahipleri atfı.

## Atık tespiti için sonraki geliştirme aşaması

Sentinel-2 sahnelerinde tarih, kapsam, çözünürlük ve bulutluluk doğrulanmalı; atmosfer düzeltmesi ve kara/bulut/gölge maskeleri uygulanmalıdır. FDI gibi yöntemler köpük, yosun ve gemi gibi karıştırıcı örneklerle karşılaştırılmalı; bağımsız etiketli sahalar ve saha gözlemleriyle doğrulanmalıdır. Adaylar gözlem tarihi, işleme sürümü, kaynak, belirsizlik ve doğrulama durumuyla GeoJSON olarak yönetilmeli; kullanıcı bildirimleri doğrulanmış gözlemlerden ayrı tutulmalıdır. [FDI çalışması](https://www.nature.com/articles/s41598-020-62298-z) ve [spektral yorumlama uyarısı](https://repository.library.noaa.gov/view/noaa/68394/noaa_68394_DS1.pdf) başlangıç kaynaklarıdır. Bu aşama henüz uygulanmamıştır.

- [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/): kamu malı 1:50m kara verisi; küçük adaları, ayrıntılı kıyıları ve güncel değişiklikleri kaçırabilir. Kıyı için operasyonel kullanım uygun değildir.
- [Copernicus Data Space STAC](https://documentation.dataspace.copernicus.eu/APIs/STAC.html): görüntü katalog metaverisi; listedeki bulutluluk sahne geneli içindir.

## Deneysel Sentinel-2 spektral analizi

Bu özellik için Live Server'ın 5500 portu yeterli değildir; `node server.cjs` çalıştırıp `http://127.0.0.1:8766` adresini açın. Haritada bir deniz noktası seçin, veri kartındaki **Bölgeyi Analiz Et** düğmesine basın. Sunucu yalnızca yerel bilgisayara bağlanır; seçilen koordinat Sentinel-2 sahnesini bulmak üzere Earth Search ve ilgili bantları okumak üzere AWS açık veri servisine gönderilir. Copernicus şifresi veya API anahtarı bu yöntem için kullanılmaz.

Sunucu seçili nokta çevresindeki yaklaşık 1 km² için son 45 gündeki ve sahne genelinde bulutluluğu en fazla %30 olan ilk uygun Sentinel-2 L2A sahnesini Earth Search kataloğundan seçer. Seçim mevcut Copernicus sahne listesindeki tıklamaya bağlı değildir. Bulutluluk oranı tüm sahneye aittir. B08, B06, B11, SCL ve aynı sahnenin gerçek renkli TCI verileri kamuya açık COG dosyalarından bölgesel aralık istekleriyle okunur. SCL sınıfı 6 dışındaki pikseller ile bunların ve analiz kenarının yaklaşık 60 m çevresi dışlanır; sınıflandırma hatalı veya eksik olabilir ve maskenin dışındaki bulutları kapsamaz. B06/B11 20 m olduğundan spektral çıktı yaklaşık 20 m grid olarak gösterilir; uydu fotoğrafı TCI bandının yaklaşık 10 m verisidir. UTM penceresi coğrafi haritaya yaklaşık yerleştirilir.

L2A yüzey yansımasından deneysel `B08 - (B06 + (B11-B06)*((842-665)/(1610-665))*10)` yaklaşımı hesaplanır. Kullanılan yüzey yansıması, özgün makaledeki suya özgü düzeltmenin yerine geçmez; yöntem bu projede doğrulanmamıştır. Her analizde renkler yalnızca geçerli alanın kendi en düşük/en yüksek değerlerine göre ölçeklenir. Renkler çöp, birikim, olasılık veya güven skoru değildir; sahneler arası sayısal karşılaştırma için otomatik renkler kullanılmamalıdır. Yosun, köpük, gemi, dalga, yansıma, kıyı ve maskeleme hataları sonucu etkileyebilir. En az 100 geçerli piksel bulunan sahnelerde, pozitif ve ilgili alanın en yüksek %1 FDI değerleri arasında komşu en az iki hücre içeren gruplar deneysel inceleme alanı olarak önerilebilir; bu eşik bağımsız olarak doğrulanmamıştır ve herhangi bir atık olasılığı veya güven skoru göstermez. Eşik karşılanmaması atık bulunmadığını göstermez. Nokta koordinatları yaklaşık konumdadır.

Kaynaklar: [Earth Search](https://earth-search.aws.element84.com/v1/), [Sentinel-2 açık COG verisi](https://registry.opendata.aws/sentinel-2-l2a-cogs/), [FDI araştırması](https://pmc.ncbi.nlm.nih.gov/articles/PMC7181820/). Değişken hizmet erişimi ve veri kesintilerinde sistem hata mesajı verir. Gerçek atık tespiti için suya özgü düzeltme, uygun kara/bulut/gölge maskeleri, eşik ve bağımsız saha doğrulaması gereklidir.

## Uydu fotoğrafı ve kullanıcı bildirimleri
Analiz edilen sahnenin TCI görseli yaklaşık 10 m çözünürlükte, en fazla 3×3 km alanda gösterilir; analiz katmanı 1×1 km ve yaklaşık 20 m çözünürlüktedir. Sahne kenarında görüntü kesilebilir; karanlık deniz üzerinde görünürlük için parlaklık artırılır. Açıklamadaki yüksek FDI işaretleri atık tespiti değildir. Seçilen nokta kullanıcı tarafından inceleme kaydı olarak eklenebilir; fotoğraflı saha bildirimi yalnızca kullanıcının beyanıdır, kurumsal veya bağımsız doğrulama sayılmaz. Kayıtlar ve fotoğraflar sunucunun çalıştığı bilgisayardaki data/observations.json dosyasında tutulur; başka kullanıcılara otomatik paylaşılmaz, bulut yedeği ve kimlik doğrulama yoktur. Yalnızca JPEG/PNG ve 1 MB sınırı vardır. 30 kayıt sınırı uygulanır. Fotoğraf ve konum özel veri içerebilir; bu klasörün erişimini kullanıcının kontrol etmesi gerekir.

## İki tarih karşılaştırması

Analiz panelindeki İki Tarihi Karşılaştır düğmesi, son 45 günde uygun bir Sentinel-2 sahnesini ve önceki 45 günden ikinci bir sahneyi arar. Izgaraları eşleşen ve her iki sahnede geçerli olan en az 100 su hücresi gerektirir. Yan yana görseller ve medyan FDI farkı, yalnızca deneysel değişim incelemesidir; atık varlığını, türünü, yaşını veya geri dönüşüm değerini belirlemez. Sahne bulutluluğu tüm sahneye aittir; yerel bulut, dalga ve gözlem koşulları sonucu etkileyebilir. Sahneler bulunamaz veya ortak su alanı yetersizse karşılaştırma yapılmaz.

## Başlangıç ekranı, deneyim düzenleri ve dil

İlk ziyarette Türkçe / English ve Standart / Pro / Max seçimi sunulur. Bunlar çalışma alanı düzenleridir; bütün araçlar her düzende kullanılabilir. Standart haritayı ve deniz koşullarını öne çıkarır; Pro katman ve uydu analizi panellerini de açar; Max vektörler, karşılaştırma ve yerel bildirimleri de açık başlatır. Buz mavisi, deniz yeşili ve gümüş lavanta vurguları mevcut koyu ODAK kimliği içinde düzenleri ayırt eder. Açık paneller kullanıcı tarafından serbestçe kapatılabilir.

Üstteki **Deneyim / Experience** veya çalışma alanındaki **Düzeni ve dili değiştir / Change layout and language** düğmesinden seçim değiştirilebilir. Geri dön / Escape, kaydedilmiş seçime döner. Tercih yalnızca bu tarayıcı ve yerel adres için `odak-experience-v1` anahtarıyla saklanır; tarayıcı depolaması kapalı olsa da ekran çalışır. Yeni düzen seçildiğinde açık panel tercihleri yeniden uygulanır. Katmanların açık/kapalı durumları ve yüklenmiş verileri bu seçimden etkilenmez.

Arayüz metinleri, katman açıklamaları, CYGNSS tarih/sayı biçimleri, hücre bilgileri, model sonuçları ve yaygın hata/onay mesajları iki dillidir. Kullanıcının saha notları ve giriş değerleri çevrilmez; bilimsel veri ve API alanları değiştirilmez. `js/i18n.js` yeni arayüz metinleri için çeviri sözlüğü ve dinamik mesaj kalıplarını içerir. Yeni mesajlar eklenirken her iki dilde kontrol edilmelidir.

Başlangıç akışı için `tests/experience.spec.cjs`; diğer özellik testleri için kayıtlı Türkçe/Standart kullanıcı tercihlerini kuran `tests/experience-fixture.cjs` kullanılır. Testler gerçek yerel kayıtları değiştirmez: gözlem istekleri taklit edilir veya ayrı geçici sunucu/veri klasörü kullanılır.

## Deneysel alana göre sürüklenme

Sürüklenme bölümündeki **Alana Göre Tahmin Et**, seçilen konum çevresinde 3×3 koordinat için Open-Meteo deniz ve rüzgâr model hücrelerini sorgular. Her 15 dakikalık adımda güncel tahmin konumuna en yakın geçerli hücreyi kullanır ve saatlik vektörler arasında enterpolasyon yapar. Hücreler 25 km'den uzaktaysa, saatlik veriler eksikse veya rota sorgulanan alanı terk ederse tahmin iptal edilir. Kıyı kontrolü yaklaşık Natural Earth maskesine dayanır. Seçilen konumda atık bulunduğunu veya önceki uydu görüntüsünden bugüne aynı noktada kaldığını doğrulamaz; geçmişten bugüne takip yapmaz.
