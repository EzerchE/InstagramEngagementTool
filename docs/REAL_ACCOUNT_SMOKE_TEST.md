# Real account smoke test plan

Bu plan ilk gercek Instagram hesabiyla testi guvenli, read-only ve geri alinabilir tutmak icindir.

## Ne zaman test ederiz?

Ilk gercek hesap testi su an yalnizca **read-only smoke test** olarak yapilabilir.

Henuz test edilmeyecekler:

- Otomatik unfollow.
- Otomatik mute.
- Tum takipci/takip edilen listesine karsi uzun sureli tarama.
- Bilinmeyen veya degisebilen Instagram endpoint'lerine agresif pagination.

Test edilebilecekler:

- Local preview UI.
- Fixture JSON import.
- Aktif story penceresinden manuel veya read-only snapshot denemesi.
- Post liker/commenter response'larini kucuk ornekle normalize etme.
- Target Check ve Non-follower watchers segmentlerinin dogru sinyal uretmesi.

## Ilk gercek test kapsami

1. Test edilecek hesapta yeni veya aktif bir story sec.
2. Yalnizca viewer listesini gozlemle; aksiyon tetikleme.
3. En fazla 1 story ve 1 post ile basla.
4. `npm run build-extension` calistir.
5. Chrome `chrome://extensions` ekraninda `dist/` klasorunu unpacked extension olarak yukle.
6. Instagram web acikken extension ikonuna tikla.
7. Ilk acilan ekranin bos `Engagement` dashboard oldugunu dogrula; demo kullanicilar veya eski `Audit` ekrani acilirsa extension yeniden build/yukleme gerekir.
8. Toplanan veriyi once fixture JSON formatina cevir veya import panelinde dene.
9. `Known non-followers`, `Target Check`, `Top supporters` sonuclarini kontrol et.
10. Sonuclari kesin etiket olarak degil, `possible_*` sinyal olarak yorumla.

Manuel story snapshot hizli test akisi:

1. Aktif story viewer listesinden 3-10 kullanici adini kopyala.
2. Dashboard'daki `1. Add Story Viewers` alanindaki viewer kutusuna yapistir.
3. Reaksiyon verenler varsa ikinci kutuya ekle.
4. `Add Story Snapshot` butonuna bas.
5. `All` listesinde kullanicilarin `Story views` sinyaliyle geldigini kontrol et.
6. `Target Check` ile bu kullanicilardan birini ara.

Not: Manuel snapshot takip iliskisini bilmez; kullanici adlari story sinyali olarak eklenir. `Known non-followers` ayrimi icin sonraki adim takipci/takip edilen relationship importudur.

## Guvenlik kilitleri

- Gercek hesap testinde action queue calistirilmaz.
- Unfollow/mute butonlari kullanilmaz.
- Mutating Instagram aksiyonlari `engagement_guard_enable_mutating_actions=true` localStorage bayragi olmadan calismaz.
- Veri dis servise gonderilmez.
- Snapshot verisi lokal kalir.
- Test kucuk ornekle baslar; sonuc dogrulanmadan daha genis taramaya gecilmez.

## Basari kriterleri

- Story viewer response'u `story_view` sinyallerine donusur.
- Takip iliskisi bilinen non-follower story viewer hesaplari `Known non-followers` segmentinde gorunur.
- Post/reels like, story reaction ve DM sinyalleri kendi ranking tablerinde siralanir.
- Manuel girilen kullanici opsiyonel `Target Check` alaninda sinyal ozeti verir.
- Hic aksiyon tetiklenmeden test tamamlanir.

## Bir sonraki kod adimi

Gercek hesapta console'a kod yapistirmadan test icin Chrome extension kabugu eklendi:

- Manifest V3.
- Ikon tiklamasiyla script injection.
- Local-only storage.
- Dry-run varsayilani.
- Aksiyon endpoint'leri kapali feature flag.
