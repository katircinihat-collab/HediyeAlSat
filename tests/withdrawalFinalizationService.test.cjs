const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MANUAL_PAYMENT_STATUS, finalizeManualWithdrawal
} = require("../backend/services/withdrawalFinalizationService");

function memoryFirestore(overrides = {}) {
  const withdrawal = { email: "seller@example.com", tutar: 100, durum: "BEKLIYOR", iban: "TR001" , ...overrides.withdrawal };
  const wallet = { balance: 40, pending: 10, withdrawalPending: 100, paid: 20, ...overrides.wallet };
  const data = new Map([
    ["paraCekmeTalepleri/w-1", withdrawal],
    ["wallets/seller@example.com", wallet]
  ]);
  if (overrides.finalization) data.set("withdrawalFinalizations/w-1", overrides.finalization);
  let auto = 0;
  const ref = (path) => ({ path, id: path.split("/").at(-1) });
  const snapshot = (value) => ({ exists: value !== undefined, data: () => value });
  return {
    data,
    collection(name) { return { doc(id) { return ref(`${name}/${id || `auto-${++auto}`}`); } }; },
    async runTransaction(handler) {
      const writes = [];
      const tx = {
        async get(target) { return snapshot(data.get(target.path)); },
        update(target, value) { writes.push(["update", target, value]); },
        create(target, value) { if (data.has(target.path)) throw new Error("exists"); writes.push(["create", target, value]); }
      };
      const result = await handler(tx);
      for (const [type, target, value] of writes) data.set(target.path, type === "update" ? { ...data.get(target.path), ...value } : { ...value });
      return result;
    }
  };
}

const admin = { uid: "admin-uid", email: "admin@example.com" };
const FieldValue = { serverTimestamp: () => new Date("2026-09-07T12:00:00Z") };
const valid = (db, body = { providerReference: "BANK-REF-123", note: "Dekont kontrol edildi" }) => finalizeManualWithdrawal({ firestore: db, FieldValue, withdrawalId: "w-1", admin, body });

test("admin bekleyen talebi manuel transfer referansıyla finalize eder", async () => { const db = memoryFirestore(); const result = await valid(db); assert.equal(result.status, MANUAL_PAYMENT_STATUS); assert.equal(db.data.get("paraCekmeTalepleri/w-1").odemeReferansi, "BANK-REF-123"); });
test("trusted talep tutarı withdrawalPending bakiyesinden düşer", async () => { const db = memoryFirestore(); await valid(db, { providerReference: "BANK-REF-123", amount: 1 }); assert.equal(db.data.get("wallets/seller@example.com").withdrawalPending, 0); assert.equal(db.data.get("wallets/seller@example.com").paid, 120); });
test("client sahte seller ve email alanları dikkate alınmaz", async () => { const db = memoryFirestore(); await valid(db, { providerReference: "BANK-REF-123", seller: "attacker", email: "attacker@example.com" }); assert.equal(db.data.get("withdrawalFinalizations/w-1").seller, "seller@example.com"); });
test("duplicate request paid ve pending değerini ikinci kez değiştirmez", async () => { const db = memoryFirestore(); await valid(db); const second = await valid(db); assert.equal(second.idempotent, true); assert.equal(db.data.get("wallets/seller@example.com").paid, 120); assert.equal(db.data.get("wallets/seller@example.com").withdrawalPending, 0); });
test("duplicate click ikinci audit/finalization oluşturmaz", async () => { const db = memoryFirestore(); await valid(db); await valid(db); assert.equal([...db.data.keys()].filter((key) => key.startsWith("withdrawalFinalizations/")).length, 1); });
test("yetersiz rezerve bakiye ödeme yapmaz", async () => { const db = memoryFirestore({ wallet: { withdrawalPending: 99 } }); await assert.rejects(valid(db), (error) => error.code === "WITHDRAWAL_PENDING_INSUFFICIENT"); assert.equal(db.data.get("wallets/seller@example.com").paid, 20); assert.equal(db.data.get("paraCekmeTalepleri/w-1").durum, "BEKLIYOR"); });
test("wallet balance onay sırasında tekrar düşmez ve negatif olmaz", async () => { const db = memoryFirestore({ wallet: { balance: 0 } }); await valid(db); assert.equal(db.data.get("wallets/seller@example.com").balance, 0); });
test("daha önce ödenmiş talep tekrar işlenmez", async () => { const db = memoryFirestore({ withdrawal: { durum: MANUAL_PAYMENT_STATUS } }); const result = await valid(db); assert.equal(result.idempotent, true); assert.equal(db.data.get("wallets/seller@example.com").paid, 20); });
test("beklemede olmayan talep reddedilir", async () => { const db = memoryFirestore({ withdrawal: { durum: "REDDEDILDI" } }); await assert.rejects(valid(db), /uygun değil/); });
test("gerçek transfer referansı yoksa finansal kayıt değişmez", async () => { const db = memoryFirestore(); await assert.rejects(valid(db, { providerReference: "" }), /referansı/); assert.equal(db.data.get("wallets/seller@example.com").paid, 20); });
test("finalization immutable audit değerlerini içerir", async () => { const db = memoryFirestore(); await valid(db); const audit = db.data.get("withdrawalFinalizations/w-1"); assert.equal(audit.previousWithdrawalPending, 100); assert.equal(audit.newWithdrawalPending, 0); assert.equal(audit.previousPaid, 20); assert.equal(audit.newPaid, 120); assert.equal(audit.adminUid, "admin-uid"); assert.equal(audit.provider, "manual_bank_transfer"); assert.ok(audit.idempotencyKey); });
test("transaction yarışında mevcut finalization ikinci kazancı idempotent yapar", async () => { const db = memoryFirestore({ finalization: { status: MANUAL_PAYMENT_STATUS } }); const result = await valid(db); assert.equal(result.idempotent, true); assert.equal(db.data.get("wallets/seller@example.com").withdrawalPending, 100); });
test("admin kimliği olmadan servis finalize etmez", async () => { const db = memoryFirestore(); await assert.rejects(finalizeManualWithdrawal({ firestore: db, FieldValue, withdrawalId: "w-1", admin: null, body: { providerReference: "BANK-123" } }), /Admin/); });
