# ODAK: MARIDA araştırma deneyi

## Bağımsız CYGNSS mikroplastik okuyucusu

`read_cygnss.py`, yerel NetCDF dosyasındaki değişkenleri ve metaveriyi inceleyerek bölgesel JSON üretir. Kurulum ve kullanım proje kökünden yapılır.

```powershell
py -m pip install -r ml/requirements-cygnss.txt
py ml/read_cygnss.py "C:\veri\cygnss.nc" --bbox 30 35 33 37 --out ml/output/cygnss-region.json
py -m unittest discover -s ml -p test_read_cygnss.py
```

`--bbox` batı, güney, doğu, kuzey sırasındadır. Sınırlar hücre merkezlerini kapsar ve uç değerler dahildir. Boylamlar JSON'da -180..180 aralığına dönüştürülür. Batı doğudan büyükse tarih değiştirme çizgisini geçen bölge seçilir, örneğin `--bbox 170 -10 -170 10`. Tüm boylamlar için `--bbox -180 -37 180 37` kullanılabilir.

Resmî V3.2 sözlüğündeki `time`, `lat`, `lon`, `mp_concentration`, `num_mp_samples`, `stddev_mp_samples` değişkenleri gereklidir. Dosyadaki boyut sırası kontrol edilir. Tarih, `time.units` ve `calendar` ile çözülür. JSON, kaynak dosya adını, referans veri kümesini, global metaveriyi, tüm değişkenlerin boyut ve özniteliklerini, dosyadaki birimleri ve geçerli hücreleri içerir. Şema kontrolü, yerel dosyanın NASA kökenini doğrulamaz.

NetCDF maskeleri, `_FillValue`, `missing_value`, `valid_range` ve ölçek/ofset uygulanır. Eksik, sonsuz veya negatif yoğunluklar ile eksik, sıfır, negatif veya tam sayı olmayan örnek sayısına sahip hücreler dışlanır. Dosyanın geçerli kabul ettiği gerçek sıfır yoğunluk korunur. Eksik veya geçersiz geometrik standart sapma JSON'da `null` olur. Bölge boşsa `cells: []` döner. `counts` seçilen, dışlanan ve yazılan hücre sayılarını gösterir. Girdi dosyasının üzerine yazılması engellenir.

Yoğunluk birimi resmî sözlükte `count km-2`, örnek sayısı ve geometrik standart sapma birimi `1` olarak verilir. Geometrik standart sapma çarpımsal değişkenlik ölçüsüdür. Ürün günlük zaman etiketli 0,25° ızgaraya sahiptir, etkili ortalama yaklaşık 30 gün ve 1° alanı kapsar. Hücre tarihini anlık ölçüm olarak yorumlamayın. Kaynak ve ayrıntılar [resmî ürün sayfasında](https://podaac.jpl.nasa.gov/dataset/CYGNSS_L3_MICROPLASTIC_V3.2) ve [V3.2 veri sözlüğünde](https://archive.podaac.earthdata.nasa.gov/podaac-ops-cumulus-docs/cygnss/open/L3/docs/148-0401-4_L3_Microplastic_netCDF_Data_Dictionary.xlsx) bulunur.

### Gerçek dosyanın indirilmesi ve doğrulama durumu

18 Kasım 2026 denemesinde NASA CMR kataloğu `C2893924134-POCLOUD` koleksiyonundan `cyg.ddmi.s20180816-120000-e20180816-120000.l3.grid-microplastic.a32.d33.nc` dosyasını listeledi. Resmî HTTPS indirme ve OPeNDAP metaveri adresleri Earthdata Login'e yönlendi ve kimlik bilgisi olmadan HTTP 401 döndürdü. V3.2 veri sözlüğü indirilebildi ve değişkenler buradan kontrol edildi. Ürün sayfasındaki README bağlantısı eski V1.0 metni sunduğu için şema kaynağı olarak V3.2 sözlüğü kullanıldı.

[Earthdata Search koleksiyonunu](https://search.earthdata.nasa.gov/search/granules?p=C2893924134-POCLOUD) açın, Earthdata hesabıyla giriş yapın, bir gün seçip `.nc` dosyasını indirin ve yerel yolunu yukarıdaki komuta verin. Hesap için [Earthdata Login](https://urs.earthdata.nasa.gov/) kullanılabilir. Okuyucu ağ bağlantısı veya kimlik bilgisi gerektirmez.

İlk geliştirmede yalnızca yapay NetCDF dosyaları kullanılabilmişti. Aşağıdaki gerçek dosya doğrulaması, kullanıcı dosyayı indirdikten sonra 18 Kasım 2026 tarihinde tamamlandı.

### Gerçek V3.2 dosyasıyla doğrulama

`cyg.ddmi.s20180816-120000-e20180816-120000.l3.grid-microplastic.a32.d33.nc`, Downloads klasöründen `ml/datasets/cygnss/` içine kopyalandı. Boyutu 6.877.416 bayttır. Kaynak ve kopyanın doğrulama öncesi/sonrası SHA-256 özeti `7b05b37d96b0e128e41d81b277837211f33b3a88f5ebfa52cdaff54e3f46e5a2` olarak eşleşti. Her iki dosya içeriği korundu. Yerel `.nc` dosyası ve `ml/output/` sonuçları Git dışında tutulur.

Dosyada `time=1`, `lat=297`, `lon=1440` boyutları okundu. Global `version_id=3.2`, `l3_algorithm_version=3.2`, `l3_data_version=3.3` değerleri bulundu. Bu alanlar birbirinden ayrı sürüm bilgileridir. Enlem -37..37, boylam 0..359,75 aralığındadır. Koordinat adımı 0,25°'dir. Kaynak boylamları JSON için -180..180 aralığına dönüştürüldü.

Zaman birimi `days since 1970-01-01 00:00:00 UTC`, ham zaman değeri 17759,5, çözülen hücre zaman etiketi `2018-08-16T12:00:00` UTC'dir. Global zaman kapsamı 16 Ağustos 2018 00:00:00–23:59:59, ortalama süresi `P30DT00H00M00S` ve yayın zaman adımı bir gündür. Değişken yorumları 1° × 1° alanda, zaman etiketinin çevresindeki 30 günlük ortalamayı belirtir.

`mp_concentration` birimi `count km-2`, `num_mp_samples` ve `stddev_mp_samples` birimleri `1` olarak dosyadan okundu. Üç alan da `(time, lat, lon)` sırasındadır. Yoğunluk ve değişkenlik Float32, örnek sayısı Int64'tür. Üç değişkende `_FillValue=-9999` tanımlıdır. Tüm dosyada yoğunluk için 116.603, örnek sayısı için 115.724, değişkenlik için 116.838 maskeli hücre saptandı.

**Gerçek dosyada bulunan uyumsuzluk ve düzeltme.** `stddev_mp_samples` metaveride geometrik standart sapma olarak tanımlanıyor, ancak dosyadaki sonlu değerler yaklaşık 0,002431618–0,36071122 aralığında bulunuyor. Okuyucunun önceki `<1` filtresi geçerli kaynak değerlerini `null` yapıyordu. Filtre yalnızca negatif değerleri dışlayacak şekilde düzeltildi. Sonlu ve negatif olmayan değerler dosyada saklandığı haliyle aktarılır, maskeli/sonsuz değerler `null` kalır. Bu alan için üstel dönüşüm veya başka bir düzeltme uygulanmadı. Kaynak etiketinin bu sayılarla ilişkisi ek bilimsel açıklama gerektirir; bu değerleri geometrik çarpan olarak kullanmadan önce veri sağlayıcısıyla netleştirin. İlgili regresyon testine 1'in altındaki değerin korunması ve negatif değerin dışlanması eklendi.

Küçük Kuzey Pasifik bölgesi mevcut komut satırı okuyucusuyla aktarıldı.

```powershell
py ml/read_cygnss.py ml/datasets/cygnss/cyg.ddmi.s20180816-120000-e20180816-120000.l3.grid-microplastic.a32.d33.nc --bbox -150 25 -145 30 --out ml/output/cygnss-north-pacific-20180816.json
py -m unittest discover -s ml -p test_read_cygnss.py
```

Uç hücreler dahil 21×21 = 441 hücre seçildi ve tamamı geçerliydi. JSON'daki **441 hücrenin tamamı**, okuyucunun bölge seçiminden bağımsız olarak doğrudan NetCDF'den 210..215° doğu boylamları ve 25..30° kuzey enlemleri seçilerek karşılaştırıldı. Koordinatlar, çözülen tarih, yoğunluk, örnek sayısı ve `stddev_mp_samples` değerleri birebir eşleşti. Üç örneğin ortak tarih etiketi 16 Ağustos 2018 12:00 UTC'dir.

- 25° N, 150° W hücresinde yoğunluk 12681,7431640625 count km-2, örnek sayısı 1058, `stddev_mp_samples` 0,14537413418293.
- 27,5° N, 147,5° W hücresinde yoğunluk 13448,09765625 count km-2, örnek sayısı 1152, `stddev_mp_samples` 0,17989492416381836.
- 30° N, 145° W hücresinde yoğunluk 13829,740234375 count km-2, örnek sayısı 1209, `stddev_mp_samples` 0,19249387085437775.

Ana bölgede maskeli hücre bulunmadığından eksik veri kontrolü aynı gerçek dosyanın `[140, -37.25, 140.5, -36.75]` küçük bölgesinde ayrıca yapıldı. Altı hücrenin beşi dışlandı, biri aktarıldı. Kaynakta maskeli olan 37° S, 140,25° E hücresi JSON hücre listesine alınmadı ve sıfır yoğunluğa dönüştürülmedi. Gerçek dosya karşılaştırmasına ek olarak ilgili yedi yapay regresyon testi geçti.

### Haritadaki sınırlı CYGNSS örneğini tekrar üretme

`assets/cygnss-north-pacific-20180816.json`, doğrulanan Kuzey Pasifik bölgesinin 441 hücrelik yaklaşık 16 KB web kopyasıdır. Yayınlanan alanlar yalnızca hücre merkezi enlem/boylamı, `mp_concentration`, `num_mp_samples` ve ortak kaynak/zaman/kapsam metaverisidir. Dosya bir izin listesiyle oluşturulur. Girdi dosyasındaki diğer metaveri veya alanlar web varlığına kopyalanmaz. `stddev_mp_samples` etiketindeki belirsizlik nedeniyle web varlığından çıkarılmıştır.

```powershell
py tools/build_cygnss_sample.py
py -m unittest discover -s tools -p test_build_cygnss_sample.py
npx.cmd playwright test -c tests/cygnss.config.cjs
```

Üretici, `ml/output/cygnss-north-pacific-20180816.json` dosyasını okur. Kaynak DOI, V3.2/d33 sürümü, 30 günlük süre, 16 Ağustos 2018 tarihi ve 0,25° ızgara merkezleri kontrol edilir. Çıktı sıralı ve tekrar üretilebilirdir. Geçersiz yoğunluk veya örnek sayısı hücrenin dışlanmasına yol açar. Gerçek sıfır yoğunluk, pozitif örnek sayısıyla korunur. Maskeli değerlerden sıfır üretilmez. Ham NetCDF ve `ml/output/` dosyaları Git dışında kalır, web varlığı kaynak kodla birlikte özel depoda saklanır.

Haritada CYGNSS bağımsız bir aç/kapat kontrolüne ve bölgeye git düğmesine sahiptir. Her kare hücre merkezinin iki yönünde 0,125° genişletilir, toplam 0,25° × 0,25° ızgara alanı gösterilir. Tam dış kapsam 24,875..30,125° K ve 150,125..144,875° B olur. Etkin ortalama 30 gün ve yaklaşık 1° alandır. Kareler bu ortalamaların yayın ızgarasını gösterir. Yoğunluk `count km-2` biriminden sayısal değer değiştirilmeden Türkçe `adet/km²` etiketiyle gösterilir. Renk sınıfları adet/km² cinsinden `<12.750`, `12.750–<13.000`, `13.000–<13.250`, `13.250–<13.500`, `13.500–<13.750`, `≥13.750` şeklindedir. Kaynak değerler yuvarlanmadan saklanır, bilgi penceresinde iki ondalığa kadar biçimlenir.

Bilgi penceresinde 16 Ağustos 2018 12:00 UTC tarihi, yoğunluk, örnek sayısı, ortalama kapsamı ve NASA PO.DAAC DOI bağlantısı gösterilir. CYGNSS adet/km² değerleri, GPGP g/km² rasterından ve mikroplastik sınır çizgilerinden ayrı kontroller ve renk açıklamalarıyla sunulur. Katman yeniden açıldığında aynı yerel Leaflet nesnesi kullanılır. Hata halinde kontrol kapatılır ve yeniden deneme metni gösterilir. 8767 test yapılandırması mevcut sunucuyu kullanır, sunucu başlatma/durdurma adımı içermez. Testlerde kullanıcı bildirimi API'si sahte boş yanıtla karşılanır.

Bu klasör deniz yüzeyindeki atık tespiti için **sınırlı bir fizibilite deneyi** içerir. Model sitedeki canlı uydu analizine bağlı değildir; çıktısı doğrulanmış atık tespiti, plastik türü veya atığın yaşı değildir.

Veri kaynağı: Kikaki ve diğerleri, *MARIDA: A benchmark for Marine Debris detection from Sentinel-2 remote sensing data* (2022), [veri kümesi](https://doi.org/10.5281/zenodo.5151941), CC BY 4.0. İndirme, NTUA'nın [Source Cooperative kopyasını](https://source.coop/ntua/marida) kullanır. Veri ve üretilen model kaynak kod deposuna eklenmez.

## Tekrarlama

Python ortamında `py -m pip install -r ml/requirements.txt`, ardından `py ml/download_sample.py` ve `py ml/train_baseline.py` çalıştırın. İndirme, MARIDA'nın kendi eğitim/doğrulama/test ayrımlarından küçük bir alt küme kullanır; seçilen dosyalar `ml/datasets/marida-sample/manifest.json` içinde listelenir. Eğitilmiş model `ml/output/marida_baseline.joblib`, ölçümler `ml/output/evaluation.json` içine yazılır.

Model 11 bantlı etiketli piksellerle ikili rastgele orman sınıflandırması yapar. Etiketlenmemiş pikseller negatif kabul edilmez; düşük güvenli etiketler dışlanır. Eğitim ve test sahneleri ayrıdır; karar eşiği yalnızca doğrulama kümesinden seçilir. Testte gerçek ve yanlış pozitifler, pikseller ve sınıflar bazında raporlanır.

## Sınırlar

- Örnek sahneler atık etiketi bulunan sahnelerden seçilmiştir; gerçek denizlerdeki atık yaygınlığını veya operasyonel doğruluğu temsil etmez. Ayrı sahneler aynı coğrafi bölgeden farklı tarihler içerebilir; coğrafi bağımsızlık garanti edilmez.
- MARIDA etiketleri zayıf denetimlidir; bağımsız saha doğrulaması olarak yorumlanamaz. Bu küçük alt kümenin sonuçları da tüm MARIDA test kümesinin sonuçları değildir.
- MARIDA görüntüleri Rayleigh düzeltmeli veridir. Sitenin güncel Sentinel-2 L2A yüzey yansıması farklı bir veri dağılımıdır; eğitim çıktısını dönüştürme ve bağımsız doğrulama yapılmadan siteye bağlamak güvenilir değildir.
- Daha fazla negatif sahne, bulut ve dalga örnekleri, tüm resmî test kümesinde değerlendirme, yerel sahalar ve bağımsız saha doğrulaması gereklidir. Model yalnızca tek piksel spektrumunu kullanır; mekânsal veya zamansal özellikleri öğrenmez.
