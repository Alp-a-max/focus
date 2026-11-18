# Deneysel çoklu parçacık sürüklenmesi

ODAK, seçilen güncel başlangıç noktasının çevresinden 25 sanal parçacığı 24 saat boyunca üç farklı rüzgâr etkisi varsayımıyla izler. Bu bir duyarlılık incelemesidir; kalibre edilmiş bir olasılık, doğrulanmış atık takibi veya güvenli toplama rotası değildir.

## Girdiler ve hesap

- Başlangıçlar: koordinatın kuzey/güney ve doğu/batı yönlerinde ±500 m'lik karede 5×5 düzen. Bu boyut ölçülmüş konum hatası değildir.
- Akıntı: Open-Meteo Marine üzerinden saatlik SMOC tabanlı yüzey akıntısı; rüzgâr: Open-Meteo Weather. API yanıtındaki birimler `km/h` ve `°`, zaman ofseti UTC=0 olarak doğrulanır. Kaynak modelinin üretim zamanı doğrulanmadığı için yalnızca istek ve başlangıç zamanı gösterilir.
- Seçili nokta çevresindeki 3×3 istek konumu iki toplu sorguyla alınır. Farklı parçacıklar için yeni istek yapılmaz. Aynı konum/saat için 15 dakika ve en çok sekiz alanlık önbellek kullanılır.
- Hareket = akıntı vektörü + rüzgâr etkisi × rüzgâr vektörü. Rüzgârın geldiği yön hareket yönüne çevrilir. Katsayılar %0, %1 ve %3'tür. Bir nesnenin gerçek rüzgâr etkisi olduğu iddia edilmez.
- Her 15 dakikalık orta nokta adımında konum ve zaman yeniden örneklenir. En yakın model hücresi 25 km'den uzaktaysa parçacık durdurulur. Saatlik yönler yerine doğu/kuzey hız bileşenleri arasında ara değer hesaplanır. Kesintili en yakın hücre alanında bu yöntem ek bir doğruluk garantisi sağlamaz.
- Doğal kıyı verisindeki özgün çizgi parçaları senaryo bölgesi çevresinde seçilir; basitleştirme ve koordinat yuvarlama yapılmaz. Bölgesel kesişim hesabı Akdeniz/Karadeniz'deki 80 test rotasında mevcut Turf tabanlı yöntemle karşılaştırılmıştır. Bu karşılaştırma kaynak kıyı haritasının gerçek dünyadaki doğruluğunu doğrulamaz.

## Sonuçların anlamı

6, 12 ve 24 saatlik görünümlerde her parçacığın durumu korunur: ilerleyen, yaklaşık kıyıda duran, başlangıçta karada kalan, veri eksiği bulunan, sorgulanan alan dışına çıkan veya kıyı geçişi doğrulanamayan. Tamamlanamayan parçacıkların son hesaplanan konumu ve zamanı gösterilir; seçili saate ulaşmış gibi sunulmaz.

Renkli sınır, o senaryonun ilerleyen/kıyıda duran noktalarının dışbükey zarfıdır. Aradaki tüm alanın erişilebilir olduğunu göstermez; karayı veya boşlukları kapsayabilir. Birikim bölgesi, olasılık ya da güven yüzdesi değildir. JSON indirmesi bütün hesaplanan yolları, sonlanma nedenlerini, kaynakları, birimleri ve varsayımları içerir.

## Sınırlar ve sonraki doğrulama

Alan yalnızca sorgulanan ±0,2° bölgedir. Akıntılar kaba model hücreleridir; kıyı doğruluğu sınırlıdır. Stokes sürüklenmesi, batma, parçalanma, gelgit dışı yerel süreçler ve nesne özellikleri ayrıca modellenmez. Aynı girdi tekrarlandığında aynı sonuç elde edilir; rastgele yürüyüş kullanılarak belirsizlik üretilmez.

Eski Sentinel-2, CYGNSS ve GPGP konumları bugünkü konum diye alınmaz. Geçmişten bugüne izleme henüz uygulanmamıştır. Karadeniz'de gerçek API verisinin alınması ve kodun çalışması bağımsız saha doğrulaması değildir. Gelecek adım, tarihli GPS şamandıra/saha rotalarını aynı zaman aralığındaki model girdileriyle karşılaştırmak ve mesafe hatalarını raporlamaktır. Şimdilik ürün üzerinde doğruluk yüzdesi verilmez.

## Kontroller

```powershell
node --test tests/ensemble-drift.test.js tests/forecast-data.test.js tests/ensemble-coast.test.js
npx.cmd playwright test -c tests/premium.config.cjs tests/ensemble.spec.cjs
```

Testlerde sabit akıntının beklenen mesafesi, rüzgâr yönü dönüşümü, saatlik değişim, konum boyunca hücre değişimi, kıyıda durma, alan çıkışı, eksik veriler, UTC/birim kontrolleri, ortak önbellek, arayüzde eski isteğin iptali ve mobil görünüm denetlenir. Bunlar yazılım kontrolleridir; bilimsel saha doğruluğunu ölçmez.

## Kaynaklar

- Open-Meteo Marine: https://open-meteo.com/en/docs/marine-weather-api
- Open-Meteo Weather: https://open-meteo.com/en/docs
- Natural Earth veri koşulları: https://www.naturalearthdata.com/about/terms-of-use/
- DEEP-PLAST yöntem referansı: https://doi.org/10.3390/w17223318

DEEP-PLAST makalesinin sürüklenme doğrulaması nitel düzeydedir; metindeki %2/%3 rüzgâr katsayısı tutarsızlığı doğrudan parametre olarak kopyalanmamıştır. Bu proje DEEP-PLAST yazılımını veya model ağırlıklarını içermemektedir.
