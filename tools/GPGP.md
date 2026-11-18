# Büyük Pasifik Birikimi araştırma sınırları

Haritadaki katman Lebreton ve diğerlerinin 2018 tarihli araştırmasının modellenmiş mikroplastik kütle yoğunluğu eşiklerini gösterir. Araştırma yılı 2018 olarak etiketlenir. Figshare v2 dosyasının 30 Ocak 2024 eklenme tarihi ölçüm tarihi olarak kullanılmaz. Çalışma birden fazla gözlem ve modelleme girdisi içerdiğinden katmana tek bir ölçüm tarihi atanmamıştır.

## Kaynak ve lisans

- Laurent Lebreton ve Julia Reisser, *Supplementary data for Evidence that the Great Pacific Garbage Patch is rapidly accumulating plastic*, Figshare v2, DOI [10.6084/m9.figshare.5873142.v2](https://doi.org/10.6084/m9.figshare.5873142.v2).
- Lebreton et al. (2018), *Scientific Reports* 8, 4666, DOI [10.1038/s41598-018-22939-w](https://doi.org/10.1038/s41598-018-22939-w).
- Veri lisansı [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). ODAK için Shapefile → GeoJSON biçim dönüşümü yapılmıştır. Kaynak atfı katman açıkken haritada, çizgi bilgi pencerelerinde ve GeoJSON metaverisinde gösterilir.

## İncelenen arşiv ve dönüşüm

Resmî Figshare API kaydı `https://api.figshare.com/v2/articles/5873142`, `GPGP_contours.zip` dosyasını 44299727 kimliğiyle listeler. Arşivin MD5 özeti `ab6f0e9fdbbf6db6eb8e8bb59413887b` olarak doğrulandı.

Arşiv `.shp`, `.shx`, `.dbf`, `.prj`, `.qpj`, `.cpg` bileşenlerini içerir. Geometriler SHP'den, indeks SHX'ten, `ID` ve `ELEV` alanları DBF'den okunur. CPG `latin9` kodlamasını belirtir. PRJ, WGS84 coğrafi koordinat sistemini derece birimiyle tanımlar. Kaynak koordinatları boylam/enlem sırasındadır ve GeoJSON için doğrudan uygundur.

192 POLYLINE kaydının tamamı GeoJSON LineString/MultiLineString geometrileri olarak korunur. Yeniden projeksiyon, basitleştirme, köşe yuvarlama, çizgileri kapatma veya poligon üretme uygulanmaz. Çizgiler kaynak dosyanın alan sınırında kesilebilir. Katman kaynak eş-yoğunluk çizgilerini gösterir.

Kaynak kapsamı GeoJSON `bbox` alanında `[batı, güney, doğu, kuzey]` sırasıyla `[-160.0, 20.350056259480848, -120.47834945511053, 44.95595915073558]` değerindedir. Git düğmesi Leaflet katman geometrilerinden `getBounds()` hesaplayıp `fitBounds()` çağırır.

Veri kümesinin kendi açıklamasına göre `ELEV=1` 10 g/km², `ELEV=2` 100 g/km², `ELEV=3` 1 kg/km² modellenmiş mikroplastik kütle yoğunluğu eşikleridir. Her çizginin bilgi penceresi ilgili değeri gösterir. Açma-kapama kontrolü başlangıçta kapalıdır. Git düğmesi katmanı açıp kapsamına yaklaşır. Veri yükleme hatası durumunda hata metni gösterilir ve kontrol kapalıya döner.

## Tekrar üretme

Proje kökünde Python ve pyshp gereklidir. İndirilen arşiv geçici klasöre yazılır. Dönüştürücü beklenen MD5, PRJ, CPG, geometri türü ve ELEV değerlerini kontrol eder.

```powershell
py -m pip install "pyshp>=3,<4"
Invoke-WebRequest https://ndownloader.figshare.com/files/44299727 -OutFile "$env:TEMP\odak-gpgp-research.zip"
py tools/convert_gpgp.py "$env:TEMP\odak-gpgp-research.zip" --out assets/gpgp-contours.json
npx.cmd playwright test tests/gpgp.spec.cjs
```

Tarayıcı sınır çizgileri için `assets/gpgp-contours.json` dosyasını okur, Python yalnızca dönüşüm içindir. Kaynak değişirse dönüştürücü özeti sessizce kabul etmek yerine hata verir ve yeni kaynağın incelenmesini gerektirir.

## Tüm boyut sınıfları raster yoğunluk katmanı

Figshare v2 dosyası `MassConcentrationAllSizes.tif` (44299730) indirildi. MD5 özeti `416739e1891ab1e8117e05847f285fd3` ile eşleşti. Özgün dosya `tools/data/MassConcentrationAllSizes.tif` içinde yereldir. Kaynak ve CC BY 4.0 lisansı yukarıdaki veri setiyle aynıdır. Gösterim sırasında Figshare'e indirme isteği gönderilmez.

TIFF 201×126 hücreli, tek bantlı Float64 veridir. GeoTIFF EPSG:4326 / WGS84, PixelIsArea ve 0,2° hücre aralığı tanımlar. Dış piksel kapsamı `[-160, 20, -119.8, 45.2]`, sol üst köşe `[-160, 45.2]` olarak okundu. GDAL NoData değeri `-9999` tanımlıdır. Gerçek dosyada bu işarete eşit hücre yoktur, fakat 1.277 hücre `-Infinity` içerir. Maske dışı ve tüm sonlu olmayan değerler eksik kabul edilip alfa=0 ile şeffaf bırakılır.

TIFF birim etiketi veya ölçek/ofset açıklaması içermez. `log10(g/km²)` birimi ve tüm boyut sınıfları kapsamı resmî Figshare v2 dosya açıklamasından alınmıştır. Dosyada buna aykırı birim metaverisi bulunmamıştır, birim TIFF etiketiyle bağımsız olarak doğrulanamamıştır. Her geçerli kaynak değeri `x` için `10**x` uygulanır. Sonlu negatif log değerleri geçerlidir ve 1 g/km² altındaki yoğunlukları gösterir. `x=0` değeri 1 g/km² olur. Eksik değerlerden sıfır üretilmez.

24.049 geçerli hücrenin log aralığı yaklaşık -2,51397–5,23479, doğrusal yoğunluk aralığı 0,003062–171.707,791 g/km² olarak bulundu. Renkler tüm boyut sınıfları rasterı için seçilen logaritmik aralıkları gösterir. Aralıklar g/km² cinsinden `<1`, `1–<10`, `10–<100`, `100–<1.000`, `1.000–<10.000`, `10.000–<100.000`, `≥100.000` şeklindedir. Alt sınır dahil ve üst sınır hariçtir. Mikroplastik sınır çizgilerinin ELEV alanı renk sınıflandırmasına girdi olarak kullanılmaz.

`prepare_gpgp_raster.py` rasterı Leaflet'in EPSG:3857 düzlemine en yakın komşu örneklemeyle dönüştürür. Tam dış piksel kapsamı korunur. Doğrudan enlem-boylam PNG germe yerine Mercator projeksiyonu uygulanır. Kaynak satırları kuzeyden güneye sıralanır ve PNG aynı sırayı korur. Çıktı `assets/gpgp-mass.png`, coğrafi yerleşim ve renk metaverisi `assets/gpgp-mass.json` dosyasındadır. Şeffaf alanlar dışında katman opaklığı 0,65'tir. Raster, taban katmanın üzerinde ve sınır çizgilerinin altında ayrı bir pane içinde çizilir. Piksel görünümü korunur.

Yoğunluk anahtarı ve renk açıklaması mevcut araştırma paneline eklenmiştir. Sınır çizgileri ve raster bağımsız açılıp kapanabilir. Açılan raster tarayıcıda saklanır ve tekrar açmada aynı Leaflet nesnesi kullanılır. Kaynak atfı raster tek başına açıkken de görünür. Araştırma yılı 2018'dir, dosya eklenme tarihi ölçüm tarihi olarak kullanılmaz.

Yeniden hazırlama ve kontroller proje kökünde çalıştırılır.

```powershell
py -m pip install rasterio numpy Pillow
# Yalnızca özgün dosyayı yeniden almak gerektiğinde
Invoke-WebRequest https://ndownloader.figshare.com/files/44299730 -OutFile tools/data/MassConcentrationAllSizes.tif
py tools/prepare_gpgp_raster.py tools/data/MassConcentrationAllSizes.tif
py -m unittest discover -s tools -p test_gpgp_raster.py
npx.cmd playwright test tests/gpgp.spec.cjs
```

Sayısal testler log dönüşümünü, gerçek sıfır log değerini, negatif logları, NoData ve sonsuz değerlerin şeffaflığını, renk sınırlarını ve gerçek raster istatistiklerini denetler. Ayrıca üretilen görüntünün her piksel merkezi Mercator'dan geri dönüştürülüp özgün hücre ile karşılaştırılır. Tarayıcı testleri gerçek sınırları, yarı saydamlığı, iki katmanın birlikte ve bağımsız açılıp kapanmasını, hata durumunu ve yerel dosyaların yeniden kullanılmasını kontrol eder.
