# FOCUS sade çalışma alanı — yerel devir

`platform.html` tek çalışma alanı açar. İlk girişte düzen/paket seçimi yoktur. Arama, koordinat, örnek ve harita tıklaması aynı `focus:location-selected` olayını kullanır. Yeni konum eski sonucu ve onayı temizler, devam eden isteği geçersiz kılar. Fizik ve ML hesabı değişmemiştir.

`js/simple-workspace.js` mevcut DOM düğümlerini Araçlar iletişim kutusuna taşır; kimlikler ve olay dinleyicileri korunur. Native `dialog` odağı sınırlar, Escape ile kapanır ve açan kontrole döner. Sekmeler ok/Home/End tuşlarını destekler. Uydu adayları, katmanlar, yayımlanmış bölgeler, koşullar, ileri analiz, yerel kayıtlar ve kaynaklar buradadır. Eski `#laboratory` / `#method` bağlantıları ilgili aracı açar. İnceleme/yerel kayıt düzenleme olayları da doğru aracı açar.

Ana kartta model uyarısı üsttedir. İlk arama açıklaması ve başarı mesajı tekrarlanmaz; hatalar ve birden fazla arama sonucu görünür. Mobilde örnek ve başlat aynı satırı paylaşır. Konum seçilince örnek düğmesi gizlenir; Kuzey Pasifik araması hâlâ kullanılabilir. Varsayım onayı, sonuç model zamanı, tarihli uydu kaynağı ve 6/12/24 saat ayrımı korunur. Ayrıntılar ve üç senaryo **Nasıl hesaplandı?** altında; JSON/HTML ayrı indirme açılımındadır.

## Önbellek ve yayın

Platformun yerel CSS/JS bağlantıları aynı `?v=20261120-onboard-1` sürümünü taşır. Sonraki arayüz yayınında bu etiketi birlikte artırın. Araçlar panelinde katman kapatıp açmak veri önbelleğini silmez. Katman JSON'ları ve uydu verileri bilimsel tarihleriyle korunur.

JS/CSS sürümleme, zaten önbelleğe alınmış eski HTML'nin yeniden doğrulanmasını tek başına sağlayamaz. Yayın koordinatörü gerçek sunucuda `platform.html` için `Cache-Control: no-cache` (yeniden doğrulama) veya uygun kısa HTML önbelleğini ayarlayıp normal yenilemeyle kontrol etmelidir. Bu görev sunucu/hosting ayarı değiştirmez ve yayın yapmaz.

## Yerel doğrulama

`http://127.0.0.1:8772/platform.html` kullanılır. Testler çalışan servisleri kapatmaz. Kullanıcının son açık izniyle yalnız komut satırı/port/sağlık yanıtı doğrulanan 8772 (`server.cjs`) ve 8780 (`tools/public-api.cjs`) süreçleri güncel modüllerle yeniden başlatılmıştır. `npm.cmd test` sayısal/model/API testlerini çalıştırır. Tarayıcı için PowerShell:

```powershell
$env:ODAK_TEST_URL='http://127.0.0.1:8772'
npx.cmd playwright test tests/simple-workspace.spec.cjs tests/simple-compact.spec.cjs tests/release.spec.cjs tests/detection-ui.spec.cjs tests/monitor.spec.cjs tests/tracking.spec.cjs tests/report.spec.cjs tests/theme.spec.cjs tests/experience.spec.cjs tests/focus-pages.spec.cjs tests/premium.spec.cjs tests/observations-delete.spec.cjs --config tests/premium.config.cjs
```

Görünüm inceleme PNG'leri `test-results/simple-review/` altına yazılır. Otomatik hava/uydu servis testleri belirli yanıtları taklit eder; bunlar yeni gerçek uydu tespiti veya dış servis erişimi doğrulaması değildir. Silme/düzenleme testleri ayrı geçici sunucu ve veri klasörü kullanır. Gerçek kullanıcı kayıtları test edilmez.

## Son görünür test sonrası gerçek servis kontrolü

23.7331, -39.2782 için yeniden başlatmadan önce 8772 HTTP 502 / `DETECTION_FAILED`, 8780 iş sonucu `DETECTION_FAILED` verdi. Güncel süreçlerle aynı gerçek istek 8772 HTTP 422 / `NO_USABLE_SCENE`, 8780 iş sonucu `NO_USABLE_SCENE` verdi. 8772 üzerinde gerçek tarayıcı araması da açıklayıcı kapsam mesajını gösterdi ve aday üretmedi. Bu, görüntü kapsamı kontrolüdür; yeni başarılı çöp tespiti değildir.

Yeniden başlatmadan önce API kayıtları varsayılan yerel kayıt dosyasıyla karşılaştırıldı. Sonrasında kayıtların SHA-256 özeti aynı kaldı; içerik/fotoğraf çıktıya yazılmadı. Başka süreç durdurulmadı, ML veya veri dosyası değiştirilmedi.

Paris 48.85, 2.35 için ana tahmin mevcut kıyı maskesiyle model alanı isteğinden önce kara kontrolü yapar. TR/EN kara açıklaması gösterir, rota/indirme sonucu üretmez. Kıyı maskesi yaklaşık olduğundan dar kıyılar için bağımsız doğruluk iddiası eklenmez.

Doğrulama sonucu: `npm.cmd test` **86/86** geçti. Yukarıda listelenen ilgili tarayıcı dosyalarında **65 farklı senaryonun tamamı** geçti; eski yerleşime bağlı beklentiler güncellenip başarısız kontroller tekrar çalıştırıldı. Son kompakt görünüm/önbellek/Paris seti **4/4** geçti. Bu sayı seçilen dosyalar içindir; depodaki tüm eski e2e dosyalarını kapsamaz.

Son PNG'ler açılıp görsel olarak incelendi: `test-results/simple-review/final-1440-dark-result.png`, `final-912-dark-result.png`, `final-390-dark-initial.png`, `final-390-dark-result.png`, `final-390-light-en.png`, `final-390-tools.png`, `final-live-no-scene.png`. Otomatik son ölçümde 390×844 ilk görünümde harita üstü 387.5 px, 912×740'da 135 px; yatay taşma yok. Araç indirmeleri en az 44 px, kontrol kartında iç kaydırma yok. Harita/tahmin görünüm PNG'leri denetlenebilir test girdileriyle, `final-live-no-scene.png` ise gerçek API yanıtıyla oluşturuldu.

## Değişen dosyalar

- Çalışma alanı: `platform.html`, `css/simple-workspace.css`, `js/simple-workspace.js`, `js/experience.js`, `js/app.js`, `js/release-ui.js`, `js/map-search.js`, `js/satellite-ui.js`, `js/i18n.js`.
- Devir belgesi: `tools/SIMPLE-WORKSPACE.md`.
- Yeni testler/yardımcı: `tests/simple-workspace.spec.cjs`, `tests/simple-compact.spec.cjs`, `tests/workspace-helpers.cjs`.
- Yeni araç konumlarına uyarlanan mevcut testler: `tests/release.spec.cjs`, `tests/detection-ui.spec.cjs`, `tests/monitor.spec.cjs`, `tests/tracking.spec.cjs`, `tests/report.spec.cjs`, `tests/theme.spec.cjs`, `tests/experience.spec.cjs`, `tests/focus-pages.spec.cjs`, `tests/premium.spec.cjs`, `tests/observations-delete.spec.cjs`.
