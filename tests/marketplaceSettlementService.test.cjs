const test = require("node:test");
const assert = require("node:assert/strict");
const {
  STATUS, containsTransaction, providerCall, releaseMarketplaceEarning
} = require("../backend/services/iyzicoMarketplaceSettlementService");

function memoryFirestore(seed) {
  const data = new Map(Object.entries(seed));
  function snapshot(path) {
    const value = data.get(path);
    return { exists: value !== undefined, id: path.split("/").at(-1), data: () => value, get: (key) => value?.[key] };
  }
  function ref(path) {
    return {
      path,
      get: async () => snapshot(path),
      set: async (value, options) => data.set(path, options?.merge ? { ...data.get(path), ...value } : value)
    };
  }
  return {
    data,
    collection(name) { return { doc: (id) => ref(`${name}/${id}`) }; },
    async runTransaction(handler) {
      const writes = [];
      const tx = {
        get: async (target) => snapshot(target.path),
        update: (target, value) => writes.push([target.path, value]),
        set: (target, value, options) => writes.push([target.path, options?.merge ? { ...data.get(target.path), ...value } : value])
      };
      const result = await handler(tx);
      writes.forEach(([path, value]) => data.set(path, { ...data.get(path), ...value }));
      return result;
    }
  };
}

const now = new Date("2026-09-10T00:00:00Z");
const fieldValue = { serverTimestamp: () => "server-time" };
function seed(status = STATUS.PROTECTED) {
  return {
    "bakiyeHareketleri/move-1": { siparisId: "order-1", satici: "seller@example.com", netTutar: 92, durum: "Bekliyor", settlementMode: "IYZICO_MARKETPLACE", settlementStatus: status, paymentTransactionId: "tx-1" },
    "siparisler/order-1": { odemeDurumu: true, durum: "Teslim Edildi", teslimatDogrulandi: true, hakEdisBlokeBitis: new Date("2026-09-09T00:00:00Z"), paymentTransactionId: "tx-1" },
    "wallets/seller@example.com": { pending: 92, balance: 0, paid: 0 }
  };
}

test("provider raporunda payment transaction güvenli bulunur", () => {
  assert.equal(containsTransaction({ data: [{ paymentTxId: "tx-1" }] }, "tx-1"), true);
  assert.equal(containsTransaction({ data: [{ paymentTxId: "tx-2" }] }, "tx-1"), false);
});

test("provider timeout kesin ödeme sonucu üretmez", async () => {
  await assert.rejects(providerCall(() => {}, 5), (error) => error.code === "PROVIDER_TIMEOUT");
});

test("48 saat sonrası approval bir kez gönderilir, banka settlement olmadan PAID yazılmaz", async () => {
  const db = memoryFirestore(seed()); let calls = 0;
  const args = { firestore: db, FieldValue: fieldValue, movementId: "move-1", now, approve: async () => { calls += 1; return { status: "success" }; } };
  const first = await releaseMarketplaceEarning(args);
  const second = await releaseMarketplaceEarning({ ...args, query: async () => STATUS.REVIEW_REQUIRED });
  assert.equal(first.approved, true); assert.equal(second.reviewRequired, true); assert.equal(calls, 1);
  assert.equal(db.data.get("wallets/seller@example.com").balance, 0);
  assert.notEqual(db.data.get("siparisler/order-1").settlementStatus, STATUS.PAID);
});

test("provider PAID doğrulaması rezervi kapatır, ikinci sorgu çift hareket üretmez", async () => {
  const db = memoryFirestore(seed(STATUS.APPROVED));
  const args = { firestore: db, FieldValue: fieldValue, movementId: "move-1", now, query: async () => STATUS.PAID };
  const first = await releaseMarketplaceEarning(args); const second = await releaseMarketplaceEarning(args);
  assert.equal(first.success, true); assert.equal(second.alreadyPaid, true);
  assert.equal(db.data.get("wallets/seller@example.com").pending, 0);
  assert.equal(db.data.get("wallets/seller@example.com").balance, 0);
  assert.equal(db.data.get("wallets/seller@example.com").paid, 92);
});

test("provider failure veya unknown rezerve bakiyeyi korur", async () => {
  for (const providerStatus of [STATUS.FAILED, STATUS.REVIEW_REQUIRED]) {
    const db = memoryFirestore(seed(STATUS.APPROVED));
    const result = await releaseMarketplaceEarning({ firestore: db, FieldValue: fieldValue, movementId: "move-1", now, query: async () => providerStatus });
    assert.equal(result.reviewRequired, true); assert.equal(db.data.get("wallets/seller@example.com").pending, 92); assert.equal(db.data.get("wallets/seller@example.com").balance, 0);
  }
});

test("approval exception REVIEW_REQUIRED olur ve otomatik tekrar ödeme yapılmaz", async () => {
  const db = memoryFirestore(seed()); let calls = 0;
  const args = { firestore: db, FieldValue: fieldValue, movementId: "move-1", now, approve: async () => { calls += 1; const error = new Error("timeout"); error.code = "PROVIDER_TIMEOUT"; throw error; }, query: async () => STATUS.REVIEW_REQUIRED };
  const first = await releaseMarketplaceEarning(args); const second = await releaseMarketplaceEarning(args);
  assert.equal(first.reviewRequired, true); assert.equal(second.reviewRequired, true); assert.equal(calls, 1);
});

test("eşzamanlı işlem kilidi ikinci provider çağrısını başlatmaz", async () => {
  const values = seed(STATUS.PROCESSING);
  values["bakiyeHareketleri/move-1"].settlementUpdatedAt = now;
  const db = memoryFirestore(values); let calls = 0;
  const result = await releaseMarketplaceEarning({ firestore: db, FieldValue: fieldValue, movementId: "move-1", now, approve: async () => { calls += 1; return { status: "success" }; } });
  assert.equal(result.inProgress, true); assert.equal(calls, 0);
});
