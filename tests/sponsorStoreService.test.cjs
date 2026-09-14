const test = require("node:test");
const assert = require("node:assert/strict");
const { getSponsorStorePackage, resolveApplicationPackage, resolveApprovalPackage, sponsorPaymentBasket, ownsStore, STATUS } = require("../backend/services/sponsorStoreService");

test("sponsor mağaza paketleri authoritative fiyat, süre ve priority taşır", () => {
  assert.deepEqual(["bronze", "gold", "diamond"].map((id) => getSponsorStorePackage(id)), [
    { id: "bronze", name: "Bronz Sponsor", durationDays: 7, price: 499, priority: 1 },
    { id: "gold", name: "Altın Sponsor", durationDays: 15, price: 999, priority: 2 },
    { id: "diamond", name: "Elmas Sponsor", durationDays: 30, price: 1999, priority: 3 }
  ]);
});

test("başvuruda satıcının paket kimliği authoritative config ile bağlanır", () => {
  const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "../backend/services/sponsorStoreService.js"), "utf8");
  assert.match(source, /resolveApplicationPackage\(input\)/);
  assert.match(source, /selectedPrice: selected\.price/);
  assert.match(source, /PACKAGE_CHANGE_FORBIDDEN/);
});

test("geçersiz client paketi reddedilir ve fiyat/süre clienttan alınmaz", () => {
  assert.throws(() => resolveApplicationPackage({ packageId: "fake", price: 1, durationDays: 999 }), /paketi seçimi/);
  assert.deepEqual(resolveApplicationPackage({ packageId: "bronze", price: 1, durationDays: 999 }), getSponsorStorePackage("bronze"));
});

test("admin satıcının seçtiği paketi değiştiremez, legacy başvuruyu onaylayabilir", () => {
  assert.throws(() => resolveApprovalPackage({ selectedPackageId: "bronze" }, "diamond"), /değiştirilemez/);
  assert.equal(resolveApprovalPackage({ selectedPackageId: "gold" }, "gold").id, "gold");
  assert.equal(resolveApprovalPackage({}, "diamond").id, "diamond");
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
