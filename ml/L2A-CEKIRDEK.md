# FOCUS — gerçek tespit çekirdeği

19 Kasım 2026. Bu aşama araştırma prototipidir; bağımsız Karadeniz saha doğruluğu veya doğrulanmış plastik türü/yaşı sunmaz.

## Çalışan yol

`ml/detect-pretrained.cjs`, gerçek Sentinel-2 L2A COG bantlarını `l2a-grid.cjs` ile okuyup `ml/pretrained_predict.py` işçisine aktarır. Kullanılan model Rußwurm, Venkatesa ve Tuia (2023), UNet++, seed 1 / ResNet34 / 12 giriş bandıdır. Ağırlıklar model mimarisine strict yüklenir; rastgele veya eksik ağırlıklı çalışma kabul edilmez.

Bant sırası B01, B02, B03, B04, B05, B06, B07, B08, B8A, B09, B11, B12. Ham NoData ölçek/ofsetten önce dışlanır. Her bant kendi STAC ölçek ve ofsetiyle fiziksel yansımaya çevrilir; ikinci kez 1e-4 çarpanı uygulanmaz. Bantlar etiket/çıktı 10m ızgarasının hücre merkezlerinde nearest yöntemiyle örneklenir; 20m/60m bantlar gerçekte 10m çözünürlük kazanmış sayılmaz.

Varsayılan çıkarım, 2.56km bağlam penceresinin ortasındaki 1×1km alanı döndürür. SCL su sınıfı, yaklaşık 60m dairesel güvenlik payı ve eksik bantlar aday uygunluğunu sınırlar. Yazarların sabit eşiği 0.06387047469615936; bu kalibre edilmiş plastik olasılığı değildir. En az iki komşu çıktı hücresi aday kümesi oluşturur; gösterim en fazla 25 adayla sınırlıdır. Koordinatlar yaklaşık model aday merkezleridir; fiziksel plastik yüzey alanı, parça sayısı veya tonaj değildir.

## Güncellik ve kaynak

Canlı arama, son 45 gün içinde sınırlı sayıda yeni sahne/kareyi inceler. Tüm sahnenin bulut yüzdesi yüksek olsa da seçili 1km bölgenin SCL su açıklığı kullanılabilir olabilir. En fazla 8 ayrı geçiş/kare örneği ve yeniden işleme kopyaları için en fazla 16 katalog seçimi yapılır; en az 1000 önizleme su hücresi gerekir. Aynı zaman damgalı komşu kareler dışlama listesiyle korunur. Aynı geçişin yeniden işleme sürümleri s2:datatake_id temelinde ayrılır; komşu MGRS kareleri ayrıca incelenebilir. Bu bir görüntü uygunluk kontrolüdür, doğruluk garantisi değildir.

Kaynak sahne, gözlem tarihi, alınma tarihi, model/çekirdek özeti, yöntem ve çıktı ızgarası GeoJSON metaverisinde tutulur. Yedi günlük yerel görüntü penceresi önbelleği yalnızca aynı sahne, konum, bant kalibrasyonu ve sürümde yeniden kullanılır. Yeni sahne araması bu önbellekten bağımsızdır. Tarihî konum güncel atık konumu sayılmaz. Arşivden bugüne sürüklenme bu aşamada yoktur.

## Kurulum ve tekrar üretim

Mevcut projede model ve ayrı Python ortamı hazırlandı. Yeni kurulum için Node.js ile Python ve aşağıdaki proje ortamı gerekir:

```powershell
py -m venv --system-site-packages ml/.venv
ml/.venv/Scripts/python.exe -m pip install -r ml/requirements-pretrained.txt
ml/.venv/Scripts/python.exe ml/setup_pretrained.py
npm.cmd start
```

Ağırlık kurulumu yazarların yayımladığı HTTPS kaynağından indirilir. Checkpoint SHA256: `3c1219fb1f56561aaef168a8060d8fc591339ff76e6d3740c246f79b02a6079b`. Yalnızca weights_only ve açıkça izin verilen argparse.Namespace ile okunur; sonrasında yalnızca tensor içeren safetensors dosyası kullanılır. Kullanıcıdan model/pickle dosyası alınmaz. Ağırlıklar, ortam, veri ve çıktılar Git dışındadır. Adaptör SMP 0.6.0 / PyTorch 2.14.1 CPU ile çalıştırıldı; bu sürüm bilgisi yeniden üretimde önemlidir.

Komut satırında gerçek sahne: `node ml/detect-pretrained.cjs 41.6 30.9`. Çıktı `ml/output/pretrained-live-candidates.json`. Bu dosyadaki aday/boş sonuç bağımsız doğrulama değildir. Sunucu ve harita bağlantısı `tools/TESPIT-ENTEGRASYON.md` içinde açıklanır.

## Yapılan pilot ve sonuç

İlk küçük 11 bantlı RF modeli ayrıca L2A girdileriyle yeniden eğitildi. Önceden seçilmiş yosun, köpük, gemi, dalga ve iz karşı örnekleri eklendi. 103 anotasyon parçasının 100'ü aynı tarih/aynı kare L2A verisiyle çıkarılabildi; üç eski parçanın kaynak görüntüsü bulunamadı. Eksikler raporda ve izin verilen katalog kapsamı boşlukları dışında çıkarım hatası atlanamaz. Resmî eğitim/doğrulama/test sahne ayrımı korundu, eşik yalnızca doğrulamada seçildi. Kullanılabilen test bölümünde 38 atık pikselinden 8'i bulundu, 30'u kaçırıldı; bir yanlış pozitif vardı. Bu model ürün tespit servisine bağlanmadı. Eski 64 pozitifli örnekle doğrudan başarı karşılaştırması yapılmaz.

Yayımlanmış UNet++ için iki örnek, model skorlarına bakmadan anotasyon sayısına göre önceden seçildi: kullanılabilen testte en fazla atık etiketi içeren parça ve atık etiketi içermeyen en fazla köpük etiketi içeren parça. Giriş bağlamı etiket penceresinin 640m dışına uzatıldı. Eşik değiştirilmedi. Etiketsiz veya düşük güvenli pikseller negatif sayılmadı; maskelenen atık etiketi varsa kaçırma sayılır. Aşağıdaki sayılar uygun piksellerin eşiklenmesini ölçer; küme gösterim filtresinden öncedir.

- Atık örneği: **27 doğru pozitif, 25 yanlış pozitif, 0 kaçırma, 61 doğru negatif**. Ayrıca 902 etiketsiz/eşlenemeyen yüksek skor hücresi var; bunların doğruluğu bilinmiyor. Beş aday kümesi oluştu. Sahne: S2B_18QYF_20201222_2_L2A, 22 Aralık 2020.
- Köpük kontrolü: **91 etiketli negatifte 0 yanlış pozitif**. Aday kümesi oluşmadı. Sahne: S2A_16PCC_20201212_1_L2A, 12 Aralık 2020.

Bu iki zenginleştirilmiş örnek genel başarı oranı, tam MARIDA testi veya Karadeniz doğruluğu değildir. Pozitif örnekteki yanlış alarmlar nedeniyle yüksek doğruluk vaadi karşılanmış sayılamaz. Modelin güçlü tespit işareti üretebildiği görülür; daha geniş, önceden kilitlenmiş ve coğrafi olarak bağımsız değerlendirme gereklidir. Tespit yaşı, polimer türü ve geri dönüşüm değeri çıkartılmaz.

Ham pilot raporu `ml/output/pretrained-pilot-report.json`, aday/skor dosyaları aynı klasördedir. Tekrar: `node ml/evaluate_pretrained_pilot.cjs`.

## Yazılım kontrolleri

```powershell
npm.cmd test
py -m unittest discover -s ml -p test_l2a_contract.py
ml/.venv/Scripts/python.exe -m unittest discover -s ml -p test_pretrained.py
```

Bunlar birim/aktarım/kaynak/maske/iptal kontrolleridir, saha doğruluğu değildir. Veri aktarımı boyut sınırları olan float32 protokolüdür; büyük JSON listelerinin gecikmesi azaltıldı. Model tarihinin tahmin başlangıcına karıştırılmaması ayrıca arayüz testleriyle kontrol edilir.

## Kaynaklar

- Rußwurm vd. (2023): https://doi.org/10.1016/j.isci.2023.108402
- Yazarların kodu ve yayımlanmış model bağlantıları (MIT kod lisansı): https://github.com/MarcCoru/marinedebrisdetector
- MARIDA / Kikaki vd. (2022), veri CC BY 4.0: https://doi.org/10.1371/journal.pone.0262247 ve https://doi.org/10.5281/zenodo.5151941
- Sentinel-2 STAC alanları: https://github.com/stac-extensions/sentinel-2
- Earth Search: https://earth-search.aws.element84.com/v1/api.html
