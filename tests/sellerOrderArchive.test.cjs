const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { isUnpaidAttempt, owns, inspectSellerAttempt, archiveSellerAttempt } = require("../backend/services/sellerOrderArchiveService");

const user = { uid: "seller", email: "seller@example.test" };
const now = new Date("2026-09-27T10:00:00Z");
const unpaid = () => ({ saticiUid: user.uid, odemeDurumu: false, durum: "Ödeme Bekleniyor", tarih: new Date(now - 3600000), toplam: 50 });
function database(order = unpaid(), related = {}) {
  const records = { "siparisler/order": order, ...related };
  const writes = [];
  const snapshot = (path) => ({ id: path.split("/")[1], exists: path in records, data: () => structuredClone(records[path]) });
  const query = (name, filters = [], size = Infinity) => ({
    where: (field, op, value) => query(name, [...filters, [field, op, value]], size),
    limit: (count) => query(name, filters, count),
    read: () => ({ docs: Object.entries(records).filter(([path, row]) => path.startsWith(`${name}/`) && filters.every(([field, op, value]) => op === "array-contains" ? row[field]?.includes(value) : row[field] === value)).slice(0, size).map(([path]) => snapshot(path)) }),
    doc: (id) => ({ path: `${name}/${id}`, read: () => snapshot(`${name}/${id}`) }),
  });
  let previous = Promise.resolve();
  const firestore = { collection: (name) => query(name), runTransaction: (fn) => {
    const result = previous.then(async () => {
      const pending = [];
      const result = await fn({ get: async (ref) => ref.read(), update: (ref, data) => pending.push([ref.path, data]) });
      for (const [path, data] of pending) { Object.assign(records[path], data); writes.push({ path, data }); }
      return result;
    });
    previous = result.catch(() => {});
    return result;
  } };
  return { firestore, records, writes };
}
const args = (db) => ({ firestore: db.firestore, FieldValue: { serverTimestamp: () => now }, orderId: "order", user, now });

test("old unpaid without payment or finance is safely archived, not deleted", async () => {
  const db = database();
  assert.deepEqual(await inspectSellerAttempt(args(db)), { eligible: true });
  assert.equal((await archiveSellerAttempt(args(db))).archived, true);
  assert.equal(db.records["siparisler/order"].toplam, 50);
  assert.equal(db.records["siparisler/order"].sellerAttemptArchived, true);
  assert.deepEqual(Object.keys(db.writes[0].data).sort(), ["sellerAttemptArchived", "sellerAttemptArchivedAt", "sellerAttemptArchivedBy"]);
});

for (const [name, patch] of Object.entries({
  paid: { odemeDurumu: true }, preparing: { durum: "Hazırlanıyor" }, shipped: { durum: "Kargoda" },
  deliveredLegacy: { durum: "Teslim Edildi", kargoFirma: "MNG", kargoNo: "123456789" },
  settlement: { settlementStatus: "PROTECTED" }, payout: { payoutStatus: "PAID" },
  refund: { refundStatus: "SUCCESS" }, dispute: { aktifTalepId: "claim" },
  legacyFinance: { hakEdisDurumu: "READY" }, transaction: { paymentTransactionId: "provider" },
  malformed: { odemeDurumu: "false" }, missingPaymentFlag: { odemeDurumu: undefined }, invalidDate: { tarih: "invalid" },
  future: { tarih: new Date(now.getTime() + 1000) }, recent: { tarih: now },
})) {
  test(`${name} cannot archive even with an unpaid display label`, async () => {
    const db = database({ ...unpaid(), ...patch });
    assert.equal((await inspectSellerAttempt(args(db))).eligible, false);
    await assert.rejects(archiveSellerAttempt(args(db)), (error) => error.status === 409);
    assert.equal(db.writes.length, 0);
  });
}

test("foreign seller and stale email cannot bypass canonical UID", async () => {
  const db = database({ ...unpaid(), saticiUid: "other", satici: user.email });
  await assert.rejects(archiveSellerAttempt(args(db)), (error) => error.status === 403);
  assert.equal(owns({ satici: user.email }, user), true);
  assert.equal(owns({ saticiUid: user.uid }, null), false);
});

for (const collection of ["bakiyeHareketleri", "orderClaims", "refundFinalizations"]) {
  test(`separate ${collection} audit link blocks archival`, async () => {
    const db = database(unpaid(), { [`${collection}/linked`]: { siparisId: "order", orderId: "order" } });
    await assert.rejects(archiveSellerAttempt(args(db)), (error) => error.status === 409);
  });
}

for (const status of ["WAITING", "SUCCESS", "MANUAL_REVIEW", "FAILED_FINALIZATION", "AMOUNT_MISMATCH", "EXPIRED"]) {
  test(`linked payment ${status} is never assumed to be a failed sale`, async () => {
    const db = database(unpaid(), { "odemeler/payment": { siparisIds: ["order"], paymentStatus: status, odemeDurumu: false } });
    assert.equal((await inspectSellerAttempt(args(db))).eligible, false);
  });
}

test("confirmed failure requires released reservation; archive retains all linked records", async () => {
  const related = { "odemeler/payment": { siparisIds: ["order"], paymentStatus: "FAILED", odemeDurumu: false, stockReservationId: "reservation" }, "stockReservations/reservation": { status: "ACTIVE", conversationId: "payment" } };
  const db = database(unpaid(), related);
  assert.equal((await inspectSellerAttempt(args(db))).eligible, false);
  db.records["stockReservations/reservation"].status = "RELEASED";
  await archiveSellerAttempt(args(db));
  assert.ok(db.records["odemeler/payment"]);
  assert.ok(db.records["stockReservations/reservation"]);
  assert.equal(db.writes.length, 1);
});

test("Kura private destination/reservations remain protected and not returned", async () => {
  const db = database(unpaid(), { "raffleOrderDeliveries/order": { address: "private", phone: "private" } });
  assert.deepEqual(await inspectSellerAttempt(args(db)), { eligible: false });
  assert.equal(db.writes.length, 0);
});

test("parallel double request is idempotent; no financial fields change", async () => {
  const db = database();
  const results = await Promise.all([archiveSellerAttempt(args(db)), archiveSellerAttempt(args(db))]);
  assert.equal(results.filter((result) => result.idempotent).length, 1);
  assert.equal(db.writes.length, 1);
});

test("eligibility is rechecked after payment between preview and confirmation", async () => {
  const db = database();
  assert.equal((await inspectSellerAttempt(args(db))).eligible, true);
  db.records["siparisler/order"].odemeDurumu = true;
  await assert.rejects(archiveSellerAttempt(args(db)), (error) => error.status === 409);
});

test("digital and archived/missing product use the same financial checks without listing dependency", async () => {
  const db = database({ ...unpaid(), urunTipi: "dijital", ilanId: "deleted-product" });
  assert.equal((await archiveSellerAttempt(args(db))).archived, true);
  assert.equal(isUnpaidAttempt({ ...unpaid(), urunTipi: "dijital", odemeDurumu: true }), false);
});

test("auth, bounded preview and double-click UI lock remain explicit", () => {
  const routes = fs.readFileSync("backend/routes/orderStatusRoutes.js", "utf8");
  assert.match(routes, /archive-failed", authMiddleware, financialRateLimit/);
  assert.match(routes, /cleanup-preview", authMiddleware, financialRateLimit/);
  const card = fs.readFileSync("src/components/store/StoreOrderCard.jsx", "utf8");
  assert.match(card, /async function archive\(\) \{\s*if \(lock.current\) return;/);
  assert.match(card, /view.cleanupEligible && view.paymentAttempt/);
  assert.match(card, /Siliniyor…/);
  assert.doesNotMatch(card, /deleteDoc/);
});
