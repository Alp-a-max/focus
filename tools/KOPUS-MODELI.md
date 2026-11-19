# Birikimden ayrılan parçaların koşullu sürüklenme tahmini

Bu modül, kullanıcının belirlediği birikim kenarındaki küçük bir kopuş kesiminden parçalar ayrıldığında nerelere sürüklenebileceğini hesaplar. Kullanıcının iş hedefi budur; her parçanın görüntülerde tanınıp gerçek zamanlı takip edilmesi önkoşul değildir.

## Akış ve model

1. Haritadan veya koordinat aramasından bir deniz noktası seçilir. Bu nokta birikim tespiti sayılmaz.
2. Noktanın çevresindeki 100 m–2 km yarıçaplı daire, varsayımsal kopuş kesimi olarak onaylanır. Bu daire gerçek çöp adasının sınırı değildir.
3. Başlangıçta tek kopuşta daire üzerinde 25 sanal parçacık salınır. Altı saatlik modda ilk 6 saatin her birinde 5'er parçacık salınır. Kaynak kesimi salım sırasında sabit kabul edilir. Bu sayılar ölçülmüş parça sayısı/tonaj veya kalibre edilmiş kopuş oranı değildir.
4. Her parçanın hareket hesabı kendi salım saatinden başlar. Saatlik alanlar zaman içinde, en yakın 25 km içindeki model hücreleri konum boyunca örneklenir. 15 dakikalık orta nokta integrasyonu kullanılır.
5. Üç nesne/rüzgâr etkisi senaryosu %0, %1 ve %3 doğrudan rüzgâr sürüklenmesidir. 6, 12 ve 24 saatlik sonuçlar seçilir. Bunlar olasılık veya kalibre edilmiş güven sınırı değildir.

## Dalga katkısı

Open-Meteo Marine, `ocean_current_velocity` alanını Eulerian, dalga ve gelgit katkılarını dikkate alan deniz hızı olarak tanımlar. Bu nedenle ayrıca bir Stokes hız formülü eklemek aynı etkiyi iki kez sayabilir. Bu sürüm ek Stokes vektörü eklemez; sağlayıcının ürün tanımını açıkça kaydeder. Dalga katkısının büyüklüğü bu toplam alandan ayrı doğrulanmaz.

Saatlik `wave_height` (m), `wave_direction` (geldiği yön, derece) ve `wave_period` (s) ayrıca istenir ve başlangıç kesimine en yakın model hücresinin koşulları görüntülenir. Dalga yüksekliği/periyodu gerçek parçalanma veya kopma oranını belirleyen doğrulanmış bir denklem olarak kullanılmaz. Eksik dalga verisi bilinmiyor olarak kalır; sıfıra dönüştürülmez.

Kaynak: https://open-meteo.com/en/docs/marine-weather-api#hourly-parameter-definition . Rüzgâr: https://open-meteo.com/en/docs . Kıyı: projedeki Natural Earth 1:50m kara maskesi.

## Çıktı ve sınırlar

Arayüzde üç adım kullanılır: bölge seç, kopuşu hesapla, sonucu incele. 32°N, 145°W Kuzey Pasifik kısayolu, yukarıdaki gibi yalnız varsayımsal başlangıç seçimidir; onay kutusunu otomatik işaretlemez. Harita lejantı kaynak kesimini, hareket yönünü ve tahmini konumları açıklar; gri artı koordinat seçicisidir, atık tespiti değildir. Başlangıç ve seçili ufuk haritada etiketlenir. Başlangıçta yalnız %1 doğrudan rüzgâr etkisi gösterilir; kullanıcı %0/%1/%3 arasında geçer. Üç fizik hesabı ve dışa aktarılan üç senaryo korunur. Kalabalığı azaltmak için seçili senaryoda en fazla beş örnek yol ve hareket varsa en fazla üç yön oku çizilir; bütün salınmış parçaların hesaplanan konumları korunur. Ufuk/senaryo kontrolleri ve kaynak/tüm sonuç görünümü haritanın hemen altındadır. Sonuç özeti gerçek model başlangıcı, seçili ufuk ve kıyı/eksik veri/alan sınırı durmalarını ayırır. Bölge kartları ana haritanın altına taşınmıştır.

JSON; varsayılan kaynak kesimini, salım saatlerini, model başlangıç/alım zamanını, bütün normalize edilmiş dalga/akıntı/rüzgâr hücrelerini, üç senaryonun izlerini ve gerçek durma zamanlarını içerir. Aynı bilgilerle kaynaklı HTML raporu indirilir. Hesaplama istemcidedir; GitHub Pages üzerinde çalışır, yeni uydu tarama sunucusunun açık olmasını gerektirmez.

Sorgu alanı merkezden ±0,2° ile sınırlıdır. Bu alanın veya 25 km hücre yakınlığının dışındaki, kıyıya temas eden veya eksik veriye ulaşan parçacık durdurulur; devam etmiş gibi gösterilmez. Batma, nesne boyutu, biyolojik süreçler ve gerçek mekanik parçalanma bu sürümde modellenmez. 2018 GPGP çizgileri güncel sınır değildir; yalnızca tarihli referans olarak tutulur.

## Doğrulama

Analitik sabit akıntı testleri her parçanın yalnızca kendi salımından sonra taşındığını kontrol eder. Gelecekte salınacak parçalar erken konum olarak gösterilmez. Kıyıdaki kesirli durma zamanı, eksik alanlar, birimler ve kaynak değişimi kontrol edilir. Tarayıcı testi açık varsayım onayı, 6 saatlik salım, dalga gösterimi, kaynaklı indirme ve onay kaldırıldığında çıktının iptalini kapsar.

19 Kasım 2026 gerçek sağlayıcı denemesinde 32°N, 145°W varsayımsal kesimi, 500 m yarıçap ve ilk 6 saatlik salım kullanıldı. Üç senaryoda 30'ar sanal parçacığın tamamı 24 saatlik ufka ulaştı. Başlangıç kesimi yakınındaki +6 saat dalga modeli 2,22 m, 355° geliş yönü ve 10,75 s periyot verdi. Bu modelin gerçek veriyle çalıştığının kontrolüdür; GPS veya saha doğruluğu ölçümü değildir.
