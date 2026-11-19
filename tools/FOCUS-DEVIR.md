# FOCUS — denetim sonrası devir

19 Kasım 2026 · Yerel Brave denemesi, kaynak incelemesi ve otomatik testler.

## Ürün hakkında karar

Araştırma demosu çalışıyor; ticari ve bilimsel doğrulaması tamamlanmış ürün değil. En büyük açık artık buton tasarımı değil: gerçek plastik tespiti ve hareket tahmininin bağımsız doğrulanması. Premium görünüm bu açığı kapatmaz. Uzun bilimsel analiz açıklamaları ileri görünümde hâlâ yoğundur; sonraki tasarım turunda kısa sonuç özeti + ayrıntı yapısı düşünülmeli.

Referans [Canva FOCUS_Sunum](https://www.canva.com/design/DAHbShpGKkg/08bEjsfmsBCz3sBDXaUUHw/edit): Forecasting Ocean Contamination Using Satellites, uydu gözlemi, hareket tahmini ve kuruluşlara karar desteği. Ekip ve hedef kitle korundu. 33 günlük Adana–Antalya araştırma örneği uygulamanın doğrulanmış başarısı olarak kullanılmadı. Yapay zekâ ile plastik tespiti geliştirme aşamasında gösterildi.

## Denetimde bulunan ve düzeltilenler

1. **P0 — Statik sayfa / API uyuşmazlığı.** 5500'de spektral analiz ve karşılaştırma backend'e erişemiyordu; HTML yanıtı ham JSON ayrıştırma hatası oluyordu. `js/service.js`, `assets/focus-runtime.json`, `server.cjs` ve `js/satellite-ui.js`: sağlık kontrolü, anlaşılır hata ve çalışan tam uygulamaya geçiş. Sağlık dışında kayıt/analiz uçları farklı origin'e açılmadı.
2. **P1 — Yanıltıcı paket adları.** Eski Standart/Pro/Max yalnızca panel düzeniydi. `js/experience.js`, `js/plans.js`: düzenler Sade/Araştırma/Gelişmiş; yıllık paketler ayrı. Ücretsiz / Pro 20 USD/yıl / Max 100 USD/yıl. Ödeme kapalı; tarayıcıda satın alınmış hak taklidi yok. Özellik dağılımı planlanan ticari kapsamdır, mevcut demoda araçlar açıktır.
3. **P1 — Marka ve giriş karmaşası.** `index.html`, `platform.html`, `js/landing.js`, `css/landing.css`: FOCUS tanıtım, vizyon, hedef kitle, fiyatlandırma ve araştırma çalışma alanı ayrıldı. Slogan vizyon olarak etiketlendi. Eski bölüm bağlantıları çalışma alanına taşınıyor.
4. **P1 — Gerçek uydu sahnesinin seçimi.** Önceki katalog akışı ilk 20 sonucu alıp yerelde sıralıyordu; en yeni uygun sahneyi garanti etmiyordu. `scene-search.cjs`, `satellite.cjs`: sağlayıcıda `sortby=-properties.datetime`, en fazla 5 sayfa/100 kayıt, zaman/kaynak/sonraki bağlantı doğrulaması. İlk denenen `-datetime` sağlayıcıdan HTTP 400 aldı; gerçek servis denemesiyle doğru alan bulundu. [Sağlayıcı API açıklaması](https://earth-search.aws.element84.com/v1/api.html).
5. **P2 — Araştırma başlangıcı belirsizdi.** `js/map-search.js`, `js/app.js`: kıyı başlangıç noktaları ve koordinat araması, seçili noktada uydu incelemesine geçiş. Küresel adres araması değildir; bulunmayan ad için koordinat seçeneği gösterilir. Konum bulunması atık bulunması olarak sunulmaz.
6. **P2 — Tahmin ve mobil yoğunluğu.** `platform.html`, `css/focus-workspace.css`: çoklu parçacık ana akış; eski modeller ileri açılır grupta. Mobilde tekrar eden açıklamalar sıkılaştırıldı; 390 px yatay taşma yok.
7. **P2 — Gerçek analizde karışık dil.** `js/i18n.js`: uzun kaynak açıklaması önce çevrilmeden içindeki kısa kelimeler değişiyordu. Uzun ifadeler önce çevriliyor; görsel alternatif metinleri ve yeni katalog hataları eklendi. Girişte EN seçiminin çalışma alanında kaybolması da düzeltildi.

## Gerçek deneme kanıtı

- Brave'de 5500 tanıtımından 8772 tam çalışma alanına geçiş görüldü. `node tools/start-local.cjs` mevcut sağlıklı sunucuyu yeniden kullandı.
- Karadeniz 41.6, 30.9: gerçek analiz S2A_36TUM_20261022_1_L2A, 22 Ekim 2026 08:58 UTC, sahne bulutluluğu %12.3; 1936 geçerli / 564 maskeli hücre. Bu bir atık doğrulaması değildir.
- İki tarih karşılaştırması: 10 ve 22 Ekim, 1936 ortak geçerli su hücresi; medyan FDI farkı 0.0012. Atığın yaşı olarak yorumlanmadı.
- Gerçek akıntı/rüzgârla Karadeniz'de 75 parçacık 6 ve 24 saat sonuçlandı. Bu olay doğruluk/hindcast değerlendirmesi değildir.
- Mevcut 441 CYGNSS hücresi, 192 GPGP çizgisi ve rasterı korundu; tarih, birim, önbellek ve hata davranışları testlerde kontrol edildi.
- Tam arayüz paketi 61/61; son dil düzeltmesi ve ek gerçek-not regresyonu için ilgili 17/17; son mobil düzen için ilgili 7/7. Böylece 62 farklı tarayıcı senaryosu geçerli. Node birim/API paketi 42/42; katalog alanı düzeltmesinden sonra ilgili 2/2 yeniden geçti. Python okuyucu/güncelleme bu turda değiştirilmedi.
- CSV indirme otomatik tarayıcı testinde geçti. Kullanıcının Brave'indeki yerel kaydetme penceresi bu turda ayrıca doğrulanmış sayılmadı.

## Kalan işler — sırayla

1. **P0 / bilimsel ürün çekirdeği:** `ml/README.md` ve `ml/output/evaluation.json` içindeki küçük MARIDA deneyini bağımsız değerlendir. 11 bant/Rayleigh düzeltmesi ile canlı L2A akışını eşdeğer sayma. Bant/ön işleme sözleşmesi, bağımsız coğrafi-zamansal negatif sahneler, yanlış pozitif analizi ve saha doğrulaması olmadan modeli siteye bağlayıp güven yüzdesi verme.
2. **P0 / satışa açılma:** gerçek kimlik doğrulama, sunucuda abonelik hakları, kullanım kotaları ve ödeme sağlayıcısı kurulmalı. Şimdiki localhost sunucusu bunları sağlamaz; doğrudan internete açılmamalı. Sağlayıcı hesabı/anahtar ve gerçek sözleşmeler kullanıcı gerektirir. Bu turda ödeme veya hesap oluşturulmadı.
3. **P1 / tahmin doğrulaması:** geçmişten bugüne iz sürme ve 33 günlük tahmin yok. Tarihli başlangıç + geçmiş çevresel alanlar + bağımsız drifter/saha rotasıyla hata ölçümü gerekli. Mevcut 6/12/24 saat senaryolarını olasılık veya güvenli toplama rotası diye satma.
4. **P1 / süreklilik:** CYGNSS sonraki aylık kontrol tarihi 18 Aralık 2026; veri tarihi 28 Ekim 2026. Otomatik indirme için geçerli yerel Earthdata yapılandırması ve çalışan süreç gerekir. Arayüzün güncelleme saati veri tarihi değildir. Token'ın gelecekte geçerli kalacağı bu turda doğrulanmadı.
5. **P1 / ticari işletim:** veri/API ticari kullanım koşulları, maliyet/kota planı, gerçek sunucu barındırma, erişim kontrolü, yedekleme ve hata izleme tamamlanmalı. Yerel bildirimler ortak kurumsal veri tabanı değildir.
6. **P2 / tasarım:** analiz sonuçlarının uzun açıklamalarını, veri kaynağını kaybetmeden özet + ayrıntıya dönüştür. Küçük yazı ve ileri görünüm yoğunluğunu gerçek kullanıcılarla değerlendir. Küresel bölge araması, hata sonrası yönlendirme ve gerçek saha geri bildirimleri sonraki kullanıcı deneyimi adımıdır.

## Korunanlar ve iletişim

Gerçek kullanıcı kayıtları/fotoğrafları ve ham NetCDF değiştirilmedi veya Git'e eklenmedi. Kullanıcının önceden değiştirdiği `tools/CYGNSS-GUNCELLEME.md` bu çalışmanın commit'ine alınmamalı. Mevcut 5500/8767 süreçleri kapatılmadı; bu denetimin kendi 8772 sunucusu yenilendi.

VS Code Codex sohbetine görev gönderme denemesi `already has an active writer` ile reddedildi. Mesaj teslim edilmiş sayılmıyor. Devam promptu aşağıdadır.

## Sonraki görev promptu

Mevcut FOCUS dosyalarını temel al. Önce bu devir belgesini ve güncel git durumunu oku. Tanıtımı yeniden tasarlama; Canva'daki uydu gözlemi, atık incelemesi, tahmin ve karar desteği kapsamını koru. İlk görev, MARIDA modelinin canlı Sentinel-2 iş akışına bağlanmasının bilimsel ve teknik uyumluluğunu yalnızca okumayla denetlemek. Veri ayrımlarını, bant sırasını, yansıma düzeltmesini, sahne bağımsızlığını, eşik seçimini ve yanlış pozitifleri dosya yollarıyla raporla. Sayısal sonuçları tüm okyanus/yerel Karadeniz doğruluğu diye genelleme. Sonra tekrar üretilebilir bağımsız değerlendirme planını hazırla; eksik anahtar/saha verisi gereken aşamayı açıkça ayır. Onaylanmamış model, güven yüzdesi veya sahte tespit katmanı ekleme. Kullanıcı kayıtlarını, CYGNSS ham/veri çıktılarını ve mevcut süreçleri koru. Yeni testler yalnızca anlamlı veri sözleşmesi ve regresyonları kapsasın. Ticari özelliklere geçerken hakları yalnızca sunucuda uygula; localStorage abonelik sayılmaz. Kullanıcıdan bu turda bilgi bekleme; bağımsız ilerlenebilen işleri tamamla ve kanıtla.
