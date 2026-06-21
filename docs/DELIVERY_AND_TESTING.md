# Delivery and testing strategy

Bu projenin kullanim hedefi, kodu Instagram sayfasinda Chrome console'a yapistirma zorunlulugunu kaldirmak. En iyi yol bunu asamali yapmak.

## Uygulama secenekleri

### 1. Chrome extension

Onerilen ana yol budur.

Kullanim:

- Kullanici extension'i yukler.
- Instagram web acikken extension ikonuna tiklar.
- Content script Instagram sayfasina UI overlay'i enjekte eder.
- API istekleri kullanicinin mevcut Instagram oturumu/cookie'leriyle calisir.

Avantajlar:

- Console'a kod yapistirma gerekmez.
- Tek tikla calisir.
- UI, storage, permission ve update modeli daha temizdir.
- Chrome Web Store veya manuel unpacked extension olarak dagitilabilir.

Riskler:

- Chrome Manifest V3 kurallari dikkat ister.
- Instagram DOM ve web endpoint degisiklikleri extension'i etkileyebilir.
- Store'a koyarsak otomasyon ve platform policy incelemesi hassas olabilir.

Ilk extension hedefi:

- `manifest.json`
- `content-script.tsx`
- `popup.html`
- `popup.tsx`
- `src/services/instagram-api.ts`
- `src/app/App.tsx`

### 2. Userscript

Tampermonkey/Violentmonkey ile calisan ara cozum.

Avantajlar:

- Console paste'den cok daha kolay.
- Chrome extension'a gore daha hizli prototiplenir.
- Test kullanicilari tek dosya yukleyebilir.

Riskler:

- Kullaniciya userscript manager kurdurur.
- Uzun vadeli urun hissi Chrome extension kadar iyi degildir.

### 3. Bookmarklet

Mevcut console paste akisini tek tik bookmark'a cevirir.

Avantajlar:

- En hizli gecis.
- Extension veya userscript gerektirmez.

Riskler:

- Uzun kodlarda tarayici sinirlari ve CSP sorunlari cikabilir.
- Guncelleme deneyimi kotudur.
- Buyuyen uygulama icin gecici cozumdur.

### 4. Hosted web app

Tek basina yeterli degildir.

Instagram cookie'leri ve same-origin kurallari nedeniyle disaridaki bir web app, Instagram web session'i ile dogrudan guvenilir sekilde calisamaz. Hosted app sadece dokumantasyon, release indirme veya extension onboarding icin kullanilmali.

## Onerilen yol

1. Kisa vadede mevcut script davranisini bozmadan `instagram-api` servis katmanini ayir.
2. UI'yi Instagram sayfasina enjekte edilebilen `App` komponenti olarak izole et.
3. Chrome extension icin Manifest V3 iskeleti ekle.
4. Development modda unpacked extension olarak test et.
5. Stabil olunca userscript build'i opsiyonel artefact olarak uret.

Bu yol, console paste bagimliligini kaldirirken mevcut kodu bir anda cope atmadan ilerletir.

## Test stratejisi

### 1. Unit test

Amac:

- Skor hesaplama.
- Segmentleme.
- Filtreleme.
- Export kolonlari.
- Action queue secim mantigi.

Onerilen arac:

- `vitest`
- `@testing-library/preact`

Ilk unit test adaylari:

- `getUsersForDisplay`
- engagement score calculator
- recommendation mapper
- whitelist/action queue protection

### 2. Mock Instagram API testleri

Gercek Instagram endpoint'lerine testlerde baglanmayacagiz.

Yaklasim:

- Instagram response fixture'lari `tests/fixtures/instagram` altinda tutulur.
- `fetch` mock'lanir.
- Pagination, empty page, rate limit ve malformed response durumlari test edilir.

Test edilecek akislar:

- following scan
- followers scan
- post liker scan
- story viewer scan
- scan pause/resume
- retry ve hata loglama

Ilk uygulama durumu:

- Ham liker/commenter/viewer/reaction response'lari once fixture-backed adapter testlerinden gecer.
- Adapter katmani eksik `id` veya `username` iceren kayitlari sessizce eler.
- UI ve skor motoru endpoint response'lariyla degil, normalize edilmis snapshot ve `EngagementSignal` formatlariyla calisir.
- Kisisel hesapla smoke test, bu adapter testleri ve dry-run kilidi oturduktan sonra yapilir.
- Read-only servisler endpoint URL'lerini su an disaridan alir; URL discovery/canli endpoint dogrulamasi kisisel hesap smoke testinden hemen once ayrica yapilir.

### 3. Local preview UI testleri

Mevcut kodda `localhost` preview destegi var. Bunu koruyup genisletecegiz.

Yaklasim:

- `npm run build-dev`
- `http://localhost:<port>?preview=scanning`
- Sahte engagement verileriyle tum tablar render edilir.

Test edilecek ekranlar:

- Non-followers
- Low post engagement
- Story ghosts
- Top supporters
- Action queue
- Settings

### 4. Playwright E2E

Instagram'a login olmadan calisan browser testleri.

Yaklasim:

- Local preview sayfasini ac.
- Mock verilerle UI'yi gez.
- Filtre, siralama, secim, export ve action queue davranisini dogrula.

Onerilen kontroller:

- Liste bosken UI kirilmiyor.
- 1000+ kullaniciyle sayfalama calisiyor.
- Whitelist hesaplari aksiyon kuyruguna girmiyor.
- Story sonucu "observed only" notunu gosteriyor.
- Export dosyasi beklenen kolonlari iceriyor.

### 5. Extension smoke test

Gercek Instagram ortaminda sadece kucuk ve manuel test.

Kural:

- Ilk testlerde action mode `dry-run` olur.
- Unfollow/mute gibi islemler otomatik calistirilmaz.
- Test hesabi veya dusuk riskli hesap kullanilir.
- En fazla birkac kullanicilik secimle manuel onay akisi denenir.

Smoke checklist:

- Extension Instagram sayfasinda aciliyor.
- Overlay render ediliyor.
- Mevcut kullanici id/csrf okunuyor.
- Following scan ilk sayfayi cekiyor.
- Stop/pause calisiyor.
- Export calisiyor.
- Dry-run action log uretiyor.

## CI hedefi

GitHub Actions ile ilk etapta sunlar yeterli:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Mevcut `package.json` henuz `typecheck`, `lint` ve `test` scriptlerini ayirmiyor. Faz 1'in bir parcasi olarak bu scriptleri eklemek gerekir.

## Guvenlik ve hesap koruma

- Aksiyonlar once `dry-run` olarak tasarlanir.
- Batch islemlerde rastgele bekleme ve sert limit olur.
- Whitelist her aksiyon turunde korunur.
- Story verisi kesin gercek olarak degil, gozlemlenen sinyal olarak gosterilir.
- Kullaniciya her aksiyon oncesi net ozet ve onay gosterilir.

## Ilk teknik adim

Bir sonraki PR icin hedef:

- `src/services/instagram-api.ts` ekle.
- Mevcut following scan URL ve fetch mantigini buraya tasi.
- `npm run typecheck`, `npm run lint`, `npm test` scriptlerini eklemeye hazirla.
- `vitest` ve ilk `getUsersForDisplay` testiyle test altyapisini baslat.
- Chrome extension iskeletini bundan sonraki PR'a birak.
