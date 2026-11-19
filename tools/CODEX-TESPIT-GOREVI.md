# Codex görevi — FOCUS tespit çekirdeğini haritaya bağla

Kullanıcı açıkça Canva vaatlerini yerine getirmemizi ve sonra VS Code Codex ile kodlamaya geçmemizi istedi. Proje C:\Users\Judex\Desktop\lockın. Önce güncel git durumunu, tools/URUN-KABUL-KOSULLARI.md ve tools/FOCUS-DEVIR.md dosyalarını oku. index.html artık tanıtım; platform.html çalışma alanı. Önceki ODAK/Standart-Pro-Max düzen koduna geri dönme.

## Hazır gerçek model servisi

Koordinatör yeni ML dosyalarında çalışıyor: ml/detect-pretrained.cjs, ml/pretrained_predict.py, l2a-grid.cjs ve ml/*.py dosyalarını DEĞİŞTİRME; yalnızca oku. Model ağırlıkları/ortam ml/output ve ml/.venv içinde, Git dışında.

`const {detect,status}=require('./ml/detect-pretrained.cjs')`
- status(): {available, model_id, validation_status:'research_only'}.
- await detect(lat,lon,{signal:AbortSignal.timeout(110000)}): gerçek Sentinel-2 L2A 12 bantlarını işleyip GeoJSON FeatureCollection döndürür.
- features: Point geometrileri [lon,lat]; properties: candidate_id, observed_at, scene_id, grid_pixels, max_score, status:'unverified_model_candidate'.
- metadata: schema_version, model_id, model_sha256, checkpoint_sha256, source (makale DOI), scene_id, observed_at, retrieved_at, scene_cloud_percent, observation_age_hours, query, contract, grid, score_kind:'uncalibrated neural-network score', threshold, eligible_pixels, excluded_pixels, above_threshold_pixels, candidate_clusters, truncated, validation_status:'research_only', mask ve warnings.
- max_score veya threshold kalibre edilmiş plastik olasılığı değildir. Kullanıcıya güven yüzdesi gösterme.
- Küçük RF modeli yetersiz bulundu, onu bağlama. Yayımlanmış UNet++ mimariye eksiksiz yüklendi, gerçek Karadeniz görüntüsünde çıkarım tamamlandı. Bağımsız yerel doğruluk henüz kanıtlanmadı; prototip araştırma özelliğidir.

## Uygula

1. server.cjs içine korumalı GET /api/satellite/detection?lat=...&lon=... ve GET /api/detection/status ekle. Mevcut Host/Origin kontrollerini KORU; bunlar 5500'e açılmayacak. Sağlık yanıtındaki özellik varlığına status bilgisini gerektiği kadar ekle. Geçersiz koordinat, hazır olmayan model, meşgul sunucu, zaman aşımı ve sağlayıcı hatası anlaşılır JSON dönsün. Aynı pahalı analizler için mevcut busy kilidini paylaş. Shell komutu oluşturma; hazır modülü çağır.
2. platform.html ve ayrı js/detection-ui.js ile haritaya gerçek 'Yapay zekâ ile atık adaylarını ara' araştırma akışını ekle. Konum seçimi, yükleme, boş sonuç, hata/tekrar deneme, katman temizleme ve GeoJSON indirme çalışsın. Kaynak/gözlem tarihini ana sonuçta göster; skor/yöntem ayrıntılarını açılır kaynak notuna koy. Yeni özellik FDI ile karışmasın; mevcut FDI, GPGP, CYGNSS, kayıtlar ve tahminler korunsun. Sonuç boşsa 'Aday bulunmadı; atık yok anlamına gelmez' de.
3. Aday seçimiyle koordinat ve gözlem kaynağı korunabilsin. Eski uydu konumunu bugünkü atık konumu sayarak otomatik tahmin başlatma. Arşivden bugüne izleme henüz yok. Yalnızca kullanıcı açıkça 'Bu koordinatı güncel başlangıç varsay' seçerse 6/12/24 saat varsayımsal senaryoya geç; varsayımı sonuç ve JSON'da koru. Tarihli gerçek takip tamamlandı iddiası ekleme. İhtiyaç halinde app.js ve ensemble arayüzünü bu sınırlı kaynak aktarımı için uyumlu değiştir; koordinatör bu dosyalara dokunmayacak.
4. TR/EN, 390px, klavye erişimi, eski/iptal edilmiş isteklerin sonucu bozmasını önleme ve uzak metnin HTML olarak çalışmaması için anlamlı testler ekle. Gerçek kullanıcı kaydını değiştirme. Model testlerini canlı servise bağımlı yazma: API/arayüz davranışları taklit yanıtla, kaynak/yerel gerçek deneme koordinatör tarafından kontrol edilecek.
5. Canva'yı ve tanıtımı yeniden tasarlama, ödeme/hesapları taklit etme, doğruluk yüzdesi uydurma. Yalnızca çekirdeği gerçek servise bağla.

## Çalışma sınırları

Kullanıcı kayıtları/fotoğrafları, raw NetCDF, ml/datasets, ml/output ve kullanıcı tarafından değiştirilmiş tools/CYGNSS-GUNCELLEME.md korunacak. Mevcut sunucuları kapatma. İnceleme için 8772 zaten açık; server.cjs değişikliklerini testlerde ayrı geçici sunucuda çalıştır veya yeni boş port seç. 5500 statik önizleme. Bu görevde git add/commit/push/stash/reset yapma; koordinatör ML değişiklikleriyle birlikte son denetimi ve özel yedeklemeyi yapacak.

Uygulamayı tamamla, ilgili testleri çalıştır ve değişen dosyalarla somut eksikleri raporla. Kullanıcıdan soru bekleme. Ana hedef, Canva'daki tespit-konum-tahmin zincirini bilimsel sınırları açık bir çalışan prototipe ilerletmek.
