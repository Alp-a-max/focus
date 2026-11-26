# FOCUS'u InfinityFree'ye kurma

Süre: yaklaşık 15 dakika. Gerekenler: InfinityFree kontrol paneli, File Manager (veya FTP) ve phpMyAdmin.

## 1. MySQL şifresini yenileyin

Eski şifre bir ekran görüntüsünde paylaşıldığı için önce onu değiştirin: kontrol paneli > **MySQL Databases** > veritabanınızın yanındaki şifre değiştirme. (InfinityFree'de MySQL şifresi hesap şifresidir; **Account > Change Password** bölümünden değişir.) Yeni şifreyi kimseye yazmayın, yalnızca 3. adımdaki dosyaya girin.

## 2. Tabloları oluşturun

1. Kontrol paneli > **MySQL Databases** > veritabanınız > **phpMyAdmin**.
2. Soldan veritabanını seçin > **Import (İçe aktar)** > `api/schema.sql` dosyasını seçin > **Go**.
3. Beş tablo görünmeli: `users`, `subscriptions`, `usage_events`, `rate_limits`, `audit_log`.

## 3. Gizli yapılandırma dosyası

1. `api/config.sample.php` dosyasını bilgisayarınızda kopyalayıp adını `focus-config.php` yapın.
2. İçindeki değerleri doldurun: `db_host`, `db_name`, `db_user` (kontrol panelindeki MySQL bilgileri), `db_pass` (yeni şifre), `app_secret` (en az 32 rastgele karakter; PowerShell'de üretmek için dosyadaki komutu kullanın), `site_origin` (`https://focusocean.xo.je`) ve isterseniz `payment_note` (IBAN, alıcı adı gibi ödeme bilgisi).
3. File Manager'da **htdocs klasörünün bir üstüne** (hesabın kök klasörü) yükleyin. Böylece web'den hiçbir şekilde açılamaz.
   Kök klasöre yükleme yapılamıyorsa dosyanın adını `config.php` yapıp `htdocs/api/` içine koyun; `api/.htaccess` onu dışarıya kapatır.

## 4. Site dosyalarını yükleyin

1. Bilgisayarda proje klasöründe: `python tools/paketle.py` → `dist/focus-site.zip` oluşur.
2. File Manager > `htdocs` > **Upload** > zip'i yükleyin > zip'e sağ tıklayıp **Extract**. (Extract yoksa zip'i bilgisayarda açıp klasörleri yükleyin.)
3. Eski `index.html`, `css/`, `js/` dosyalarının üzerine yazılmasına izin verin. `htdocs` içinde `.htaccess` olduğundan emin olun (gizli dosyaları göster seçeneği).

## 5. Kendinizi yönetici yapın

1. Sitede **Ücretsiz hesap aç** ile kendi hesabınızı oluşturun.
2. phpMyAdmin > **SQL** sekmesi:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'sizin-adresiniz@ornek.com';
   ```
3. Hesap sayfasında **Yönetim** bağlantısı görünür: `https://focusocean.xo.je/yonetim.html`.

## 6. Kontrol listesi

- `https://focusocean.xo.je/api/index.php?a=session` bir JSON yanıtı vermeli (`"ok":true`). "Hesap sistemi henüz kurulmadı" diyorsa 3. adımdaki dosya bulunamıyordur.
- `https://focusocean.xo.je/api/config.php` ve `.../api/schema.sql` **403 Forbidden** vermeli.
- Kayıt ol, çıkış yap, tekrar giriş yap; haritada bir tahmin başlatınca sağ üstteki hak sayısı 1 azalmalı.
- Hesap sayfasından bir paket talebi gönderin, Yönetim sayfasında **Ödeme alındı, onayla** deyin; hesap sayfasında paket değişmeli.

## Abonelik nasıl işler

1. Kullanıcı hesap sayfasında paket ve dönem seçip **Talep gönder** der; `FOC-XXXXXXXX` biçiminde bir referans kodu alır.
2. Havale/EFT açıklamasına bu kodu yazar.
3. Ödemeyi banka hesabında gördüğünüzde Yönetim sayfasında talebi onaylarsınız; paket hemen başlar ve 1 ay / 1 yıl sürer.
4. Süre bitince paket kendiliğinden Ücretsiz'e döner (zamanlanmış görev gerekmez).

Otomatik kart ödemesi (iyzico, PayTR, Lemon Squeezy, Paddle) için ödeme sağlayıcısının sunucunuza bildirim göndermesi gerekir. InfinityFree'nin ücretsiz planındaki tarayıcı doğrulaması bu bildirimleri büyük ihtimalle engeller; bu yüzden otomatik ödeme için ücretli bir barındırma planı düşünülmelidir. Kod sağlayıcıdan bağımsızdır: onay adımı (`FocusAccounts::decide`) bir webhook'tan da çağrılabilir.

## Yerel test (isteğe bağlı)

XAMPP yüklü bir Windows bilgisayarda:

```powershell
$env:FOCUS_CONFIG="C:\yol\focus-test-config.php"   # site_origin: http://127.0.0.1:8790, test veritabanı
C:\xampp\php\php.exe -S 127.0.0.1:8790
```

Başka bir terminalde:

```powershell
$env:FOCUS_MYSQL="C:/xampp/mysql/bin/mysql.exe --no-defaults -uroot --host=127.0.0.1 --port=3306 focus_test"
python -m unittest tests/test_api_accounts.py -v
```

Test veritabanı her çalıştırmada boşaltılır; gerçek veritabanını kullanmayın.
