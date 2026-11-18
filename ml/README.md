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

Gerçek `.nc` dosyasının içeriği bu ortamda doğrulanamadı. Testlerde yalnızca resmî sözlükle uyumlu yapay NetCDF dosyaları kullanıldı. Eksik veriler, ölçekleme, boyut sırası, tarih, boylam dönüşümü, bölge seçimi ve komut satırı çıktısı sınandı.

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
