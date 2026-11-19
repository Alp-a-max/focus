# FOCUS — Canva vaatlerinin ürün kabul koşulları

Kaynak: Canva FOCUS_Sunum, DAHbShpGKkg, 12 sayfa. 19 Kasım 2026 tarihinde güncel metin yeniden okundu. Sunum değiştirilmedi. Amaç vaatleri düşürmek değil, uygulama ve doğrulama işlerine dönüştürmek.

1. **Uyduyla erken tespit / konum.** Seçili bölgede gerçek Sentinel-2 bantları işlenecek; atık adayının koordinatı, görüntü tarihi, kaynak sahne ve model sürümü birlikte saklanacak. Yosun, köpük, dalga ve gemi gibi zor örneklerle hata ölçülmeden tespit doğrulanmış sayılmayacak. Tek şişe/kimyasal plastik türü iddiası yapılmayacak.
2. **Atık yoğunluğu.** Gösterilen büyüklüğün birimi ve yöntemi açık olacak. CYGNSS mikroplastik adet/km², tarihî GPGP kütle g/km² ve yapay zekâ adayı piksel sayısı birbirine dönüştürülmeyecek. Piksel sayısı plastik parça sayısı veya tonaj değildir. Aday bulunmaması temiz deniz kanıtı sayılmayacak.
3. **Gelecekte nereye gideceği.** Tespit konumu ve gözlem zamanı tahmin girdisine korunarak aktarılacak. Eski konumu bugünün konumu saymak yasak. Arşiv akıntısı/rüzgârı olmadan geçmişten bugüne iz sürüldüğü söylenmeyecek. Mevcut 6/12/24 saat hesapları, varsayımsal güncel başlangıçla ayrı tutulacak. Gelecekteki doğrulama, tarihli gerçek GPS/saha rotaları ve kalıcı konum baz çizgisiyle hata karşılaştırması gerektirir.
4. **Anlık veri / canlı harita.** Haritanın açık olmasıyla uydu gözleminin tazeliği ayrı. Görüntü zamanı, katalog kontrol zamanı, model zamanı ve arayüz güncelleme zamanı gösterilecek. Bulut/veri kesintisi açık belirtilecek. Bir ay önceki görüntü bugün gözlenmiş gibi sunulmayacak. Aylık CYGNSS kontrolü ayrı bir araştırma katmanıdır.
5. **Yüksek doğruluk.** Veri ve eşik seçimi kayıtlı olmalı; eğitim/doğrulama/test sızıntısı olmamalı. Hassasiyet, yakalama oranı, kaçırma ve yanlış alarm sayıları coğrafya, tarih ve etiket kapsamıyla raporlanmalı. Su ağırlıklı veriden hesaplanan genel doğruluk satış vaadinin kanıtı değildir. Karadeniz dışı küçük test tüm Türkiye doğruluğu sayılamaz.
6. **Doğru yer / doğru zaman ve erken geri kazanım.** İlk görüldüğü tarih, atığın denize karışma tarihi değildir. Yenilik/değişim tespiti en az iki uygun gözlem ve saha kontrolü gerektirir. Geri dönüştürülebilirlik veya değer, tek uydu görüntüsünden kesin belirlenmez; ilgili saha/numune verisi gerekir. Bu durumlar ürün verisinde bilinmiyor olarak korunacak.
7. **Abonelik / kuruluş kullanımı.** Kullanıcı kararındaki fiyatlar Standart ücretsiz, Pro 20 USD/yıl, Max 100 USD/yıl. Gerçek ödeme ve sunucu taraflı üyelik hakkı kurulmadan abonelik başlamış sayılmayacak. Bu iş tespit/tahmin çekirdeğinden ayrı takip edilir, unutulmaz.

## Bugünkü doğrulama durumu

Harita, gerçek görüntü inceleme ve deneysel 24 saat rota hesabı çalışıyor. 11 bantlı yeniden eğitilmiş küçük L2A RF modeli yeterli değil: kullanılan test bölümünde 38 atık pikselinden 8'ini buldu, 30'unu kaçırdı; bir yanlış alarm verdi. Katalog boşlukları nedeniyle eski 64 pozitifli testle doğrudan karşılaştırılamaz. Bu model üretime alınmayacak.

Yazarların yayımladığı 12 bantlı UNet++ ağırlıkları indirilip güvenli tensor dosyasına dönüştürüldü; mimariye strict yükleme geçti. Gerçek Karadeniz sahnesi üzerinde çıkarım çalıştı ve bu denemede aday üretmedi. Bu sonuç denizde atık olmadığına dair kanıt değildir. İki örnekli pilot tamamlandı: pozitif sahnede 27 doğru ve 25 yanlış pozitif, köpük kontrolündeki 91 etiketli negatifte sıfır yanlış pozitif görüldü. Bu sınırlı örnekler genel başarı oranı değildir; yüksek yerel doğruluk koşulu henüz geçilmedi. Ayrıntı ml/L2A-CEKIRDEK.md içinde. Bu aşama yazılımın çalıştığını gösterir; yüksek yerel doğruluk henüz kanıtlanmadı.

## 19 Kasım — kapsamı genişleten sonraki uygulama

Sekiz uluslararası kıyı noktasında gerçek kaynaklı çıkarım yapıldı ve ortak internet yayını eklendi. Beş açık okyanus merkezi yalnızca gezinme referansıdır. Gerçek gözlem zamanından bugüne geçmiş model alanlarında, ardından +24 saate hesap artık ayrı ve açık varsayımlı bir akıştır; nesne kimliğinin gözlemsel takibi veya bağımsız rota doğrulaması değildir. Ayrıntılar tools/KURESEL-YAYIN.md içinde. Tüm okyanus kapsamı, yüksek doğruluk ve ticari işletim koşulları halen geçilmiş sayılmaz.
