# Instagram engagement roadmap

Bu fork'un hedefi, mevcut "geri takip etmeyenleri bul" akisini daha genis bir takipci sagligi aracina cevirmek:

- Geri takip etmeyenleri listelemek ve secilenleri unfollow kuyruguna almak.
- Postlari hic ya da nadiren begenenleri bulmak.
- Aktif story'leri hic gormeyenleri, veri alinabildigi surece, ayri bir segmentte gostermek.
- Dusuk etkilesimli hesaplari mute adayi olarak isaretlemek.
- En aktif ve yakin takipcileri skorlayip siralamak.

## Temel sinirlar

Instagram'in resmi olmayan web endpoint'leri sik degisir ve hesap kisitlamalarina yol acabilir. Bu fork'ta guvenli varsayim su olmali:

- Veri kullanici tarayicisinda, kullanici zaten Instagram'a giris yapmisken toplanir.
- Kullanici adi, takip iliskisi, begeni ve story goruntuleme verisi dis sunucuya gonderilmez.
- Otomatik aksiyonlar varsayilan olarak kapali olur; once listeleme, filtreleme, export ve manuel onay akisi gelir.
- Story viewer verisi yalnizca Instagram'in hesap sahibine gosterdigi sure ve kapsam dahilinde guvenilirdir.
- "Hic story bakmadi" kesin bir tarihsel gercek degil, sadece arac tarafindan gozlemlenen story pencereleri icin bir sinyaldir.

## Veri modeli

Mevcut `UserNode` yalnizca takip iliskisi icin yeterli. Yeni katman kullanici kimligini Instagram'dan gelen ham profil verisinden ayirir.

```ts
type EngagementProfile = {
  readonly userId: string;
  readonly username: string;
  readonly fullName: string;
  readonly profilePicUrl: string;
  readonly followsViewer: boolean;
  readonly followedByViewer: boolean;
  readonly isPrivate: boolean;
  readonly isVerified: boolean;
  readonly postLikes: number;
  readonly postComments: number;
  readonly storyViews: number;
  readonly sampledPosts: number;
  readonly sampledStories: number;
  readonly lastInteractionAt: number | null;
  readonly score: number;
  readonly recommendation: "keep" | "review" | "mute_posts" | "mute_stories" | "unfollow_candidate";
};
```

Skor baslangic formulu:

```txt
score =
  postLikeRate * 45 +
  storyViewRate * 35 +
  recentInteractionBoost * 15 +
  relationshipBoost * 5
```

Bu formulu UI'da degistirilebilir hale getirmek ikinci fazda mantikli olur.

## Toplama kaynaklari

1. **Following scan**  
   Mevcut `edge_follow` akisi korunur. Bu, "ben takip ediyorum" taban listesini verir.

2. **Followers scan**  
   `edge_followed_by` icin simetrik bir scanner eklenir. Bu, "beni takip edenler" ve yakin takipci siralamasi icin gerekir.

3. **Post engagement scan**  
   Kullanicinin son N postu okunur, her post icin liker/commenter listesi toplanir ve takipci listesiyle eslestirilir.

4. **Story engagement scan**  
   Yalnizca aktif veya Instagram'in viewer listesini gosterdigi story'ler taranir. Eski story'ler icin guvenilir bosluk doldurma yapilmaz.

5. **Local history**  
   Story ve post ornekleri localStorage yerine IndexedDB'de tutulur. Boylece "son 30 gunde 8 story yayinladim, hic birini gormedi" gibi sinyaller uretilebilir.

## UI hedefi

Mevcut tek liste yapisi su sekilde genisletilir:

- `Non-followers`: mevcut akisin iyilestirilmis hali.
- `Low post engagement`: secilen son N post icinde begeni/yorum yapmayanlar.
- `Story ghosts`: gozlemlenen story'lerde goruntuleme sinyali olmayanlar.
- `Top supporters`: post, story ve yakinlik skoruna gore en aktif takipciler.
- `Action queue`: unfollow, mute posts, mute stories veya sadece export secimleri.

Her segmentte ortak kontroller:

- Arama.
- Skora gore siralama.
- Verified/private/no-avatar filtreleri.
- Whitelist.
- CSV/JSON export.
- Manuel onayli aksiyon kuyrugu.

## Aksiyon politikasi

Mevcut unfollow akisi korunabilir, ancak yeni aksiyonlarda varsayilan davranis "aday listele" olmalidir.

- `unfollow`: mevcut secili kullanici kuyrugu.
- `mute_posts`: once profil linkleri ve export; otomasyon ayri bir "experimental" ayar ile acilir.
- `mute_stories`: story izlemeyen segmentinden secilen hesaplar icin ayri kuyruk.
- `keep`: yakin takipciler ve whitelist hesaplari otomatik olarak aksiyonlardan korunur.

## Uygulama fazlari

### Faz 1: Saglam temel

- State tiplerini `scanning`, `unfollowing` ve yeni `engagement` akislari icin ayir.
- `src/services/instagram-api.ts` ekleyip URL/fetch uretimini UI'dan cikar.
- Following ve followers scanner'larini ortak pagination helper ile calistir.
- Sonuclari `EngagementProfile` listesine normalize et.

### Faz 2: Post etkilesimi

- Son N medya icin post secici ekle.
- Liker/commenter toplayicilari ekle.
- `Low post engagement` ve `Top supporters` tablarini ekle.
- Export dosyalarina skor ve sinyal kolonlarini dahil et.

### Faz 3: Story etkilesimi

- Aktif story viewer listelerini topla.
- Story orneklerini IndexedDB'de tarihleriyle tut.
- `Story ghosts` segmentini ve `mute_stories` adaylarini ekle.
- UI'da "bu sonuc sadece gozlemlenen story'lere dayanir" bilgisini goster.

### Faz 4: Aksiyon kuyrugu

- Aksiyonlari tek bir `ActionQueue` modeli altinda birlestir.
- Her aksiyona acik onay, sonuc logu ve geri alinabilir local isaret ekle.
- Mute aksiyonlarini once manuel/export olarak yayinla.
- Otomatik mute desteklenirse experimental ve kolay kapatilabilir tut.

## Ilk teknik PR onerisi

Ilk PR kucuk kalmali:

- `EngagementProfile` ve `EngagementSignal` tiplerini ekle.
- Instagram fetch islerini servis katmanina tasi.
- Following scanner'in davranisini degistirmeden yeni servis uzerinden calistir.
- Preview moduna sahte engagement skorlari ekle.
- UI'da yeni tab basliklarini feature flag ile goster.

Bu PR mevcut unfollower davranisini bozmadan yeni mimarinin temelini atar.
