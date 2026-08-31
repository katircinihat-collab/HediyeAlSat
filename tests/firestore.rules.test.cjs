const fs = require("node:fs");
const path = require("node:path");
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

test("17 - yorum puanı yalnız 1 ile 5 arasında olabilir", async () => {
  const db = dbFor(ownerAuth);
  await assertSucceeds(setDoc(doc(db, "yorumlar", "valid-review"), {
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
