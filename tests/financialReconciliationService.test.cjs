const test = require("node:test");
const assert = require("node:assert/strict");
const {
  reconciliationId, recordFinancialReconciliation, listFinancialReconciliations,
  getFinancialReconciliation, updateFinancialReconciliation
} = require("../backend/services/financialReconciliationService");

function memoryFirestore(seed = {}) {
  const data = new Map(Object.entries(seed)); let auto = 0;
  const ref = (path, id = path.split("/").at(-1)) => ({ path, id, async get() { return snapshot(data.get(path), id); } });
  const snapshot = (value, id) => ({ id, exists: value !== undefined, data: () => value });
  const docsIn = (name) => [...data.entries()].filter(([key]) => key.startsWith(`${name}/`) && key.split("/").length === 2).map(([key, value]) => snapshot(value, key.split("/")[1]));
  const collection = (name) => ({
    doc(id) { const actual = id || `auto-${++auto}`; return ref(`${name}/${actual}`, actual); },
    limit() { return { async get() { const docs = docsIn(name); return { docs, size: docs.length }; } }; },
    where(field, _operator, value) { return { async get() { const docs = docsIn(name).filter((doc) => doc.data()[field] === value); return { docs, size: docs.length }; } }; }
  });
  return {
    data, collection,
    async runTransaction(handler) {
      const writes = [];
      const tx = {
        async get(target) { return snapshot(data.get(target.path), target.id); },
        create(target, value) { if (data.has(target.path)) throw new Error("exists"); writes.push(["create", target, value]); },
        update(target, value) { writes.push(["update", target, value]); }
      };
      const result = await handler(tx);
      for (const [type, target, value] of writes) data.set(target.path, type === "update" ? { ...data.get(target.path), ...value } : { ...value });
      return result;
    }
  };
}

const event = { type: "refund", reasonCode: "PAYOUT_ALREADY_RELEASED", reason: "Hakediş daha önce aktarıldı.", orderId: "order-1", claimId: "claim-1", paymentId: "pay-1", seller: "seller@example.com", buyer: "buyer@example.com", grossAmount: 600, commissionAmount: 48, sellerNetAmount: 552, providerStatus: "success", sourceCollection: "refundFinalizations", sourceId: "claim-1" };

test("aynı finansal olay deterministik kimlik üretir", () => assert.equal(reconciliationId(event), reconciliationId({ ...event })));
test("refund reconciliation olayı doğru kayıt üretir", async () => { const db = memoryFirestore(); const result = await recordFinancialReconciliation({ firestore: db, event }); const row = db.data.get(`financialReconciliations/${result.id}`); assert.equal(row.orderId, "order-1"); assert.equal(row.sellerNetAmount, 552); assert.equal(row.status, "incelemede"); });
test("aynı olay duplicate kayıt üretmez", async () => { const db = memoryFirestore(); const first = await recordFinancialReconciliation({ firestore: db, event }); const second = await recordFinancialReconciliation({ firestore: db, event }); assert.equal(first.id, second.id); assert.equal([...db.data.keys()].filter((key) => key.startsWith("financialReconciliations/")).length, 1); assert.equal(db.data.get(`financialReconciliations/${first.id}`).occurrenceCount, 2); });
test("admin listeyi filtreli görebilir", async () => { const db = memoryFirestore(); await recordFinancialReconciliation({ firestore: db, event }); assert.equal((await listFinancialReconciliations({ firestore: db, filters: { type: "refund", seller: "SELLER" } })).length, 1); });
test("admin detayı ve audit geçmişini görebilir", async () => { const db = memoryFirestore(); const { id } = await recordFinancialReconciliation({ firestore: db, event }); await updateFinancialReconciliation({ firestore: db, id, body: { status: "incelemede", note: "Kontrol" }, admin: { uid: "admin", email: "admin@example.com" } }); const detail = await getFinancialReconciliation({ firestore: db, id }); assert.equal(detail.audit.length, 1); });
test("admin not ve incelemede durumu yazabilir", async () => { const db = memoryFirestore(); const { id } = await recordFinancialReconciliation({ firestore: db, event }); await updateFinancialReconciliation({ firestore: db, id, body: { status: "incelemede", note: "Belgeler bekleniyor" }, admin: { uid: "admin" } }); assert.equal(db.data.get(`financialReconciliations/${id}`).currentNote, "Belgeler bekleniyor"); });
test("admin manuel çözüldü yapabilir", async () => { const db = memoryFirestore(); const { id } = await recordFinancialReconciliation({ firestore: db, event }); await updateFinancialReconciliation({ firestore: db, id, body: { status: "manuel_cozuldu", note: "Harici muhasebe kaydı kontrol edildi" }, admin: { uid: "admin" } }); assert.equal(db.data.get(`financialReconciliations/${id}`).status, "manuel_cozuldu"); });
test("iki update iki immutable audit kaydı oluşturur", async () => { const db = memoryFirestore(); const { id } = await recordFinancialReconciliation({ firestore: db, event }); const admin = { uid: "admin", email: "admin@example.com" }; await updateFinancialReconciliation({ firestore: db, id, body: { status: "incelemede", note: "Bir" }, admin }); await updateFinancialReconciliation({ firestore: db, id, body: { status: "manuel_cozuldu", note: "İki" }, admin }); assert.equal([...db.data.keys()].filter((key) => key.startsWith("financialReconciliationAudits/")).length, 2); });
test("admin olmayan servis güncellemesi reddedilir", async () => { const db = memoryFirestore(); const { id } = await recordFinancialReconciliation({ firestore: db, event }); await assert.rejects(updateFinancialReconciliation({ firestore: db, id, body: { status: "manuel_cozuldu" }, admin: null }), /Admin/); });
test("finansal alan içeren update reddedilir", async () => { const db = memoryFirestore(); const { id } = await recordFinancialReconciliation({ firestore: db, event }); await assert.rejects(updateFinancialReconciliation({ firestore: db, id, body: { status: "manuel_cozuldu", balance: 999 }, admin: { uid: "admin" } }), /Yalnız durum ve not/); });
test("manuel çözüldü wallet ve hareket üretmez", async () => { const db = memoryFirestore({ "wallets/seller@example.com": { pending: 552, balance: 10 } }); const { id } = await recordFinancialReconciliation({ firestore: db, event }); await updateFinancialReconciliation({ firestore: db, id, body: { status: "manuel_cozuldu", note: "Tamam" }, admin: { uid: "admin" } }); assert.deepEqual(db.data.get("wallets/seller@example.com"), { pending: 552, balance: 10 }); assert.equal([...db.data.keys()].some((key) => key.startsWith("bakiyeHareketleri/")), false); });
test("geçersiz durum reddedilir", async () => { const db = memoryFirestore(); const { id } = await recordFinancialReconciliation({ firestore: db, event }); await assert.rejects(updateFinancialReconciliation({ firestore: db, id, body: { status: "odendi" }, admin: { uid: "admin" } }), /Geçersiz/); });
