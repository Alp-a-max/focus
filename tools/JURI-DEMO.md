# FOCUS final sunum kabul durumu

Jüri bağlantısı: https://alp-a-max.github.io/focus/platform.html?demo=1

QR dosyası: assets/focus-demo-qr.svg. Bu bağlantı kurulum/düzen seçimini atlar; tüm bölgeler ve araçlar gezinilebilir.

## Çalışan akış

- Gerçek Sentinel-2 bantlarından yaklaşık 1 km² alanda araştırma modeliyle yeni aday taraması. Geçici HTTPS API sıralama, tek çalışan iş, bekleyen en fazla 3 iş, IP başına saatte 6 ve toplam günlük 120 istek uygular. Uygun görüntü olmaması hata/boş sonuçtan ayrıdır. Tarama küresel kapsam veya doğrulanmış plastik garantisi değildir.
- Sekiz kıyı noktasında ortak yayın, beş açık okyanus gezinme referansı. Kaynaklar ve gözlem tarihleri korunur.
- Seçili gözlemden geçmiş akıntı/rüzgâr alanlarıyla bugüne ve +24 saate üç sürüklenme senaryosu. Bugünkü model konumu saha/GPS doğrulaması değildir. Erken durmuş rota tamamlanmış gibi sunulmaz.
- Gerçek seçili sonuç ve varsa tarihlenmiş rota üzerinden kaynaklı, indirilebilir HTML raporu; tarayıcıdan PDF yazdırılabilir. Denetlenebilir JSON veri paketi ve GeoJSON aday dosyası.
- Kara/bulut/su maskeleri, alan/zaman/birim kontrolü, hatalı kaynağı reddetme. Bunlar veri kalite önlemleridir; ölçülmüş yüksek tespit doğruluğu iddiası değildir.

## Geçici demo sunucusu

`node tools/public-api.cjs` yalnızca localhost:8780 üzerinde çıkarım API'sini çalıştırır. Kullanıcı kayıtları, proje dosyaları ve kimlik bilgileri için yol yoktur. Cloudflare Quick Tunnel yalnızca bu servise bağlanır; 8772'deki özel kayıt sunucusu tünele bağlanmaz. Site `assets/public-api.json` içindeki HTTPS adresini sağlık kontrolünden sonra kullanır.

Bilgisayar kapanırsa/uyursa veya tünel kapanırsa yeni tarama durur. Hazır sonuçlar, istemcideki rapor ve model araçları ayrıca çalışır. Tünel adresi yeniden başlatmada değişebilir; config tekrar yayınlanmalıdır. Kalıcı ticari servis için sürekli çalışan bir sunucu ve sabit HTTPS adresi gerekir. Quick Tunnel üretim SLA'sı sağlamaz.

## Henüz sağlanmamış sunum vaatleri

- Bağımsız testte yüksek doğruluk, saha doğrulaması ve gerçek çöpün bugünkü kesin konumu: ölçüm/etiketli saha verisi gerektirir.
- LLM belediye raporu: mevcut rapor kaynaklı veri şablonudur. Bir LLM sağlayıcısı/yerel model ve çıktı doğrulaması henüz bağlı değildir.
- Gerçek kurumsal hesap, abonelik hakları, ödeme ve ücretli müşteriye API anahtarı: ödeme/kimlik hizmeti ve işletme hesabı henüz yoktur. Üyelik fiyatları plan olarak görünür.
- Tüm açık okyanusu sürekli tarama ve fiziksel toplama operasyonu: mevcut uydu kapsamı ve araştırma modelinden çıkarılamaz.

Sunumdaki bu ifadeler tamamlanmış başarı gibi kullanılmamalıdır. Sunum dosyası bu kod değişikliğinde değiştirilmedi.
