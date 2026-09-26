// Explicit emulator-only integration test; cannot connect to a production project.
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
if (!/^127\.0\.0\.1:\d+$|^localhost:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || "")) throw new Error("Local Firestore emulator required");
const admin = require("../backend/node_modules/firebase-admin");
const { archiveSellerAttempt, inspectSellerAttempt } = require("../backend/services/sellerOrderArchiveService");
const app = admin.initializeApp({ projectId: "demo-hediyealsat" }, "seller-archive-emulator");
const firestore = app.firestore();
const user = { uid: "archive-emulator-seller", email: "archive@example.test" };
const base = { odemeDurumu: false, durum: "Ödeme Bekleniyor", saticiUid: user.uid, tarih: new Date(Date.now() - 3600000) };
const args = (orderId) => ({ firestore, FieldValue: admin.firestore.FieldValue, orderId, user });
after(() => app.delete());

test("real Firestore transactions serialize duplicate archive and preserve the order", async () => {
  const id = "archive-emulator-duplicate";
  const ref = firestore.collection("siparisler").doc(id);
  await ref.set(base);
  const results = await Promise.all([archiveSellerAttempt(args(id)), archiveSellerAttempt(args(id))]);
  assert.equal(results.filter((value) => value.idempotent).length, 1);
  assert.equal((await ref.get()).data().sellerAttemptArchived, true);
  await ref.update({ odemeDurumu: true, durum: "Ödendi" });
  await assert.rejects(archiveSellerAttempt(args(id)), (error) => error.status === 409);
});

test("real related payment query blocks WAITING and released-stock uncertainty", async () => {
  const id = "archive-emulator-waiting";
  await firestore.collection("siparisler").doc(id).set(base);
  await firestore.collection("odemeler").doc("archive-emulator-payment").set({ siparisIds: [id], odemeDurumu: false, paymentStatus: "WAITING", stockReservationId: "archive-emulator-stock" });
  await firestore.collection("stockReservations").doc("archive-emulator-stock").set({ status: "RELEASED", conversationId: "archive-emulator-payment" });
  assert.equal((await inspectSellerAttempt(args(id))).eligible, false);
  await firestore.collection("odemeler").doc("archive-emulator-payment").update({ paymentStatus: "FAILED" });
  assert.equal((await inspectSellerAttempt(args(id))).eligible, true);
  await firestore.collection("bakiyeHareketleri").doc("archive-emulator-movement").set({ siparisId: id });
  await assert.rejects(archiveSellerAttempt(args(id)), (error) => error.status === 409);
});
