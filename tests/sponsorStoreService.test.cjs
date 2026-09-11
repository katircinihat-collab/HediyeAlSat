const test = require("node:test");
const assert = require("node:assert/strict");
const { getSponsorStorePackage, sponsorPaymentBasket, ownsStore, STATUS } = require("../backend/services/sponsorStoreService");

test("sponsor mağaza paketleri authoritative fiyat, süre ve priority taşır", () => {
  assert.deepEqual(["bronze", "gold", "diamond"].map((id) => getSponsorStorePackage(id)), [
    { id: "bronze", name: "Bronz Sponsor", durationDays: 7, price: 499, priority: 1 },
    { id: "gold", name: "Altın Sponsor", durationDays: 15, price: 999, priority: 2 },
    { id: "diamond", name: "Elmas Sponsor", durationDays: 30, price: 1999, priority: 3 }
  ]);
});

test("sponsor ödeme sepeti LISTING hizmet item'ı için tam platform tutarını kullanır", () => {
  const basket = sponsorPaymentBasket(getSponsorStorePackage("gold"));
  assert.equal(basket[0].price, "999.00");
  assert.equal("subMerchantKey" in basket[0], false);
  assert.equal("subMerchantPrice" in basket[0], false);
});

test("mağaza sahipliği UID canonical, email yalnız legacy fallback'tir", () => {
  assert.equal(ownsStore({ sahipUid: "owner", sahip: "other@example.com" }, { uid: "owner", email: "x@example.com" }), true);
  assert.equal(ownsStore({ sahipUid: "other", sahip: "x@example.com" }, { uid: "owner", email: "x@example.com" }), false);
  assert.equal(ownsStore({ sahip: "x@example.com" }, { uid: "owner", email: "x@example.com" }), true);
  assert.equal(STATUS.REVIEW_PENDING, "REVIEW_PENDING");
});
