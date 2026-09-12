const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const reconciliationPath = path.resolve(__dirname, "../backend/services/financialReconciliationService.js");
const servicePath = path.resolve(__dirname, "../backend/services/withdrawalRejectionService.js");

function loadService(reconciliations) {
  delete require.cache[servicePath];
  require.cache[reconciliationPath] = {
    id: reconciliationPath,
    filename: reconciliationPath,
    loaded: true,
    exports: {
      recordFinancialReconciliation: async ({ event }) => {
        const key = `${event.sourceCollection}/${event.sourceId}/${event.reasonCode}`;
        if (!reconciliations.has(key)) reconciliations.set(key, event);
        return { id: key, created: reconciliations.size === 1 };
      }
    }
  };
  return require(servicePath);
}

function memoryFirestore(overrides = {}) {
  const data = new Map([
    ["paraCekmeTalepleri/w-1", { email: "seller@example.com", ownerUid: "seller-uid", tutar: 100, durum: "PROCESSING", ...overrides.withdrawal }],
    ["wallets/seller@example.com", { balance: 40, withdrawalPending: 100, paid: 20, ...overrides.wallet }]
  ]);
  data.set("withdrawalRequestGuards/seller-uid", { active: true, withdrawalId: "w-1", status: "PROCESSING" });
  if (overrides.finalization) data.set("withdrawalFinalizations/w-1", overrides.finalization);
  const ref = (value) => ({ path: value, id: value.split("/").at(-1) });
  const snapshot = (value) => ({ exists: value !== undefined, data: () => value });
  return {
    data,
    collection(name) { return { doc(id) { return ref(`${name}/${id}`); } }; },
    async runTransaction(handler) {
      const writes = [];
      const tx = {
        async get(target) { return snapshot(data.get(target.path)); },
        update(target, value) { writes.push(["update", target, value]); },
        create(target, value) {
          if (data.has(target.path)) throw new Error("exists");
          writes.push(["create", target, value]);
        }
      };
      const result = await handler(tx);
      for (const [type, target, value] of writes) {
        data.set(target.path, type === "update" ? { ...data.get(target.path), ...value } : { ...value });
      }
      return result;
    }
  };
}

const admin = { uid: "admin-uid", email: "admin@example.com" };
const FieldValue = { serverTimestamp: () => new Date("2026-09-07T15:00:00Z") };

function setup(overrides = {}) {
  const reconciliations = new Map();
  const service = loadService(reconciliations);
  const firestore = memoryFirestore(overrides);
  const reject = (body = { neden: "Talep doğrulanamadı" }) => service.rejectWithdrawal({
    firestore, FieldValue, withdrawalId: "w-1", admin, body
  });
  return { firestore, reconciliations, service, reject };
}

test("admin iptali trusted tutarı balance değerine geri ekler", async () => {
  const { firestore, reject } = setup();
  await reject({ neden: "Red", amount: 1 });
  assert.equal(firestore.data.get("wallets/seller@example.com").balance, 140);
});

test("admin iptali withdrawalPending değerini trusted tutar kadar azaltır", async () => {
  const { firestore, reject } = setup({ wallet: { withdrawalPending: 150 } });
  await reject();
  assert.equal(firestore.data.get("wallets/seller@example.com").withdrawalPending, 50);
});

test("duplicate iptal ikinci finansal etki veya audit oluşturmaz", async () => {
  const { firestore, reject } = setup();
  await reject();
  const second = await reject();
  assert.equal(second.idempotent, true);
  assert.equal(firestore.data.get("wallets/seller@example.com").balance, 140);
  assert.equal([...firestore.data.keys()].filter((key) => key.startsWith("withdrawalFinalizations/")).length, 1);
});

test("yetersiz withdrawalPending hiçbir bakiye veya talep durumu değiştirmez", async () => {
  const { firestore, reject } = setup({ wallet: { withdrawalPending: 99 } });
  await assert.rejects(reject(), (error) => error.code === "WITHDRAWAL_PENDING_INSUFFICIENT");
  assert.equal(firestore.data.get("wallets/seller@example.com").balance, 40);
  assert.equal(firestore.data.get("wallets/seller@example.com").withdrawalPending, 99);
  assert.equal(firestore.data.get("paraCekmeTalepleri/w-1").durum, "PROCESSING");
});

test("yetersiz durumda deterministik reconciliation yalnız bir kayıt üretir", async () => {
  const { reconciliations, reject } = setup({ wallet: { withdrawalPending: 99 } });
  await assert.rejects(reject());
  await assert.rejects(reject());
  assert.equal(reconciliations.size, 1);
  assert.equal([...reconciliations.values()][0].reasonCode, "WITHDRAWAL_PENDING_INSUFFICIENT");
});

test("client sahte amount seller ve email alanları dikkate alınmaz", async () => {
  const { firestore, reject } = setup();
  await reject({ neden: "Red", amount: 1, seller: "attacker", email: "attacker@example.com" });
  const finalization = firestore.data.get("withdrawalFinalizations/w-1");
  assert.equal(finalization.amount, 100);
  assert.equal(finalization.seller, "seller@example.com");
});

test("transaction yarışında yalnız mevcut finalization kazanır", async () => {
  const { firestore, reject } = setup({ finalization: { status: "IPTAL_EDILDI" } });
  const result = await reject();
  assert.equal(result.idempotent, true);
  assert.equal(firestore.data.get("wallets/seller@example.com").balance, 40);
});

test("başarılı iptal negatif balance veya pending oluşturmaz ve admin auditini yazar", async () => {
  const { firestore, reject } = setup({ wallet: { balance: 0, withdrawalPending: 100 } });
  await reject();
  const wallet = firestore.data.get("wallets/seller@example.com");
  const audit = firestore.data.get("withdrawalFinalizations/w-1");
  assert.equal(wallet.balance, 100);
  assert.equal(wallet.withdrawalPending, 0);
  assert.equal(audit.adminUid, "admin-uid");
  assert.ok(audit.idempotencyKey);
  assert.equal(firestore.data.get("paraCekmeTalepleri/w-1").durum, "IPTAL_EDILDI");
  assert.equal(firestore.data.get("withdrawalRequestGuards/seller-uid").active, false);
});

test("iptal veya bloke gerekçesi zorunludur", async () => {
  const { reject } = setup();
  await assert.rejects(reject({ neden: "" }), (error) => error.code === "WITHDRAWAL_REASON_REQUIRED");
});
