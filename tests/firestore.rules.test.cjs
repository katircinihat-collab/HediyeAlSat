const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} = require("@firebase/rules-unit-testing");
const {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} = require("firebase/firestore");

const projectId = "demo-hediyealsat";
let env;

const ownerAuth = { uid: "owner-uid", email: "owner@example.com" };
const otherAuth = { uid: "other-uid", email: "other@example.com" };
const adminAuth = { uid: "admin-uid", email: "admin@example.com" };

function dbFor(auth) {
  if (!auth) return env.unauthenticatedContext().firestore();
  return env.authenticatedContext(auth.uid, { email: auth.email }).firestore();
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync(
        path.join(__dirname, "..", "firestore.rules"),
        "utf8"
      )
    }
  });

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "ilanlar", "published"), {
        onay: true,
        sahipUid: ownerAuth.uid,
        sahip: ownerAuth.email,
        baslik: "Yayındaki ilan",
        fiyat: 100,
        trend: false,
        oneCikan: false,
        urunTipi: "fiziksel",
        fizikselKargo: true
      }),
      setDoc(doc(db, "ilanlar", "published-digital"), {
        onay: true,
        sahipUid: ownerAuth.uid,
        sahip: ownerAuth.email,
        baslik: "Yayındaki dijital ilan",
        fiyat: 125,
        urunTipi: "dijital",
        fizikselKargo: false,
        trend: false,
        oneCikan: false
      }),
      setDoc(doc(db, "ilanlar", "pending"), {
        onay: false,
        sahipUid: ownerAuth.uid,
        sahip: ownerAuth.email,
        baslik: "Bekleyen ilan",
        trend: false,
        oneCikan: false
      }),
      setDoc(doc(db, "ilanlar", "admin-target"), {
        onay: false,
        sahipUid: otherAuth.uid,
        sahip: otherAuth.email,
        baslik: "Admin hedefi",
        trend: false,
        oneCikan: false
      }),
      setDoc(doc(db, "sepet", "owner-cart"), {
        kullanici: ownerAuth.email,
        ilanId: "published",
        adet: 1
      }),
      setDoc(doc(db, "sepet", "other-cart"), {
        kullanici: otherAuth.email,
        ilanId: "published",
        adet: 1
      }),
      setDoc(doc(db, "favoriler", "owner-favorite"), {
        kullanici: ownerAuth.email,
        ilanId: "published"
      }),
      setDoc(doc(db, "mesajlar", "message"), {
        gonderen: ownerAuth.email,
        alan: otherAuth.email,
        ilanId: "published",
        mesaj: "Merhaba",
        okundu: false,
        tarih: new Date()
      }),
      setDoc(doc(db, "profiller", ownerAuth.uid), { ad: "Owner" }),
      setDoc(doc(db, "magazalar", "store"), {
        sahipUid: ownerAuth.uid,
        sahip: ownerAuth.email,
        magazaAdi: "Mağaza",
        puan: 5,
        takipci: 0,
        sponsor: false
      }),
      setDoc(doc(db, "siparisler", "owner-order"), {
        ilanId: "published",
        alici: ownerAuth.email,
        satici: otherAuth.email,
        fiyat: 100,
        durum: "Ödeme Bekleniyor",
        odemeDurumu: false
      }),
      setDoc(doc(db, "siparisler", "other-order"), {
        ilanId: "published",
        alici: otherAuth.email,
        satici: "seller@example.com",
        fiyat: 100,
        durum: "Ödeme Bekleniyor",
        odemeDurumu: false
      }),
      setDoc(doc(db, "odemeler", "owner-payment"), {
        kullanici: ownerAuth.email,
        toplamTutar: 100,
        paymentStatus: "SUCCESS"
      }),
      setDoc(doc(db, "odemeler", "other-payment"), {
        kullanici: otherAuth.email,
        toplamTutar: 200,
        paymentStatus: "SUCCESS"
      }),
      setDoc(doc(db, "wallets", ownerAuth.email), {
        email: ownerAuth.email,
        balance: 100
      }),
      setDoc(doc(db, "wallets", otherAuth.email), {
        email: otherAuth.email,
        balance: 200
      }),
      setDoc(doc(db, "bakiyeHareketleri", "owner-movement"), {
        satici: ownerAuth.email,
        netTutar: 90,
        durum: "Bekliyor"
      }),
      setDoc(doc(db, "geriCekmeTalepleri", "owner-withdraw"), {
        email: ownerAuth.email,
        miktar: 50,
        durum: "Bekliyor"
      }),
      setDoc(doc(db, "geriCekmeTalepleri", "other-withdraw"), {
        email: otherAuth.email,
        miktar: 70,
        durum: "Bekliyor"
      }),
      setDoc(doc(db, "digitalAssets", "protected-asset"), {
        listingId: "published",
        sellerUid: ownerAuth.uid,
        status: "ready"
      }),
      setDoc(doc(db, "tasarimOylari", "backend-vote"), {
        listingId: "published",
        voterUid: ownerAuth.uid,
        periodKey: "2026-W36",
        createdAt: new Date()
      }),
      setDoc(doc(db, "giftBattles", "2026-09-02"), {
        dateKey: "2026-09-02",
        leftListingId: "published",
        rightListingId: "other-listing",
        leftVotes: 1,
        rightVotes: 0,
        createdAt: new Date()
      }),
      setDoc(doc(db, "giftBattleVotes", "2026-09-02_owner-uid"), {
        dateKey: "2026-09-02",
        voterUid: ownerAuth.uid,
        selectedListingId: "published",
        createdAt: new Date()
      }),
      setDoc(doc(db, "orderClaims", "owner-claim"), {
        orderId: "owner-order", buyerUid: ownerAuth.uid, sellerUid: otherAuth.uid,
        tip: "itiraz", durum: "acik", payoutBlock: true, createdAt: new Date()
      }),
      setDoc(doc(db, "refundFinalizations", "owner-refund"), {
        claimId: "owner-claim", orderId: "owner-order", status: "PENDING"
      }),
      setDoc(doc(db, "admins", adminAuth.email), { aktif: true })
    ]);
  });
});

after(async () => {
  if (env) await env.cleanup();
});

test("1 - oturumsuz kullanıcı onaylı ilanı okuyabilir", async () => {
  await assertSucceeds(getDoc(doc(dbFor(), "ilanlar", "published")));
});

test("2 - oturumsuz kullanıcı bekleyen ilanı okuyamaz", async () => {
  await assertFails(getDoc(doc(dbFor(), "ilanlar", "pending")));
});

test("3 - ilan sahibi kendi bekleyen ilanını okuyabilir", async () => {
  await assertSucceeds(getDoc(doc(dbFor(ownerAuth), "ilanlar", "pending")));
});

test("4 - başka kullanıcı bekleyen ilanı okuyamaz", async () => {
  await assertFails(getDoc(doc(dbFor(otherAuth), "ilanlar", "pending")));
});

test("5 - ilan sahibi admin alanlarını değiştiremez", async () => {
  const ref = doc(dbFor(ownerAuth), "ilanlar", "pending");
  await assertFails(updateDoc(ref, { onay: true }));
  await assertFails(updateDoc(ref, { trend: true }));
  await assertFails(updateDoc(ref, { oneCikan: true }));
});

test("6 - ilan sahibi izin verilen alanı değiştirebilir", async () => {
  await assertSucceeds(updateDoc(
    doc(dbFor(ownerAuth), "ilanlar", "pending"),
    { baslik: "Güncel başlık" }
  ));
});

test("7 - başka kullanıcı ilanı değiştiremez", async () => {
  await assertFails(updateDoc(
    doc(dbFor(otherAuth), "ilanlar", "pending"),
    { baslik: "Yetkisiz değişiklik" }
  ));
});

test("8 - kullanıcı kendi sepetini okuyup yazabilir", async () => {
  const ref = doc(dbFor(ownerAuth), "sepet", "owner-cart");
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(updateDoc(ref, { adet: 2 }));
});

test("9 - kullanıcı başka kullanıcının sepetini okuyamaz", async () => {
  await assertFails(getDoc(doc(dbFor(ownerAuth), "sepet", "other-cart")));
});

test("10 - kullanıcı yalnız kendi favorisini okuyup yazabilir", async () => {
  const db = dbFor(ownerAuth);
  await assertSucceeds(getDoc(doc(db, "favoriler", "owner-favorite")));
  await assertSucceeds(setDoc(doc(db, "favoriler", "new-favorite"), {
    kullanici: ownerAuth.email,
    ilanId: "published"
  }));
  await assertFails(setDoc(doc(db, "favoriler", "spoof-favorite"), {
    kullanici: otherAuth.email,
    ilanId: "published"
  }));
});

test("11 - mesajı yalnız gönderen veya alan okuyabilir", async () => {
  const refFor = (auth) => doc(dbFor(auth), "mesajlar", "message");
  await assertSucceeds(getDoc(refFor(ownerAuth)));
  await assertSucceeds(getDoc(refFor(otherAuth)));
  await assertFails(getDoc(refFor({ uid: "third", email: "third@example.com" })));
});

test("12 - mesaj gönderen token e-postasıyla aynı olmalıdır", async () => {
  await assertFails(setDoc(doc(dbFor(ownerAuth), "mesajlar", "spoof-message"), {
    gonderen: otherAuth.email,
    alan: ownerAuth.email,
    ilanId: "published",
    mesaj: "Sahte",
    okundu: false,
    tarih: new Date()
  }));
});

test("13 - yalnız mesaj alıcısı okundu alanını değiştirebilir", async () => {
  await assertFails(updateDoc(
    doc(dbFor(ownerAuth), "mesajlar", "message"),
    { okundu: true }
  ));
  await assertSucceeds(updateDoc(
    doc(dbFor(otherAuth), "mesajlar", "message"),
    { okundu: true }
  ));
});

test("14 - kullanıcı başka kullanıcının profilini değiştiremez", async () => {
  await assertFails(updateDoc(
    doc(dbFor(otherAuth), "profiller", ownerAuth.uid),
    { ad: "Yetkisiz" }
  ));
});

test("14b - yeni kullanıcı kendi UID anahtarlı users belgesini oluşturabilir", async () => {
  const ref = doc(dbFor(ownerAuth), "users", ownerAuth.uid);
  await assertSucceeds(setDoc(ref, {
    email: ownerAuth.email,
    createdAt: new Date()
  }));
  await assertSucceeds(getDoc(ref));
});

test("14c - users sahipliği UID ile sınırlıdır ve sahte UID alanı kabul edilmez", async () => {
  await assertFails(setDoc(
    doc(dbFor(ownerAuth), "users", otherAuth.uid),
    { email: ownerAuth.email, createdAt: new Date() }
  ));
  await assertFails(getDoc(doc(dbFor(otherAuth), "users", ownerAuth.uid)));
  await assertFails(setDoc(
    doc(dbFor(ownerAuth), "users", ownerAuth.uid),
    { uid: ownerAuth.uid, email: ownerAuth.email, createdAt: new Date() }
  ));
});

test("15 - mağaza sahibi izin verilen profil alanını değiştirebilir", async () => {
  await assertSucceeds(updateDoc(
    doc(dbFor(ownerAuth), "magazalar", "store"),
    { magazaAdi: "Yeni Mağaza Adı" }
  ));
});

test("16 - mağaza sahibi kritik alanları değiştiremez", async () => {
  const ref = doc(dbFor(ownerAuth), "magazalar", "store");
  await assertFails(updateDoc(ref, { sahipUid: otherAuth.uid }));
  await assertFails(updateDoc(ref, { sahip: otherAuth.email }));
  await assertFails(updateDoc(ref, { puan: 1 }));
  await assertFails(updateDoc(ref, { takipci: 99 }));
  await assertFails(updateDoc(ref, { sponsor: true }));
  await assertFails(updateDoc(ref, { admin: true }));
});

test("17 - ürün yorumu ve puanı yalnız doğrulanmış backend tarafından oluşturulur", async () => {
  const db = dbFor(ownerAuth);
  await assertFails(setDoc(doc(db, "yorumlar", "valid-review"), {
    ilanId: "published",
    kullanici: ownerAuth.email,
    puan: 5,
    yorum: "Geçerli yorum",
    tarih: new Date()
  }));
  await assertFails(setDoc(doc(db, "yorumlar", "invalid-review"), {
    ilanId: "published",
    kullanici: ownerAuth.email,
    puan: 6,
    yorum: "Geçersiz puan",
    tarih: new Date()
  }));
});

test("17b - client puan, seviye ve rozet kayıtlarına erişemez", async () => {
  const db = dbFor(ownerAuth);
  const summaryRef = doc(db, "userLevelSummaries", ownerAuth.uid);
  const eventRef = doc(db, "userPointEvents", `profile_${ownerAuth.uid}`);
  await assertFails(getDoc(summaryRef));
  await assertFails(setDoc(summaryRef, { points: 15000, level: 30 }));
  await assertFails(updateDoc(summaryRef, { points: 15000 }));
  await assertFails(deleteDoc(summaryRef));
  await assertFails(getDoc(eventRef));
  await assertFails(setDoc(eventRef, { points: 15000, active: true }));
});

test("18 - kullanıcı başka kişinin kimliğiyle yorum oluşturamaz", async () => {
  await assertFails(setDoc(doc(dbFor(ownerAuth), "yorumlar", "spoof-review"), {
    ilanId: "published",
    kullanici: otherAuth.email,
    puan: 4,
    yorum: "Sahte kimlik",
    tarih: new Date()
  }));
});

test("19 - client admins koleksiyonuna yazamaz", async () => {
  await assertFails(setDoc(
    doc(dbFor(adminAuth), "admins", "new-admin@example.com"),
    { aktif: true }
  ));
});

test("20 - admin ilan yönetimi yapabilir", async () => {
  const ref = doc(dbFor(adminAuth), "ilanlar", "admin-target");
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(updateDoc(ref, {
    onay: true,
    trend: true,
    oneCikan: true
  }));
  await assertSucceeds(deleteDoc(ref));
});

test("21 - kullanıcı kendi siparişini okuyabilir, başkasının siparişini okuyamaz", async () => {
  await assertSucceeds(getDoc(doc(dbFor(ownerAuth), "siparisler", "owner-order")));
  await assertFails(getDoc(doc(dbFor(ownerAuth), "siparisler", "other-order")));
});

test("21a - satıcı sipariş durumunu Firestore'dan doğrudan değiştiremez", async () => {
  await assertFails(updateDoc(doc(dbFor(otherAuth), "siparisler", "owner-order"), {
    durum: "Hazırlanıyor"
  }));
});

test("21b - satıcı ödeme alanlarını Firestore'dan doğrudan değiştiremez", async () => {
  await assertFails(updateDoc(doc(dbFor(otherAuth), "siparisler", "owner-order"), {
    odemeDurumu: true,
    paymentId: "fake"
  }));
});

test("21c - yetkisiz kullanıcı siparişi değiştiremez", async () => {
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "siparisler", "other-order"), {
    durum: "Hazırlanıyor"
  }));
});

test("21d - admin sipariş durumunu güncelleyebilir", async () => {
  await assertSucceeds(updateDoc(doc(dbFor(adminAuth), "siparisler", "owner-order"), {
    durum: "Hazırlanıyor"
  }));
});

test("21e - alıcı Firestore'dan doğrudan Teslim Edildi yapamaz", async () => {
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "siparisler", "owner-order"), { durum: "Teslim Edildi" }));
});

test("21f - satıcı Firestore'dan doğrudan Teslim Edildi yapamaz", async () => {
  await assertFails(updateDoc(doc(dbFor(otherAuth), "siparisler", "owner-order"), { durum: "Teslim Edildi" }));
});

test("21g - alıcı teslimat doğrulama timestamp alanlarını yazamaz", async () => {
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "siparisler", "owner-order"), {
    teslimatDogrulandi: true,
    teslimatDogrulamaTarihi: new Date()
  }));
});

test("21h - satıcı hakediş bloke bitişini değiştiremez", async () => {
  await assertFails(updateDoc(doc(dbFor(otherAuth), "siparisler", "owner-order"), {
    hakEdisBlokeBitis: new Date()
  }));
});

test("22 - kullanıcı kendi ödeme kaydını okuyabilir ve başkasınınkini okuyamaz", async () => {
  await assertSucceeds(getDoc(doc(dbFor(ownerAuth), "odemeler", "owner-payment")));
  await assertFails(getDoc(doc(dbFor(ownerAuth), "odemeler", "other-payment")));
});

test("23 - client ödeme kaydı oluşturamaz, değiştiremez veya silemez", async () => {
  const db = dbFor(ownerAuth);
  await assertFails(setDoc(doc(db, "odemeler", "client-payment"), {
    kullanici: ownerAuth.email,
    toplamTutar: 1,
    paymentStatus: "SUCCESS"
  }));
  await assertFails(updateDoc(doc(db, "odemeler", "owner-payment"), {
    toplamTutar: 1
  }));
  await assertFails(deleteDoc(doc(db, "odemeler", "owner-payment")));
});

test("24 - kullanıcı kendi wallet kaydını okuyabilir, başka wallet okuyamaz", async () => {
  await assertSucceeds(getDoc(doc(dbFor(ownerAuth), "wallets", ownerAuth.email)));
  await assertFails(getDoc(doc(dbFor(ownerAuth), "wallets", otherAuth.email)));
});

test("25 - client wallet ve bakiye değerlerini değiştiremez", async () => {
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "wallets", ownerAuth.email), {
    balance: 999999
  }));
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "bakiyeHareketleri", "owner-movement"), {
    netTutar: 999999
  }));
});

test("26 - kullanıcı kendi çekim talebini okuyabilir, başkasınınkini okuyamaz", async () => {
  await assertSucceeds(getDoc(doc(dbFor(ownerAuth), "geriCekmeTalepleri", "owner-withdraw")));
  await assertFails(getDoc(doc(dbFor(ownerAuth), "geriCekmeTalepleri", "other-withdraw")));
});

test("27 - çekim talebi client tarafından oluşturulamaz veya admin durumuna geçirilemez", async () => {
  const db = dbFor(ownerAuth);
  await assertFails(setDoc(doc(db, "geriCekmeTalepleri", "client-withdraw"), {
    email: ownerAuth.email,
    miktar: 10,
    durum: "Bekliyor"
  }));
  await assertFails(updateDoc(doc(db, "geriCekmeTalepleri", "owner-withdraw"), {
    durum: "Ödendi"
  }));
});

test("28 - admin finansal kayıtları okuyabilir ancak client tarafından değiştiremez", async () => {
  const db = dbFor(adminAuth);
  await assertSucceeds(getDoc(doc(db, "siparisler", "other-order")));
  await assertSucceeds(getDoc(doc(db, "odemeler", "other-payment")));
  await assertSucceeds(getDoc(doc(db, "wallets", otherAuth.email)));
  await assertFails(updateDoc(doc(db, "geriCekmeTalepleri", "other-withdraw"), {
    durum: "Ödendi"
  }));
  await assertFails(updateDoc(doc(db, "bakiyeHareketleri", "owner-movement"), {
    durum: "Ödendi"
  }));
});

test("29 - digitalAssets client ve admin erişimine tamamen kapalıdır", async () => {
  await assertFails(getDoc(doc(dbFor(ownerAuth), "digitalAssets", "protected-asset")));
  await assertFails(getDoc(doc(dbFor(adminAuth), "digitalAssets", "protected-asset")));
  await assertFails(setDoc(doc(dbFor(ownerAuth), "digitalAssets", "client-asset"), {
    listingId: "published"
  }));
});

test("30 - alıcı yalnız onaylı ilanın gerçek fiyatı ve satıcısıyla sipariş oluşturabilir", async () => {
  const db = dbFor(otherAuth);
  const validOrder = {
    ilanId: "published",
    ilanBaslik: "Yayındaki ilan",
    saticiUid: ownerAuth.uid,
    alici: otherAuth.email,
    fiyat: 100,
    adet: 1,
    toplam: 100,
    durum: "Ödeme Bekleniyor",
    odemeDurumu: false,
    urunTipi: "fiziksel",
    fizikselKargo: true,
    tarih: new Date()
  };

  await assertSucceeds(setDoc(doc(db, "siparisler", "valid-order"), validOrder));
  await assertFails(setDoc(doc(db, "siparisler", "manipulated-order"), {
    ...validOrder,
    fiyat: 1,
    toplam: 1
  }));
});

test("30a - güncel Checkout fiziksel ve dijital sipariş türlerini güvenli oluşturur", async () => {
  const db = dbFor(otherAuth);
  const physical = {
    ilanId: "published", ilanBaslik: "Yayındaki ilan",
    saticiUid: ownerAuth.uid, alici: otherAuth.email,
    fiyat: 100, adet: 1, toplam: 100,
    adSoyad: "Test Alıcı", telefon: "05000000000", adres: "Test adresi",
    il: "Sakarya", ilce: "Adapazarı", kargo: "Standart Kargo", siparisNotu: "",
    durum: "Ödeme Bekleniyor", odemeDurumu: false,
    urunTipi: "fiziksel", fizikselKargo: true, tarih: new Date()
  };
  const digital = {
    ...physical,
    ilanId: "published-digital", ilanBaslik: "Yayındaki dijital ilan",
    fiyat: 125, toplam: 125, adres: "", il: "", ilce: "",
    kargo: "Dijital Teslimat", urunTipi: "dijital", fizikselKargo: false
  };

  await assertSucceeds(setDoc(doc(db, "siparisler", "checkout-physical"), physical));
  await assertSucceeds(setDoc(doc(db, "siparisler", "checkout-digital"), digital));
  await assertFails(setDoc(doc(db, "siparisler", "fake-product-type"), {
    ...physical, urunTipi: "dijital"
  }));
  await assertFails(setDoc(doc(db, "siparisler", "fake-shipping-type"), {
    ...digital, fizikselKargo: true
  }));
});

test("31 - dijital ilan güvenli başlangıç alanlarıyla oluşturulabilir", async () => {
  await assertSucceeds(setDoc(doc(dbFor(ownerAuth), "ilanlar", "digital-listing"), {
    ilanNo: "digital-1",
    baslik: "Dijital poster",
    fiyat: 100,
    eskiFiyat: 0,
    kategori: "A4 Tasarım",
    altKategori: "Poster",
    tip: "Satılık",
    sehir: "Sakarya",
    adet: 1,
    stok: 1,
    marka: "",
    renk: "",
    aciklama: "Özgün dijital poster",
    resim: "https://example.com/preview.jpg",
    resimler: ["https://example.com/preview.jpg"],
    video: "",
    ozelGunler: [],
    sahipUid: ownerAuth.uid,
    magazaId: "store",
    magazaAdi: "Mağaza",
    paraBirimi: "TRY",
    puan: 5,
    yorumSayisi: 0,
    favoriSayisi: 0,
    satisSayisi: 0,
    goruntulenme: 0,
    onay: false,
    oneCikan: false,
    trend: false,
    kampanyali: false,
    indirim: 0,
    ucretsizKargo: false,
    ayniGunKargo: false,
    guvenliOdeme: true,
    kargoUcreti: 0,
    teslimatSuresi: "1-3 Gün",
    aktif: true,
    tarih: new Date(),
    urunTipi: "dijital",
    dosyaFormatlari: ["PDF"],
    dijitalTeslimat: true,
    fizikselKargo: false,
    hakOnayi: true,
    hakOnayiTarihi: new Date(),
    hakOnayiSurumu: "digital-rights-v1",
    dijitalDosyaDurumu: "bekleniyor"
  }));
});

test("32 - legacy client toplamlarıyla sipariş oluşturma kapalıdır", async () => {
  await assertFails(setDoc(doc(dbFor(ownerAuth), "siparisler", "legacy-order"), {
    siparisNo: "legacy-1",
    kullanici: ownerAuth.email,
    urunler: [{ fiyat: 1 }],
    toplam: 1,
    kargo: 0,
    genelToplam: 1,
    adres: {},
    odemeTipi: "kart",
    durum: "Ödeme Bekleniyor",
    odemeDurumu: false,
    tarih: new Date()
  }));
});

test("33 - sponsor başvurusu ve onay alanları yalnız backend tarafından yazılır", async () => {
  const validApplication = {
    magazaAdi: "Mağaza",
    yetkiliAdi: "Yetkili",
    telefon: "05000000000",
    email: ownerAuth.email,
    webSitesi: "",
    hakkinda: "Yeterince uzun mağaza açıklaması",
    kullaniciId: ownerAuth.uid,
    paketId: "standart",
    paketAdi: "Standart Sponsor",
    paketFiyati: 499,
    sponsorSuresi: 7,
    durum: "Ödeme Bekliyor",
    odemeDurumu: false,
    odemeTarihi: null,
    basvuruTarihi: new Date(),
    okunmadi: true
  };

  await assertFails(setDoc(
    doc(dbFor(ownerAuth), "sponsorBasvurular", "valid-application"),
    validApplication
  ));
  await assertFails(setDoc(
    doc(dbFor(ownerAuth), "sponsorBasvurular", "spoofed-email-application"),
    { ...validApplication, email: otherAuth.email }
  ));
});

test("33b - client sponsor state ve sponsoredContent yazamaz", async () => {
  await assertFails(setDoc(doc(dbFor(ownerAuth), "sponsorBasvurular", "forged"), {
    ownerUid: ownerAuth.uid, storeId: "store", status: "APPROVED_PAYMENT_PENDING",
    selectedTier: "diamond", sponsorActive: true, paymentStatus: "PAID"
  }));
  await assertFails(setDoc(doc(dbFor(ownerAuth), "sponsoredContent", "free-sponsor"), {
    placement: "sponsored_store", storeId: "store", tier: "diamond", active: true
  }));
  await assertFails(setDoc(doc(dbFor(ownerAuth), "sponsorStoreGuards", "store"), { status: "ACTIVE" }));
});

test("34 - client tasarimOylari belgesi oluşturamaz", async () => {
  await assertFails(setDoc(doc(dbFor(ownerAuth), "tasarimOylari", "client-vote"), {
    listingId: "published",
    voterUid: ownerAuth.uid,
    periodKey: "2026-W36",
    createdAt: new Date()
  }));
});

test("35 - client tasarimOylari belgesini okuyamaz", async () => {
  await assertFails(getDoc(doc(dbFor(ownerAuth), "tasarimOylari", "backend-vote")));
});

test("36 - client tasarimOylari belgesini güncelleyemez", async () => {
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "tasarimOylari", "backend-vote"), {
    listingId: "other-listing"
  }));
});

test("37 - client tasarimOylari belgesini silemez", async () => {
  await assertFails(deleteDoc(doc(dbFor(ownerAuth), "tasarimOylari", "backend-vote")));
});

test("38 - client giftBattles belgesini okuyamaz veya yazamaz", async () => {
  await assertFails(getDoc(doc(dbFor(), "giftBattles", "2026-09-02")));
  await assertFails(setDoc(doc(dbFor(ownerAuth), "giftBattles", "client-battle"), {
    dateKey: "2026-09-02",
    leftListingId: "published",
    rightListingId: "other-listing"
  }));
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "giftBattles", "2026-09-02"), { leftVotes: 999 }));
  await assertFails(deleteDoc(doc(dbFor(ownerAuth), "giftBattles", "2026-09-02")));
});

test("39 - client giftBattleVotes belgesi oluşturamaz", async () => {
  await assertFails(setDoc(doc(dbFor(ownerAuth), "giftBattleVotes", "2026-09-02_client"), {
    dateKey: "2026-09-02",
    voterUid: ownerAuth.uid,
    selectedListingId: "published",
    createdAt: new Date()
  }));
});

test("40 - client giftBattleVotes belgesini okuyamaz, değiştiremez veya silemez", async () => {
  const ref = doc(dbFor(ownerAuth), "giftBattleVotes", "2026-09-02_owner-uid");
  await assertFails(getDoc(ref));
  await assertFails(updateDoc(ref, { selectedListingId: "other-listing" }));
  await assertFails(deleteDoc(ref));
});

test("45 - buyer orderClaims belgesini doğrudan oluşturamaz", async () => {
  await assertFails(setDoc(doc(dbFor(ownerAuth), "orderClaims", "client-claim"), { orderId: "owner-order", buyerUid: ownerAuth.uid, sellerUid: otherAuth.uid, durum: "acik" }));
});
test("46 - buyer kendi claim kaydını, seller ilgili kaydı ve admin kaydı okuyabilir", async () => {
  await assertSucceeds(getDoc(doc(dbFor(ownerAuth), "orderClaims", "owner-claim")));
  await assertSucceeds(getDoc(doc(dbFor(otherAuth), "orderClaims", "owner-claim")));
  await assertSucceeds(getDoc(doc(dbFor(adminAuth), "orderClaims", "owner-claim")));
});
test("47 - yetkisiz kullanıcı claim okuyamaz", async () => {
  await assertFails(getDoc(doc(dbFor({ uid: "stranger", email: "stranger@example.com" }), "orderClaims", "owner-claim")));
});
test("48 - buyer ve seller claim durumunu değiştiremez", async () => {
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "orderClaims", "owner-claim"), { durum: "iptal_edildi" }));
  await assertFails(updateDoc(doc(dbFor(otherAuth), "orderClaims", "owner-claim"), { durum: "reddedildi" }));
});
test("49 - client orderClaimGuards erişimi tamamen kapalıdır", async () => {
  await assertFails(setDoc(doc(dbFor(ownerAuth), "orderClaimGuards", "owner-order"), { claimId: "x" }));
  await assertFails(getDoc(doc(dbFor(ownerAuth), "orderClaimGuards", "owner-order")));
});
test("50 - buyer ve seller sipariş payout blokesini doğrudan değiştiremez", async () => {
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "siparisler", "owner-order"), { hakEdisBlokeli: true }));
  await assertFails(updateDoc(doc(dbFor(otherAuth), "siparisler", "owner-order"), { hakEdisBlokeli: false }));
});

test("51 - buyer orderClaims geri kargo alanlarını doğrudan değiştiremez", async () => {
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "orderClaims", "owner-claim"), {
    returnFlowStatus: "kargoya_verildi", returnCarrier: "Aras", returnTrackingNumber: "ABC123"
  }));
});

test("52 - seller orderClaims geri teslim alanlarını doğrudan değiştiremez", async () => {
  await assertFails(updateDoc(doc(dbFor(otherAuth), "orderClaims", "owner-claim"), {
    returnFlowStatus: "teslim_dogrulandi", sellerReturnReceivedReported: true
  }));
});

test("53 - client refundFinalizations erişimi tamamen kapalıdır", async () => {
  const ref = doc(dbFor(adminAuth), "refundFinalizations", "owner-refund");
  await assertFails(getDoc(ref));
  await assertFails(updateDoc(ref, { status: "PROVIDER_SUCCESS" }));
  await assertFails(deleteDoc(ref));
  await assertFails(setDoc(doc(dbFor(ownerAuth), "refundFinalizations", "client-refund"), { status: "PENDING" }));
});

test("54 - buyer ve seller claim refund alanlarını doğrudan değiştiremez", async () => {
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "orderClaims", "owner-claim"), { refundProviderStatus: "success" }));
  await assertFails(updateDoc(doc(dbFor(otherAuth), "orderClaims", "owner-claim"), { refundAmount: 100 }));
});

test("55 - buyer ve seller sipariş refund alanlarını doğrudan değiştiremez", async () => {
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "siparisler", "owner-order"), { refundProviderStatus: "success" }));
  await assertFails(updateDoc(doc(dbFor(otherAuth), "siparisler", "owner-order"), { refundClaimId: "owner-claim" }));
});

test("56 - normal kullanıcı ve admin client financialReconciliations erişimi yapamaz", async () => {
  const ownerRef = doc(dbFor(ownerAuth), "financialReconciliations", "review-1");
  const adminRef = doc(dbFor(adminAuth), "financialReconciliations", "review-1");
  await assertFails(getDoc(ownerRef));
  await assertFails(getDoc(adminRef));
  await assertFails(setDoc(ownerRef, { status: "incelemede" }));
  await assertFails(updateDoc(adminRef, { status: "manuel_cozuldu" }));
  await assertFails(deleteDoc(adminRef));
});

test("57 - financial reconciliation audit kayıtlarına client erişimi kapalıdır", async () => {
  const ref = doc(dbFor(adminAuth), "financialReconciliationAudits", "audit-1");
  await assertFails(getDoc(ref));
  await assertFails(setDoc(ref, { reconciliationId: "review-1" }));
  await assertFails(updateDoc(ref, { newNote: "değiştir" }));
  await assertFails(deleteDoc(ref));
});

test("58 - withdrawal finalization audit kaydı client ve admin client erişimine kapalıdır", async () => {
  const ownerRef = doc(dbFor(ownerAuth), "withdrawalFinalizations", "withdrawal-1");
  const adminRef = doc(dbFor(adminAuth), "withdrawalFinalizations", "withdrawal-1");
  await assertFails(getDoc(ownerRef));
  await assertFails(getDoc(adminRef));
  await assertFails(setDoc(ownerRef, { status: "MANUEL_ODEME_DOGRULANDI" }));
  await assertFails(updateDoc(adminRef, { amount: 1 }));
  await assertFails(deleteDoc(adminRef));
});

test("58b - withdrawal request yarış kilidi client ve admin client erişimine kapalıdır", async () => {
  const ownerRef = doc(dbFor(ownerAuth), "withdrawalRequestGuards", ownerAuth.uid);
  const adminRef = doc(dbFor(adminAuth), "withdrawalRequestGuards", ownerAuth.uid);
  await assertFails(getDoc(ownerRef));
  await assertFails(getDoc(adminRef));
  await assertFails(setDoc(ownerRef, { active: false }));
  await assertFails(updateDoc(adminRef, { active: false }));
  await assertFails(deleteDoc(adminRef));
});

test("59 - buyer identity kayıtları client ve admin client erişimine tamamen kapalıdır", async () => {
  const ownerRef = doc(dbFor(ownerAuth), "buyerIdentities", ownerAuth.uid);
  const adminRef = doc(dbFor(adminAuth), "buyerIdentities", ownerAuth.uid);
  await assertFails(getDoc(ownerRef));
  await assertFails(getDoc(adminRef));
  await assertFails(setDoc(ownerRef, { identityNumber: "10000000146" }));
  await assertFails(updateDoc(adminRef, { last4: "0146" }));
  await assertFails(deleteDoc(adminRef));
});

test("60 - seller marketplace ödeme profilleri tüm client erişimine kapalıdır", async () => {
  const ownerRef = doc(dbFor(ownerAuth), "sellerPaymentProfiles", ownerAuth.uid);
  const adminRef = doc(dbFor(adminAuth), "sellerPaymentProfiles", ownerAuth.uid);
  await assertFails(getDoc(ownerRef));
  await assertFails(getDoc(adminRef));
  await assertFails(setDoc(ownerRef, { active: true, subMerchantKey: "client-key" }));
  await assertFails(updateDoc(adminRef, { active: false }));
  await assertFails(deleteDoc(adminRef));
});

test("66 - yeni public ilan telefon alanı içeremez", async () => {
  await assertFails(setDoc(doc(dbFor(ownerAuth), "ilanlar", "phone-listing"), {
    ilanNo: 999, baslik: "Telefonlu ilan", fiyat: 100, kategori: "Hediye",
    altKategori: "", tip: "Satılık", sehir: "Sakarya", telefon: "05000000000",
    adet: 1, stok: 1, marka: "", renk: "", aciklama: "Açıklama",
    resim: "", resimler: [], video: "", ozelGunler: [], sahipUid: ownerAuth.uid,
    sahip: ownerAuth.email, magazaId: "store", magazaAdi: "Mağaza", paraBirimi: "TRY",
    puan: 5, yorumSayisi: 0, favoriSayisi: 0, satisSayisi: 0, goruntulenme: 0,
    onay: false, oneCikan: false, trend: false, kampanyali: false, indirim: 0,
    ucretsizKargo: true, ayniGunKargo: false, guvenliOdeme: true, kargoUcreti: 0,
    teslimatSuresi: "", aktif: true, tarih: new Date()
  }));
});

test("67 - yeni public mağaza telefon alanı içeremez", async () => {
  await assertFails(setDoc(doc(dbFor(ownerAuth), "magazalar", "phone-store"), {
    sahipUid: ownerAuth.uid, magazaAdi: "Telefonlu mağaza",
    telefon: "05000000000", sehir: "Sakarya", aciklama: "Açıklama",
    logo: "", kapak: "", puan: 5, takipci: 0, tarih: new Date()
  }));
});

test("68 - yeni mağaza yorumu ve puanı e-posta snapshot kabul etmez", async () => {
  const db = dbFor(ownerAuth);
  await assertFails(setDoc(doc(db, "magazaYorumlari", "email-review"), {
    magazaId: "store", kullaniciUid: ownerAuth.uid, kullanici: ownerAuth.email,
    yorum: "Yorum", tarih: new Date()
  }));
  await assertFails(setDoc(doc(db, "magazaPuanlari", "email-rating"), {
    magazaId: "store", kullaniciUid: ownerAuth.uid, kullanici: ownerAuth.email,
    puan: 5, tarih: new Date()
  }));
});

test("69 - başka kullanıcı private finans kayıtlarını okuyamaz", async () => {
  const strangerDb = dbFor({ uid: "stranger", email: "stranger@example.com" });
  await assertFails(getDoc(doc(strangerDb, "wallets", ownerAuth.email)));
  await assertFails(getDoc(doc(strangerDb, "bakiyeHareketleri", "owner-movement")));
  await assertFails(getDoc(doc(strangerDb, "paraCekmeTalepleri", "owner-withdrawal")));
});

test("70 - UID tabanlı yeni public ilan ve mağaza e-posta içermez", async () => {
  const ownerDb = dbFor(ownerAuth);
  await assertSucceeds(setDoc(doc(ownerDb, "magazalar", "uid-store"), {
    sahipUid: ownerAuth.uid, magazaAdi: "UID Mağaza", sehir: "Sakarya",
    aciklama: "Güvenli mağaza açıklaması", logo: "", kapak: "",
    puan: 5, takipci: 0, tarih: new Date()
  }));
  const storeSnap = await assertSucceeds(getDoc(doc(dbFor(), "magazalar", "uid-store")));
  assert.equal(storeSnap.data().sahip, undefined);
  assert.equal(storeSnap.data().telefon, undefined);
  const listingSnap = await assertSucceeds(getDoc(doc(dbFor(), "ilanlar", "published-digital")));
  assert.equal(listingSnap.data().telefon, undefined);
});

test("71 - public açıklamalardaki iletişim bilgileri reddedilir", async () => {
  const ref = doc(dbFor(ownerAuth), "magazalar", "blocked-contact-store");
  await assertFails(setDoc(ref, {
    sahipUid: ownerAuth.uid, magazaAdi: "Mağaza", sehir: "Sakarya",
    aciklama: "WhatsApp 0532 111 22 33", logo: "", kapak: "",
    puan: 5, takipci: 0, tarih: new Date()
  }));
});

test("72 - yalnız aktif sponsorlu içerik public okunabilir", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "sponsoredContent", "active-ad"), {
      active: true, placement: "middle_banner", title: "Sponsor"
    });
    await setDoc(doc(db, "sponsoredContent", "inactive-ad"), {
      active: false, placement: "lower_banner", title: "Kapalı"
    });
  });

  await assertSucceeds(getDoc(doc(dbFor(), "sponsoredContent", "active-ad")));
  await assertFails(getDoc(doc(dbFor(), "sponsoredContent", "inactive-ad")));
});

test("73 - client sponsorlu içerik yazamaz", async () => {
  await assertFails(setDoc(doc(dbFor(adminAuth), "sponsoredContent", "client-ad"), {
    active: true, placement: "middle_banner", title: "Client"
  }));
  await assertFails(updateDoc(doc(dbFor(adminAuth), "sponsoredContent", "active-ad"), {
    title: "Değiştirildi"
  }));
});

test("74 - ilan sahibi impressionCount alanını doğrudan değiştiremez", async () => {
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "ilanlar", "published"), {
    impressionCount: 999999
  }));
});

test("75 - ilan sahibi veya admin client ücretli boost alanlarını yazamaz", async () => {
  await assertFails(updateDoc(doc(dbFor(ownerAuth), "ilanlar", "published"), { boostActive: true }));
  await assertFails(updateDoc(doc(dbFor(adminAuth), "ilanlar", "published"), { boostActive: true }));
});

test("76 - listing promotion kayıtları bütün client erişimine kapalıdır", async () => {
  await assertFails(setDoc(doc(dbFor(ownerAuth), "listingPromotions", "fake"), {
    listingId: "published", ownerUid: ownerAuth.uid, status: "ACTIVE"
  }));
  await assertFails(getDoc(doc(dbFor(adminAuth), "listingPromotions", "fake")));
});
