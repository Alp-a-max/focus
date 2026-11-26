<?php
// FOCUS sunucu yapılandırması — ÖRNEK.
// 1) Bu dosyayı "focus-config.php" adıyla kopyalayın.
// 2) Tercihen htdocs klasörünün BİR ÜST klasörüne koyun (web'den erişilemez).
//    Olmazsa api/ klasörüne "config.php" adıyla koyun; api/.htaccess erişimi engeller.
// 3) Gerçek değerleri yalnızca sunucudaki kopyaya yazın. Bu dosyayı Git'e gerçek şifreyle eklemeyin.

return [
    // InfinityFree kontrol paneli > MySQL Databases bölümündeki değerler.
    'db_host' => 'sqlXXX.infinityfree.com',
    'db_name' => 'if0_XXXXXXX_focus',
    'db_user' => 'if0_XXXXXXX',
    'db_pass' => 'BURAYA_YENI_SIFRE',

    // En az 32 rastgele karakter. Üretmek için: https://www.random.org/strings/ ya da
    // PowerShell: -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | % {[char]$_})
    'app_secret' => 'DEGISTIRIN_EN_AZ_32_KARAKTER_RASTGELE_DEGER',

    // Sitenin tam adresi (sonunda / olmadan). İstek kaynağı (Origin) bu adresle doğrulanır.
    'site_origin' => 'https://focusocean.xo.je',

    // Havale/EFT ile ödeme alınacaksa hesap sayfasında gösterilecek açıklama (boş bırakılabilir).
    'payment_note' => 'Ödeme bilgileri için iletişime geçin. Açıklamaya abonelik referans kodunu yazın.',

    // Saat dilimi: günlük kota bu saate göre sıfırlanır.
    'timezone' => 'Europe/Istanbul',
];
