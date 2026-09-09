const test = require("node:test");
const assert = require("node:assert/strict");
const { hareketiBalanceAktar } = require("../backend/services/walletReleaseService");

function memoryFirestore(seed) {
  const data = new Map(Object.entries(seed));
  const ref = (path) => ({ path });
  return {
    data,
    collection(name) { return { doc(id) { return ref(`${name}/${id}`); } }; },
    async runTransaction(handler) {
      const writes = [];
      const tx = {
        async get(target) { const value = data.get(target.path); return { exists: value !== undefined, data: () => value }; },
        update(target, value) { writes.push([target.path, value]); }
      };
      const result = await handler(tx);
      writes.forEach(([path, value]) => data.set(path, { ...data.get(path), ...value }));
      return result;
    }
  };
}

const releaseAt = new Date("2026-09-03T00:00:00Z");
function seed(overrides = {}) {
  return {
    "bakiyeHareketleri/move-1": { siparisId: "order-1", satici: "seller@example.com", netTutar: 92, durum: "Bekliyor", blockageResolvedDate: releaseAt },
    "siparisler/order-1": { durum: "Teslim Edildi", odemeDurumu: true, teslimatDogrulandi: true, hakEdisBlokeBitis: releaseAt, hakEdisBlokeli: false, ...overrides },
    "wallets/seller@example.com": { pending: 92, balance: 8 }
  };
}
const deps = (db) => ({ firestore: db, FieldValue: { serverTimestamp: () => "server-time" }, now: () => new Date("2026-09-04T00:00:00Z") });

test("hakediş pending bakiyeden balance'a atomik aktarılır", async () => { const db = memoryFirestore(seed()); const result = await hareketiBalanceAktar("move-1", deps(db)); assert.equal(result.success, true); assert.equal(db.data.get("wallets/seller@example.com").pending, 0); assert.equal(db.data.get("wallets/seller@example.com").balance, 100); assert.equal(db.data.get("siparisler/order-1").payoutCompleted, true); });
test("aynı hakediş ikinci kez aktarılmaz", async () => { const db = memoryFirestore(seed()); await hareketiBalanceAktar("move-1", deps(db)); const again = await hareketiBalanceAktar("move-1", deps(db)); assert.equal(again.zatenAktarildi, true); assert.equal(db.data.get("wallets/seller@example.com").balance, 100); });
test("aktif claim hakedişi engeller", async () => { const db = memoryFirestore(seed({ hakEdisBlokeli: true, aktifTalepId: "claim-1" })); const result = await hareketiBalanceAktar("move-1", deps(db)); assert.equal(result.success, false); assert.equal(db.data.get("wallets/seller@example.com").balance, 8); });
test("refund edilmiş sipariş hakedişe açılamaz", async () => { const db = memoryFirestore(seed({ refundProviderStatus: "success" })); const result = await hareketiBalanceAktar("move-1", deps(db)); assert.equal(result.success, false); assert.equal(db.data.get("wallets/seller@example.com").balance, 8); });
test("yetersiz pending balance artırmaz", async () => { const values = seed(); values["wallets/seller@example.com"].pending = 20; const db = memoryFirestore(values); await assert.rejects(hareketiBalanceAktar("move-1", deps(db)), /manuel inceleme/); assert.equal(db.data.get("wallets/seller@example.com").balance, 8); });
test("dijital hakediş 48 saatten önce balance'a geçmez", async () => { const db = memoryFirestore(seed({ urunTipi: "dijital", teslimatTipi: "dijital" })); const result = await hareketiBalanceAktar("move-1", { ...deps(db), now: () => new Date("2026-09-02T23:59:59Z") }); assert.equal(result.success, false); assert.equal(db.data.get("wallets/seller@example.com").pending, 92); assert.equal(db.data.get("wallets/seller@example.com").balance, 8); });
test("dijital hakediş 48 saat sonra claim yoksa bir kez balance'a geçer", async () => { const db = memoryFirestore(seed({ urunTipi: "dijital", teslimatTipi: "dijital" })); await hareketiBalanceAktar("move-1", deps(db)); const second = await hareketiBalanceAktar("move-1", deps(db)); assert.equal(second.zatenAktarildi, true); assert.equal(db.data.get("wallets/seller@example.com").pending, 0); assert.equal(db.data.get("wallets/seller@example.com").balance, 100); });
