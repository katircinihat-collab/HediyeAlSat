const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  DAY_MS,
  getListingBoostPackage,
  prepareListingBoost,
  buildListingBoostPeriod,
  buildListingBoostPaymentData,
  isListingBoostActive
} = require("../backend/services/listingBoostService");
const { finalizePayment } = require("../backend/services/paymentCallbackService");

const owner = { uid: "owner-1", email: "owner@example.com" };
const liveListing = { sahipUid: owner.uid, onay: true, aktif: true, yayinda: true, durum: "Yayında", stok: 2 };

function lookupFirestore(listing = liveListing) {
  return { collection: () => ({ doc: (id) => ({ get: async () => ({ id, exists: Boolean(listing), data: () => listing }) }) }) };
}

test("3/7/30 günlük paket fiyatları backend configinden gelir", () => {
  assert.deepEqual(["boost_3", "boost_7", "boost_30"].map((id) => {
    const item = getListingBoostPackage(id); return [item.days, item.price];
  }), [[3, 29], [7, 49], [30, 99]]);
});

test("boost iyzico requesti platform LISTING hizmetidir ve subMerchant alanı taşımaz", () => {
  const built = buildListingBoostPaymentData({ id: "listing-1" }, getListingBoostPackage("boost_3"));
  assert.equal(built.price, 29);
  assert.equal(built.paymentGroup, "LISTING");
  assert.equal(built.basketItems[0].price, "29.00");
  assert.equal(built.basketItems[0].itemType, "VIRTUAL");
  assert.equal("subMerchantKey" in built.basketItems[0], false);
  assert.equal("subMerchantPrice" in built.basketItems[0], false);
});

test("geçersiz paket ve başkasının ilanı reddedilir", async () => {
  await assert.rejects(prepareListingBoost({ firestore: lookupFirestore(), listingId: "l1", packageId: "fake", user: owner }), (error) => error.code === "LISTING_BOOST_PACKAGE_INVALID");
  await assert.rejects(prepareListingBoost({ firestore: lookupFirestore(), listingId: "l1", packageId: "boost_3", user: { uid: "other" } }), (error) => error.code === "LISTING_BOOST_FORBIDDEN");
});

test("pasif fiziksel ilan reddedilir, stok sıfır dijital ilan kabul edilir", async () => {
  await assert.rejects(prepareListingBoost({ firestore: lookupFirestore({ ...liveListing, aktif: false }), listingId: "l1", packageId: "boost_3", user: owner }), (error) => error.code === "LISTING_BOOST_NOT_ELIGIBLE");
  const result = await prepareListingBoost({ firestore: lookupFirestore({ ...liveListing, stok: 0, urunTipi: "dijital", fizikselKargo: false }), listingId: "l1", packageId: "boost_3", user: owner });
  assert.equal(result.package.price, 29);
});

test("paket süreleri server zamanından tam gün hesabıyla oluşturulur", () => {
  const now = new Date("2026-09-11T10:00:00.000Z");
  for (const id of ["boost_3", "boost_7", "boost_30"]) {
    const selected = getListingBoostPackage(id);
    const period = buildListingBoostPeriod({}, selected, now);
    assert.equal(period.endAt.getTime() - now.getTime(), selected.days * DAY_MS);
  }
});

test("aktif boost yeniden satın alındığında kalan süre korunarak uzatılır", () => {
  const now = new Date("2026-09-11T10:00:00.000Z");
  const currentEnd = new Date(now.getTime() + 2 * DAY_MS);
  const period = buildListingBoostPeriod({ boostEndAt: currentEnd }, getListingBoostPackage("boost_3"), now);
  assert.equal(period.benefitStartAt.getTime(), currentEnd.getTime());
  assert.equal(period.endAt.getTime(), currentEnd.getTime() + 3 * DAY_MS);
});

function memoryFirestore(seed) {
  const data = new Map(Object.entries(seed));
  const ref = (pathValue) => ({ path: pathValue });
  let chain = Promise.resolve();
  return {
    data,
    collection(name) { return { doc(id) { return ref(`${name}/${id}`); } }; },
    runTransaction(handler) {
      const run = chain.then(async () => {
        const writes = [];
        const transaction = {
          async get(reference) { const value = data.get(reference.path); return { id: reference.path.split("/").pop(), exists: value !== undefined, data: () => value }; },
          set(reference, value, options) { writes.push({ type: "set", reference, value, options }); },
          update(reference, value) { writes.push({ type: "update", reference, value }); }
        };
        const response = await handler(transaction);
        writes.forEach(({ type, reference, value, options }) => {
          const current = data.get(reference.path) || {};
          data.set(reference.path, type === "update" || options?.merge ? { ...current, ...value } : value);
        });
        return response;
      });
      chain = run.catch(() => undefined);
      return run;
    }
  };
}

function boostSeed() {
  return {
    "odemeler/conv-boost": { id: "conv-boost", paymentStatus: "WAITING", listingBoost: true, listingId: "listing-1", listingOwnerUid: owner.uid, kullanici: owner.email, boostPackageId: "boost_3", boostDays: 3, boostPrice: 29, toplamTutar: 29 },
    "ilanlar/listing-1": { ...liveListing, fiyat: 500, stok: 2 }
  };
}

test("başarılı boost callback tek kayıt üretir; wallet, stok ve komisyon akışına girmez", async () => {
  const database = memoryFirestore(boostSeed());
  const now = new Date("2026-09-11T10:00:00.000Z");
  await finalizePayment({ firestore: database, FieldValue: { serverTimestamp: () => "server-time" }, conversationId: "conv-boost", paymentId: "boost-pay-1", now: () => now });
  const listing = database.data.get("ilanlar/listing-1");
  assert.equal(listing.boostActive, true);
  assert.equal(listing.boostEndAt.getTime(), now.getTime() + 3 * DAY_MS);
  assert.equal(listing.stok, 2);
  assert.equal(database.data.get("listingPromotions/boost-pay-1").amount, 29);
  assert.equal(database.data.get("platformRevenueEvents/listing_boost_boost-pay-1").amount, 29);
  assert.equal([...database.data.keys()].some((key) => key.startsWith("wallets/") || key.startsWith("bakiyeHareketleri/") || key.startsWith("siparisler/")), false);
});

test("aynı ve concurrent callback yalnız tek aktivasyon bırakır", async () => {
  const database = memoryFirestore(boostSeed());
  const now = new Date("2026-09-11T10:00:00.000Z");
  await Promise.all([
    finalizePayment({ firestore: database, FieldValue: { serverTimestamp: () => "server-time" }, conversationId: "conv-boost", paymentId: "boost-pay-1", now: () => now }),
    finalizePayment({ firestore: database, FieldValue: { serverTimestamp: () => "server-time" }, conversationId: "conv-boost", paymentId: "boost-pay-1", now: () => now })
  ]);
  assert.equal([...database.data.keys()].filter((key) => key.startsWith("listingPromotions/")).length, 1);
  assert.equal(database.data.get("ilanlar/listing-1").boostEndAt.getTime(), now.getTime() + 3 * DAY_MS);
});

test("client fiyatı endpointten payment service'e taşınmaz ve protected alanlar rules ile kapalıdır", () => {
  const controller = fs.readFileSync(path.join(__dirname, "..", "backend", "controllers", "listingBoostController.js"), "utf8");
  const rules = fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8");
  assert.doesNotMatch(controller, /req\.body\?\.(price|days|duration|sellerUid)/);
  assert.match(rules, /"boostActive", "boostStartAt", "boostEndAt"/);
  assert.match(rules, /match \/listingPromotions\/\{promotionId\}/);
});

test("süresi dolmuş boost aktif sayılmaz", () => {
  assert.equal(isListingBoostActive({ boostActive: true, boostEndAt: new Date(Date.now() - 1) }), false);
  assert.equal(isListingBoostActive({ boostActive: true, boostEndAt: new Date(Date.now() + 1000) }), true);
});
