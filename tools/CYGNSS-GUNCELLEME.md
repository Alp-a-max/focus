# CYGNSS bölgesel verisinin aylık kontrolü

ODAK yalnızca 25–30° K, 150–145° B Kuzey Pasifik örneğini yayınlar. Gösterim 0,25° hücre merkezleri üzerinden yapılır, etkin ortalama yaklaşık 1° alanı ve 30 günü kapsar. Yoğunluk adet/km² cinsindedir. GPGP 2018 kütle modeli kendi tarihi ve g/km² birimiyle ayrı kalır. `stddev_mp_samples` web varlığına aktarılmaz.

## 18 Kasım 2026 gerçek veri doğrulaması

NASA CMR sorgusu yeniden çalıştırıldı.

`https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=C2893924134-POCLOUD&sort_key=-start_date&page_size=1`

Son kayıt `G4415239920-POCLOUD`, veri tarihi 28 Ekim 2026 olarak döndü. Dosya `cyg.ddmi.s20261028-120000-e20261028-120000.l3.grid-microplastic.a32.d33.nc`, 6.877.931 bayt ve SHA-256 özeti `62a3ef0291c6db75510db1214123b028f4a4ab27d27d49f12448a900712e1442` olarak okundu. Kullanıcının Downloads klasöründeki kaynak değiştirilmeden kullanıldı.

Dosyada `time=1`, `lat=297`, `lon=1440`, ürün sürümü 3.2 ve veri sürümü 3.3 doğrulandı. Zaman etiketi 28 Ekim 2026 12:00 UTC, yoğunluk birimi `count km-2`, koordinat adımı 0,25° olarak çözüldü. Bölgedeki 441 geçerli hücrenin tamamı doğrudan NetCDF koordinatları, yoğunlukları ve örnek sayılarıyla karşılaştırıldı. Yoğunluk aralığı yaklaşık 12.471,956–12.968,229 adet/km²'dir. Yayınlanan küçük türetilmiş dosya `assets/cygnss-latest.json` ve durum belgesi `assets/cygnss-status.json` içindedir. Ham dosyalar ve `ml/output/` Git dışındadır.

## Güncelleme davranışı

`server.cjs`, sunucu hazır olduğunda `cygnss-update.cjs` üzerinden Python kontrolünü arka planda başlatır. Altı saatte bir yalnızca kontrol zamanının gelip gelmediğine bakılır. Başarılı kontrol sonrası bir takvim ayı beklenir. Ay sonu bir sonraki ayın geçerli son gününe ayarlanır. Başarısızlık sonrası sonraki deneme bir gün sonraya planlanır. Geçici HTTP 429/5xx ve ağ hataları aynı denemede en fazla üç kez, 1 ve 2 saniye arayla yeniden denenir. Yetkilendirme hatası hemen raporlanır.

Yerel PC veya sunucu kapalıyken otomatik kontrol çalışmaz. Sunucu yeniden açıldığında gecikmiş kontrol denenir. Ayrı çalışan sunucuların aynı anda yayın yapmasını işletim sistemi dosya kilidi önler. Kilit dosyası `assets/.cygnss-update.lock` olup Git dışındadır ve süreç beklenmedik biçimde kapansa da işletim sistemi kilidi bırakır. Test sunucuları `ODAK_CYGNSS_AUTO_UPDATE=0` ile otomatik kontrolü kapatır. Python yolu gerektiğinde `ODAK_PYTHON` ile seçilebilir.

Katalogdan tarih her kontrolde yeniden alınır. Son tarih sabitlenmez. Dosya adı ve katalog tarihi eşleşmeli, tarih gelecekte olmamalı ve mevcut sağlam veriyi geriye götürmemelidir. Girdi dosyasının boyutu, koordinatları, sürümü, birimi, zamanı ve tüm bölgesel hücreleri doğrulanır. Geçersiz ve maskeli değerlerden sıfır üretilmez. Boş bölge yayınlanmaz.

Sonuç önce geçici dosyaya yazılır ve tek dosyalık atomik `os.replace` işlemiyle yayınlanır. Bozuk NetCDF, tarih/sürüm/birim uyuşmazlığı, eski kayıt, boş bölge ve bağlantı hatası mevcut sağlam veri dosyasını değiştirmez. Veri ve durum belgesi ayrı atomik dosyalardır. Aralarında süreç kesilirse arayüz veri tarihi, katalog sürümü ve kaynak SHA-256 eşleşmesini kontrol ederek başarı bilgisinin gösterilen veriye ait olduğunu doğrular. Durum bilgisi eski kaldığında başarı iddiası yerine uyumsuz kontrol bilgisi gösterilir.

`cygnss-status.json` alanlarının anlamları farklıdır.

- `displayed_date` ve `displayed_source_sha256` doğrulanıp yayınlanan kaynağı belirtir.
- `latest_available_date` katalogda son görülen veri günüdür.
- `catalog_updated_at` NASA katalog kaydının değişiklik tarihidir, ölçüm tarihi değildir.
- `catalog_checked_at` katalog sorgusunun başarılı olduğu zamandır.
- `last_success_at` doğrulanmış veri ile kataloğun başarıyla eşleştirildiği son kontroldür.
- `attempted_at` son denemenin zamanıdır.
- `last_failure_at` ve `last_failure_reason` son başarısızlığı tutar, sonraki başarı bunları silmez.
- `next_check_at` bir sonraki planlı kontrol zamanıdır.

Arayüz veri tarihini doğrudan yüklenen hücre varlığından alır. `ready` durumu ancak tarih, katalog revizyonu ve kaynak özeti gösterilen dosyayla eşleştiğinde başarılı kontrol olarak sunulur. Güncelleme hatasında önceki sağlam katman kullanılmaya devam eder. `Yerel veriyi yenile` düğmesi hazırlanmış yerel dosyaları tekrar okur. Kaynakta yeni veri olup olmadığını kontrol eden aylık görevden ayrıdır.

## Yerel Earthdata erişimi

Manuel indirilen en yeni resmî dosya aşağıdaki gibi içe alınabilir. Kaynak dosya adı CMR'daki son dosyayla eşleşmelidir.

```powershell
py tools/update_cygnss.py --file "C:\veri\cyg.ddmi.s20261028-120000-e20261028-120000.l3.grid-microplastic.a32.d33.nc" --force
```

Otomatik indirme için Earthdata hesabından alınmış geçerli erişim belirteci, sunucu başlatılırken `EARTHDATA_TOKEN` ortam değişkeninde bulunmalıdır. Belirteci sohbete veya kaynak koduna yazmayın. [Earthdata Login](https://urs.earthdata.nasa.gov/) üzerinden kendi hesabınızda belirteç oluşturun. Aşağıdaki PowerShell örneği değeri ekranda göstermeden okur. Otomatik aylık indirme için kullanıcının yapacağı işlem bu yerel erişimi yapılandırmaktır.

```powershell
$odakSecureToken = Read-Host 'Earthdata erişim belirteci' -AsSecureString
$odakTokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($odakSecureToken)
try {
    $env:EARTHDATA_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($odakTokenPointer)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($odakTokenPointer)
}
$env:PELAGIC_PORT = '8768'
npm.cmd start
# Sunucu durdurulduktan sonra bu terminaldeki değeri kaldırın.
Remove-Item Env:EARTHDATA_TOKEN
```

Belirteç süresi dolduğunda durum `auth_required` olur ve sağlam katman korunur. Belirteç frontend'e, durum belgesine, Git'e veya hata loguna yazılmaz. Yönlendirmeler HTTPS ve NASA Earthdata/CDN adresleriyle sınırlıdır. Başka kökene yönlendirmede Authorization başlığı kaldırılır. Ham indirme yalnızca geçici klasörde tutulur.

## Doğrulama komutları

```powershell
py -m unittest discover -s tests -p test_cygnss_update.py
py -m unittest discover -s tools -p test_build_cygnss_sample.py
py -m unittest discover -s ml -p test_read_cygnss.py
npm.cmd test
npx.cmd playwright test -c tests/premium.config.cjs
```

Güncelleyici testleri geçici klasörler ve sahte servislerle hata, yeniden deneme, atomik değişim, eski verinin korunması, aylık takvim ve eşzamanlı kilit davranışını sınar. Gerçek NetCDF karşılaştırması ayrıca yukarıdaki dosyayla yapılmıştır. Tarayıcı testleri mevcut kaynakları ve yeni açılır kontrolleri kullanır. Kullanıcı bildirimleri testlerde sahte yanıtlarla veya ayrı geçici sunucularla izole edilir.
