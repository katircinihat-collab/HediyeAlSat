const test = require("node:test");
const assert = require("node:assert/strict");
const { validateRetrievedPayment, finalizePayment, calculateOrderEarnings } = require("../backend/services/paymentCallbackService");

function result(overrides = {}) {
    return { paymentStatus: "SUCCESS", conversationId: "conv-1", paymentId: "pay-1", currency: "USD", paidPrice: "100.00", price: "100.00", ...overrides };
}
function payment(overrides = {}) {
    return { id: "conv-1", paymentStatus: "WAITING", expectedPaidPrice: 100, currency: "TRY", siparisIds: ["order-1"], ...overrides };
}

test("SUCCESS ve doğru tutar doğrulanır", () => assert.equal(validateRetrievedPayment(result({ currency: "TRY" }), payment()).expectedKurus, 10000));
test("düşük paidPrice reddedilir", () => assert.throws(() => validateRetrievedPayment(result({ currency: "TRY", paidPrice: 99 }), payment()), /eşleşmiyor/));
test("yüksek paidPrice reddedilir", () => assert.throws(() => validateRetrievedPayment(result({ currency: "TRY", paidPrice: 101 }), payment()), /eşleşmiyor/));
test("currency uyuşmazlığı reddedilir", () => assert.throws(() => validateRetrievedPayment(result(), payment()), /Para birimi/));
test("paymentId yoksa reddedilir", () => assert.throws(() => validateRetrievedPayment(result({ currency: "TRY", paymentId: "" }), payment()), /kimliği/));
test("ödeme kaydı yoksa reddedilir", () => assert.throws(() => validateRetrievedPayment(result({ currency: "TRY" }), null), /bulunamadı/));
test("conversationId uyuşmazlığı reddedilir", () => assert.throws(() => validateRetrievedPayment(result({ currency: "TRY", conversationId: "fake" }), payment()), /eşleşmiyor/));
test("başarısız iyzico sonucu finalize için reddedilir", () => assert.throws(() => validateRetrievedPayment(result({ currency: "TRY", paymentStatus: "FAILURE" }), payment()), /başarılı değil/));

test("300 TL x 2 için ürün, komisyon ve net hakediş doğru hesaplanır", () => {
    assert.deepEqual(calculateOrderEarnings({ fiyat: 300, adet: 2 }), {
        toplamTutar: 600, komisyon: 48, netTutar: 552, komisyonOrani: 0.08
    });
});

test("125 TL x 4 için ürün, komisyon ve net hakediş doğru hesaplanır", () => {
    assert.deepEqual(calculateOrderEarnings({ fiyat: 125, adet: 4 }), {
        toplamTutar: 500, komisyon: 40, netTutar: 460, komisyonOrani: 0.08
    });
});

test("400 TL x 1 için ürün, komisyon ve net hakediş doğru hesaplanır", () => {
    assert.deepEqual(calculateOrderEarnings({ fiyat: 400, adet: 1 }), {
        toplamTutar: 400, komisyon: 32, netTutar: 368, komisyonOrani: 0.08
    });
});

test("kargo alanı komisyon ve hakediş hesabına dahil edilmez", () => {
    assert.deepEqual(
        calculateOrderEarnings({ fiyat: 400, adet: 1, kargoUcreti: 79.90 }),
        calculateOrderEarnings({ fiyat: 400, adet: 1 })
    );
});

function memoryFirestore(seed, failOnce = false) {
    const data = new Map(Object.entries(seed));
    let shouldFail = failOnce;
    const ref = (path) => ({ path });
    return {
        data,
        collection(name) { return { doc(id) { return ref(`${name}/${id}`); } }; },
        async runTransaction(handler) {
            const writes = [];
            const transaction = {
                async get(reference) {
                    const value = data.get(reference.path);
                    return { id: reference.path.split("/").pop(), exists: value !== undefined, data: () => value };
                },
                set(reference, value, options) { writes.push({ type: "set", reference, value, options }); },
                update(reference, value) { writes.push({ type: "update", reference, value }); }
            };
            const response = await handler(transaction);
            if (shouldFail) { shouldFail = false; throw new Error("simulated commit failure"); }
            writes.forEach(({ type, reference, value, options }) => {
                const current = data.get(reference.path) || {};
                data.set(reference.path, type === "update" || options?.merge ? { ...current, ...value } : value);
            });
            return response;
        }
    };
}

const timestamp = () => "server-time";
function normalSeed(twoOrders = false) {
    const seed = {
        "odemeler/conv-1": payment({ siparisIds: twoOrders ? ["order-1", "order-2"] : ["order-1"] }),
        "siparisler/order-1": { satici: "seller@example.com", alici: "buyer@example.com", fiyat: 100, adet: 1, odemeDurumu: false }
    };
    if (twoOrders) seed["siparisler/order-2"] = { satici: "seller@example.com", alici: "buyer@example.com", fiyat: 125, adet: 4, odemeDurumu: false };
    return seed;
}

test("çok adetli sipariş wallet ve hareket tutarlarına doğru yansır", async () => {
    const seed = normalSeed();
    seed["siparisler/order-1"] = { ...seed["siparisler/order-1"], fiyat: 300, adet: 2 };
    const db = memoryFirestore(seed);
    await finalizePayment({ firestore: db, FieldValue: { serverTimestamp: timestamp }, conversationId: "conv-1", paymentId: "pay-1" });
    const movement = db.data.get("bakiyeHareketleri/pay-1_order-1");
    assert.equal(movement.toplamTutar, 600);
    assert.equal(movement.komisyon, 48);
    assert.equal(movement.netTutar, 552);
    assert.equal(db.data.get("wallets/seller@example.com").pending, 552);
});

test("aynı callback ikinci kez wallet ve hareketi artırmaz", async () => {
    const db = memoryFirestore(normalSeed());
    const first = await finalizePayment({ firestore: db, FieldValue: { serverTimestamp: timestamp }, conversationId: "conv-1", paymentId: "pay-1" });
    const pending = db.data.get("wallets/seller@example.com").pending;
    const second = await finalizePayment({ firestore: db, FieldValue: { serverTimestamp: timestamp }, conversationId: "conv-1", paymentId: "pay-1" });
    assert.equal(first.alreadyFinalized, false);
    assert.equal(second.alreadyFinalized, true);
    assert.equal(db.data.get("wallets/seller@example.com").pending, pending);
    assert.equal([...db.data.keys()].filter((key) => key.startsWith("bakiyeHareketleri/")).length, 1);
});

test("aynı paymentId ile ödenmiş sipariş güvenli biçimde tamamlanabilir", async () => {
    const seed = normalSeed();
    seed["siparisler/order-1"] = { ...seed["siparisler/order-1"], odemeDurumu: true, paymentId: "pay-1" };
    const db = memoryFirestore(seed);
    await finalizePayment({ firestore: db, FieldValue: { serverTimestamp: timestamp }, conversationId: "conv-1", paymentId: "pay-1" });
    assert.equal(db.data.get("odemeler/conv-1").paymentStatus, "SUCCESS");
});

test("başka paymentId ile ödenmiş sipariş reddedilir", async () => {
    const seed = normalSeed();
    seed["siparisler/order-1"] = { ...seed["siparisler/order-1"], odemeDurumu: true, paymentId: "pay-other" };
    const db = memoryFirestore(seed);
    await assert.rejects(finalizePayment({ firestore: db, FieldValue: { serverTimestamp: timestamp }, conversationId: "conv-1", paymentId: "pay-1" }), /başka bir ödeme/);
});

test("aynı paymentId başka conversationId kilidinde kullanılamaz", async () => {
    const seed = normalSeed();
    seed["paymentFinalizations/pay-1"] = { conversationId: "conv-other", paymentId: "pay-1" };
    const db = memoryFirestore(seed);
    await assert.rejects(finalizePayment({ firestore: db, FieldValue: { serverTimestamp: timestamp }, conversationId: "conv-1", paymentId: "pay-1" }), /başka bir işlemde/);
});

test("iki sipariş tek callbackte birer kez finalize edilir", async () => {
    const db = memoryFirestore(normalSeed(true));
    await finalizePayment({ firestore: db, FieldValue: { serverTimestamp: timestamp }, conversationId: "conv-1", paymentId: "pay-1" });
    assert.equal(db.data.get("siparisler/order-1").odemeDurumu, true);
    assert.equal(db.data.get("siparisler/order-2").odemeDurumu, true);
    assert.equal([...db.data.keys()].filter((key) => key.startsWith("bakiyeHareketleri/")).length, 2);
    assert.equal(db.data.get("bakiyeHareketleri/pay-1_order-1").netTutar, 92);
    assert.equal(db.data.get("bakiyeHareketleri/pay-1_order-2").toplamTutar, 500);
    assert.equal(db.data.get("bakiyeHareketleri/pay-1_order-2").komisyon, 40);
    assert.equal(db.data.get("bakiyeHareketleri/pay-1_order-2").netTutar, 460);
    assert.equal(db.data.get("wallets/seller@example.com").pending, 552);
});

test("transaction commit hatası sonrası retry çift finansal etki üretmez", async () => {
    const db = memoryFirestore(normalSeed(), true);
    await assert.rejects(finalizePayment({ firestore: db, FieldValue: { serverTimestamp: timestamp }, conversationId: "conv-1", paymentId: "pay-1" }), /simulated/);
    assert.equal(db.data.has("wallets/seller@example.com"), false);
    await finalizePayment({ firestore: db, FieldValue: { serverTimestamp: timestamp }, conversationId: "conv-1", paymentId: "pay-1" });
    assert.equal(db.data.get("wallets/seller@example.com").pending, 92);
});

test("sponsor callback ikinci kez idempotent kalır", async () => {
    const db = memoryFirestore({
        "odemeler/conv-1": payment({ sponsor: true, sponsorBasvuruId: "sponsor-1", sponsorSuresi: 7 }),
        "sponsorBasvurular/sponsor-1": { odemeDurumu: false }
    });
    await finalizePayment({ firestore: db, FieldValue: { serverTimestamp: timestamp }, conversationId: "conv-1", paymentId: "pay-1" });
    const again = await finalizePayment({ firestore: db, FieldValue: { serverTimestamp: timestamp }, conversationId: "conv-1", paymentId: "pay-1" });
    assert.equal(again.alreadyFinalized, true);
});
