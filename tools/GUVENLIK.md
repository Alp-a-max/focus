# FOCUS güvenlik notları

27 Kasım 2026. Hesap ve abonelik sistemi (`api/`) için tehdit modeli, uygulanan önlemler ve bilinen sınırlar.

## Korunan varlıklar

Kullanıcı hesapları ve şifre özetleri, abonelik durumları (ücretli hak), kullanım kotası, yönetici yetkisi, veritabanı bilgileri.

## Uygulanan önlemler

| Tehdit | Önlem | Yer |
|---|---|---|
| SQL enjeksiyonu | Tüm sorgular hazırlanmış ifade (`ATTR_EMULATE_PREPARES=false`); filtreler beyaz listede | `api/lib/accounts.php` |
| Şifre sızıntısı | `password_hash` (bcrypt), giriş sırasında otomatik yeniden özetleme; şifre asla loglanmaz | `accounts.php` |
| Kaba kuvvet / şifre deneme | IP başına 20/15 dk, e-posta başına 10/15 dk, 5 hatada 15 dk kilit; hata mesajı hangi alanın yanlış olduğunu söylemez, olmayan kullanıcıda da sahte doğrulama yapılır | `index.php`, `accounts.php` |
| CSRF | Her POST için oturuma bağlı jeton (`X-CSRF-Token`), `Origin`/`Referer` doğrulaması ve zorunlu `application/json` | `index.php` |
| Oturum çalma / sabitleme | `__Host-` ön ekli, `HttpOnly`, `Secure`, `SameSite=Lax` çerez; strict mode; girişte kimlik yenileme; 14 gün boşta, 30 gün mutlak süre; şifre değişince diğer oturumlar kapanır | `index.php` |
| XSS | Kullanıcıdan gelen hiçbir veri `innerHTML` ile basılmaz (`textContent`); API yanıtlarında `nosniff` ve `default-src 'none'` | `js/account-pages.js`, `js/account-gate.js` |
| Clickjacking | API'de `X-Frame-Options: DENY`, sayfalarda `SAMEORIGIN` + `frame-ancestors 'self'` | `.htaccess` |
| Bot kayıtları | Görünmez tuzak alanı, form en az 3 sn açık kalmalı (sunucu saati), IP başına saatte 5 kayıt | `index.php` |
| Kota hilesi / yarış durumu | Kota sunucuda hesaplanır, kullanıcı satırı `FOR UPDATE` ile kilitlenir (12 eşzamanlı istekle test edildi); aynı istek kimliği iki kez hak düşmez | `accounts.php`, `tests/test_api_accounts.py` |
| Abonelik sahteciliği | Fiyat ve haklar yalnızca sunucuda; talep yönetici onayı olmadan hak vermez; aynı talep iki kez onaylanamaz; tüm kararlar `audit_log`'a yazılır | `accounts.php` |
| Yetki yükseltme | Yönetici rolü her istekte veritabanından okunur; rol yalnızca phpMyAdmin'den verilir (kayıtla yönetici olunamaz) | `index.php` |
| Gizli yapılandırma sızıntısı | Yapılandırma web kökünün dışında; `api/.htaccess` + `lib/.htaccess` + `FOCUS_API` sabiti; PHP dosyası doğrudan açılsa bile çıktı vermez | `api/` |
| Bilgi sızıntısı | Beklenmeyen hatada genel mesaj; ayrıntı yalnızca sunucu loguna | `index.php` |
| Kişisel veri (KVKK) | IP adresi yerine anahtarlı özeti; harita konumu sunucuya gönderilmez; kullanıcı hesabını kendisi silebilir | `core.php`, `gizlilik.html` |
| Üçüncü taraf betik | Leaflet için SRI (`integrity`) | `platform.html` |
| Geliştirme dosyası sızıntısı | Kök `.htaccess` `.md`, `.cjs`, `.py`, `.sql`, nokta dosyaları ve `tests/`, `model/`, `ml/` klasörlerini kapatır; `tools/paketle.py` yalnızca gerekli dosyaları paketler | `.htaccess` |

## Bilinen sınırlar (bilerek kabul edilenler)

1. **Tahmin tarayıcıda hesaplanır.** Kota, arayüzde "Tahmini başlat"ı kapatır ve her kullanımı sunucuda sayar; ama teknik bilgisi olan biri tarayıcı konsolundan hesap fonksiyonunu doğrudan çağırabilir. Kesin zorlama için tahmin hesabının sunucuda yapılması gerekir; InfinityFree'de Python/Node çalışmadığı için bu ücretli barındırmaya geçişte yapılmalı. Akıntı/rüzgâr verisi zaten herkese açık (Open-Meteo) olduğundan, bu açık ücretli bir veri kaynağını açığa çıkarmaz.
2. **E-posta doğrulaması ve şifre sıfırlama yok.** InfinityFree ücretsiz planı e-posta göndermiyor. Şifresini unutan kullanıcı için yönetici phpMyAdmin'den yeni özet yazabilir. SMTP destekli barındırmada eklenmeli.
3. **Kayıt e-postanın varlığını söyler** ("Bu e-postayla zaten bir hesap var"). Kullanılabilirlik için kabul edildi; IP başına saatte 5 kayıt sınırı toplu taramayı yavaşlatır.
4. **Hesap kilitleme kötüye kullanılabilir.** Bir saldırgan bir kullanıcının e-postasıyla 5 yanlış deneme yaparak hesabı 15 dakika kilitleyebilir. Kaba kuvvete karşı korumanın bedeli olarak kabul edildi.
5. **bcrypt 72 bayttan uzun şifrelerin yalnızca ilk 72 baytını kullanır.** Şifre üst sınırı 128 karakterdir; pratikte güvenliği düşürmez.
6. **Otomatik ödeme yok.** Ödeme havale/EFT + yönetici onayıdır. Kart ödemesi eklenirse sağlayıcının webhook imzası doğrulanmalı, tutar ve para birimi sunucudaki fiyatla karşılaştırılmalıdır.
7. **Yerel Node sunucusu (`server.cjs`) ve kullanıcı bildirimleri** internete açılmak için tasarlanmamıştır ve InfinityFree paketine dahil edilmez.

## Test edilenler

`tests/test_api_accounts.py` (11 test, yerel PHP 8.5 + MariaDB 10.11): yanlış kaynak, eksik CSRF, form gövdesi, bozuk JSON, yanlış metot, bilinmeyen işlem, SQL enjeksiyonu denemeleri, zayıf şifre, bot tuzağı, kilitleme, oturum yenileme, eşzamanlı kota, onaysız hak verilmemesi, çifte onay, süresi biten abonelik, şifre değişince oturum kapatma, hesap silme, yetkisiz yönetici erişimi.
