# FOCUS — ortak çok bölgeli yayın ve tarihli hareket hesabı

19 Kasım 2026. Bu belge 20 Kasım gösterimi için çalışan akışı ve gerçek sınırlarını kaydeder.

## İnternetten kullanılan akış

`https://alp-a-max.github.io/focus/platform.html` artık ortak yayımlanmış uydu sonuçlarını okuyabilir. GitHub Pages Python çalıştırmaz: CPU çıkarımı ayrı yenileme işinde yapılır, yalnızca kaynak bilgili GeoJSON sonuçları yayımlanır. Harita yayını dakikada bir kontrol eder; hedef kaynak kontrol aralığı altı saattir. Bu, her dakika yeni uydu görüntüsü veya tüm okyanusun gerçek zamanlı taranması anlamına gelmez.

`assets/monitor-regions.json` sekiz kıyı izleme noktası ve beş açık okyanus gezinme merkezi içerir. Kıyı noktaları Karadeniz, Antalya, Belize, Cakarta, Mumbai, Rio, Cape Town ve Sidney'dir. Her çıkarım yaklaşık 1 km²'yi inceler. Bir şehir/deniz adı o bölgenin tamamının tarandığını belirtmez. Açık okyanus merkezleri kirlilik tespiti, ölçüm, güncel çöp adası sınırı veya yoğunluk katmanı değildir. Sentinel-2 sistematik açık okyanus görüntüsü sağlamaz: https://sentiwiki.copernicus.eu/web/s2-mission . Beş merkeze hayalî birikim sınırı eklenmedi.

İlk gerçek sekiz noktalı işlem tamamlandı: Karadeniz 11 Kasım, Antalya 16 Kasım, Belize 16 Kasım, Cakarta 9 Kasım, Mumbai 17 Kasım, Rio 13 Kasım, Cape Town 18 Kasım, Sidney 5 Kasım 2026 görüntüleri. Sırasıyla 0, 0, 7, 11, 2, 8, 1, 0 model adayı üretildi. Toplam 29 aday **doğrulanmış plastik değildir**. Köpük/yosun/dalga/kıyı gibi yanlış pozitifler ve kaçırmalar mümkündür. İlk küçük etiketli pilotun yanlış alarm sorunu sürer; bu sayılar doğruluk testi değildir.

Yayın; aday bulunmaması, hiç taranmaması, uygun sahne bulunamaması, son denemenin başarısız olması ve yalnızca gezinme referansı olmasını ayrı tutar. Hatalı kontrol önceki gerçek sonucu silmez veya tarihini yenilemez. Aynı sahnenin işleme zamanı değiştirilmeden yeniden kullanılması, yeni görüntü gibi gösterilmez. Açık okyanustaki beş gezinme noktasına sıfır aday değeri verilmez; değer bilinmiyordur.

## Tarihli sürüklenme

Yayımlanmış aday seçilince ayrı **Gözlem tarihinden itibaren sürüklenme** alanı açılır. Kullanıcı doğrulanmamış adayı yüzen nesne varsayımını açıkça kabul eder. Sistem gerçek görüntü zamanından bugüne yakın geçmişte arşivlenmiş akıntı/rüzgâr model alanlarını, ardından +24 saat tahmin alanlarını kullanır. Önceki güncel başlangıç varsayımı ayrı bir seçenektir ve bu işlem için zorunlu değildir.

Üç senaryo %0, %1 ve %3 rüzgâr etkisini kullanır. 15 dakikalık orta nokta adımlarında hem zaman hem konum yeniden örneklenir; akıntı hareket yönü, rüzgâr geliş yönü olarak dönüştürülür. Başlangıç yayılımı veya kalibre edilmiş olasılık verilmez. Geçmiş kesikli, gelecek düz çizgidir. Bugün için hesaplanan nokta sahada doğrulanmış konum değildir. Nesne kimliğini ardışık görüntülerle eşleştiren gerçek gözlemsel takip henüz yoktur.

En fazla 45 günlük başlangıç desteklenir; işlem başına en fazla 16 coğrafi model sorgu grubu, grupta iki sağlayıcı isteği ve dokuz nokta vardır. Her istek 30 saniye, arayüz toplam 150 saniye sınırındadır. Uzak/eksik model hücresi, alan sınırı, veri bütçesi ve yaklaşık kıyı kesişimi rotayı açık durumla durdurur. Eksik değerler sıfır akıntı yapılmaz; bugüne ulaşmayan rota için bugünkü konum üretilmez. Stokes sürüklenmesi, nesne türü, batma, biyolojik süreçler ve operasyonel denizcilik güvenliği modellenmez.

İndirilen JSON; orijinal aday kaynağını, sahne/görüntü zamanını, geçmiş/gelecek zamanlarını, çevresel sorgu aralıklarını, rüzgâr varsayımlarını, gerçek durma noktalarını ve `observational_tracking:false` bilgisini korur. `historical_advection:true` yalnızca geçmiş model alanlarında taşıma hesabını ifade eder.

Gerçek sağlayıcı denemesi: 41.6, 30.9 noktasında 11 Kasım 08:58 UTC'den 19 Kasım 2026'ya ve +24 saate üç senaryo, 12 sorgu grubuyla tamamlandı. Bu denemenin başlangıcı açıkça varsayımsal noktadır; orada çöp tespit edilmiş gibi kaydedilmedi. Sonuç Git dışındaki `ml/output/dated-drift-live-check.json` içindedir. Tekrar: `node tools/check-dated-drift.cjs`. Bu bir saha/GPS rota doğrulaması değildir.

## Yenileme ve işletim

`node tools/refresh-monitor.cjs` tüm sekiz kıyı noktasını sırayla kontrol eder. Tek nokta için `--region black-sea`; aynı sahneyi yeniden işlemek için `--force`. İzleme noktalarının koordinatı, dosya adı ve herkese açık sözleşmesi kontrol edilir. İşleyici kullanıcı kayıtları, fotoğraflar veya Earthdata kimlik bilgileri okumaz. Ağırlıklar ve bant önbelleği Git dışındadır.

`.github/workflows/monitor.yml` altı saatte bir ve elle başlatılabilen sınırlı CPU yenileme işidir. Yazarların SHA256 ile sabitlenmiş ağırlığını doğrular; yalnızca `assets/monitor-feed.json` dosyasını commit eder. `GITHUB_TOKEN` yalnızca o iş için içerik yazma yetkisini kullanır; kullanıcı token'ı kaydedilmez. Model ve önbellek Actions cache içindedir. GitHub zamanlanmış işleri geciktirebilir veya hareketsizlikte durdurabilir: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule . Başarı, Actions çalışması gerçekten tamamlandıktan sonra raporlanmalıdır.

Bot commit'inin Pages derlemesini tetiklemesine güvenilmez. Pages'teki uygulama ortak feed'i doğrudan `raw.githubusercontent.com/Alp-a-max/focus/main/assets/monitor-feed.json` üzerinden okur. Arayüz kodu değiştiğinde normal kullanıcı commit/push'ıyla Pages yayını güncellenir.

Yerel tam sürüm `npm.cmd start` ile 8772'de çalışır. İnternet yayını kişisel kayıt/yerel FDI düğmelerini çalışıyor gibi sunmaz. İsteğe bağlı yeni konumda çıkarım halen yerel tam sürümdedir; herkese açık sınırsız işlem API'si açılmadı. Hesap, abonelik hakları, ödeme ve ticari barındırma tamamlanmış değildir. Open-Meteo ücretsiz API'sinin ticari kullanım koşulları ayrıca uygulanmalıdır; bu gösterim araştırma kapsamındadır.

## Gösterim sırası

1. İnternet çalışma alanında Küresel izleme ağı ve Dünya görünümünü açın.
2. Belize, Cakarta, Mumbai, Rio veya Cape Town kartından tarihli sonucu açın. Adayların doğrulanmadığını ve taranan alanın 1 km² olduğunu belirtin.
3. Bir aday seçin; orijinal görüntü tarihini ve kaynak sahnesini gösterin.
4. Tarihli sürüklenme varsayımını kabul edip hesabı çalıştırın. Kısmi veya kıyıda durmuş sonucu tamamlanmış gibi anlatmayın.
5. Kaynaklarıyla rota JSON'unu indirin. Arayüzün yenilenme zamanını uydu gözlem zamanı diye sunmayın.

## Bitmemiş temel kabul koşulları

Tüm açık okyanusun otomatik yüksek çözünürlüklü taranması, bağımsız yerel tespit doğruluğu, farklı görüntülerde aynı nesnenin eşleştirilmesi, saha/GPS ile rota hata ölçümü ve ticari operasyon halen açık işlerdir. Bu tur, çalışan uluslararası nokta yayını ile tarihli model hesabını sağlar; bu koşullar tamamlanmış gösterilmez.
