const test = require("node:test");
const assert = require("node:assert/strict");
const { isExplicitlyMarkedTest, matchesCleanupScope, planWalletAdjustment } = require("../backend/services/testDataCleanupService");

test("yalnız açık test/sandbox işaretlerini otomatik aday kabul eder", () => {
  assert.equal(isExplicitlyMarkedTest({ environment: "sandbox" }), true);
  assert.equal(isExplicitlyMarkedTest({ conversationId: "test_order_1" }), true);
  assert.equal(isExplicitlyMarkedTest({ paymentStatus: "SUCCESS" }), false);
});

test("tarih kesimi tek başına yeterli değildir ve satıcı filtresi ister", () => {
  const doc = { id: "o1", data: { satici: "seller@example.com", tarih: "2026-01-01" } };
  assert.equal(matchesCleanupScope(doc, { before: new Date("2026-02-01").getTime(), sellers: new Set() }), false);
  assert.equal(matchesCleanupScope(doc, { before: new Date("2026-02-01").getTime(), sellers: new Set(["seller@example.com"]) }), true);
});

test("seçili bekleyen satış hareketini pending bakiyeden tutarlı çıkarır", () => {
  const plan = planWalletAdjustment({ pending: 23018.4, balance: 0, paid: 0, withdrawalPending: 0 }, [
    { tip: "Satış", durum: "Bekliyor", netTutar: 23018.4 }
  ]);
  assert.equal(plan.safe, true);
  assert.equal(plan.next.pending, 0);
  assert.equal(plan.next.balance, 0);
});

test("seçili hareket wallet tutarını aşıyorsa apply planını güvensiz sayar", () => {
  const plan = planWalletAdjustment({ pending: 10, balance: 0 }, [{ tip: "Satış", durum: "Bekliyor", netTutar: 11 }]);
  assert.equal(plan.safe, false);
  assert.equal(plan.next.pending, -1);
});
