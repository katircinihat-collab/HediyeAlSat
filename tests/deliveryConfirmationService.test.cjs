const test = require("node:test");
const assert = require("node:assert/strict");
const { HOLD_DURATION_MS, actorOwnsOrder, buildDeliveryConfirmation, getPayoutEligibility } = require("../backend/services/deliveryConfirmationService");

const deliveryTime = new Date("2026-09-02T12:30:00.000Z");
const buyer = { type: "alici", uid: "buyer-uid", email: "buyer@example.com" };
const admin = { type: "admin", uid: "admin-uid", email: "admin@example.com" };
const shipped = { durum: "Kargoda", odemeDurumu: true, aliciUid: buyer.uid, alici: buyer.email };

test("buyer kendi Kargoda siparişini doğrulayabilir", () => assert.equal(buildDeliveryConfirmation(shipped, buyer, deliveryTime).update.durum, "Teslim Edildi"));
test("başka buyer doğrulayamaz", () => assert.throws(() => buildDeliveryConfirmation(shipped, { ...buyer, uid: "other", email: "other@example.com" }, deliveryTime), /yetkiniz yok/));
test("seller delivery endpoint actorü olarak doğrulayamaz", () => assert.equal(actorOwnsOrder(shipped, { type: "alici", uid: "seller", email: "seller@example.com" }), false));
test("ödemesi alınmamış sipariş doğrulanamaz", () => assert.throws(() => buildDeliveryConfirmation({ ...shipped, odemeDurumu: false }, buyer, deliveryTime), /Ödemesi alınmamış/));
test("Ödendi sipariş doğrudan teslim doğrulanamaz", () => assert.throws(() => buildDeliveryConfirmation({ ...shipped, durum: "Ödendi" }, buyer, deliveryTime), /kargodaki/));
test("Hazırlanıyor sipariş doğrudan teslim doğrulanamaz", () => assert.throws(() => buildDeliveryConfirmation({ ...shipped, durum: "Hazırlanıyor" }, buyer, deliveryTime), /kargodaki/));
test("legacy Kargoya Verildi sipariş doğrulanabilir", () => assert.equal(buildDeliveryConfirmation({ ...shipped, durum: "Kargoya Verildi" }, buyer, deliveryTime).update.durum, "Teslim Edildi"));
test("duplicate doğrulama timestamp ve bitişi değiştirmez", () => assert.deepEqual(buildDeliveryConfirmation({ ...shipped, durum: "Teslim Edildi", teslimatDogrulandi: true, hakEdisBlokeBitis: new Date() }, buyer, new Date()), { idempotent: true, update: null }));
test("buyer doğrulama tipi alici olur", () => assert.equal(buildDeliveryConfirmation(shipped, buyer, deliveryTime).update.teslimatDogrulamaTipi, "alici"));
test("admin doğrulaması çalışır", () => assert.equal(buildDeliveryConfirmation(shipped, admin, deliveryTime).update.durum, "Teslim Edildi"));
test("admin doğrulama tipi admin olur", () => assert.equal(buildDeliveryConfirmation(shipped, admin, deliveryTime).update.teslimatDogrulamaTipi, "admin"));
test("bloke bitişi teslimden tam 48 saat sonradır", () => {
  const update = buildDeliveryConfirmation(shipped, buyer, deliveryTime).update;
  assert.equal(update.hakEdisBlokeBitis.getTime() - update.hakEdisBlokeBaslangic.getTime(), HOLD_DURATION_MS);
});

function deliveredAt(hours) {
  return { ...shipped, durum: "Teslim Edildi", teslimatDogrulandi: true, hakEdisBlokeBitis: new Date(deliveryTime.getTime() + 48 * 3600000), saat: hours };
}
test("47 saat 59 dakikada eligible false", () => assert.equal(getPayoutEligibility(deliveredAt(), new Date(deliveryTime.getTime() + (47 * 60 + 59) * 60000)).eligible, false));
test("tam 48 saatte eligible true", () => assert.equal(getPayoutEligibility(deliveredAt(), new Date(deliveryTime.getTime() + 48 * 3600000)).eligible, true));
test("49 saatte eligible true", () => assert.equal(getPayoutEligibility(deliveredAt(), new Date(deliveryTime.getTime() + 49 * 3600000)).eligible, true));
test("ödeme başarısızsa eligible false", () => assert.equal(getPayoutEligibility({ ...deliveredAt(), odemeDurumu: false }, new Date(deliveryTime.getTime() + 49 * 3600000)).eligible, false));
test("teslim doğrulanmamışsa eligible false", () => assert.equal(getPayoutEligibility({ ...deliveredAt(), teslimatDogrulandi: false }, new Date(deliveryTime.getTime() + 49 * 3600000)).eligible, false));
test("legacy Teslim kaydı otomatik güvenilir sayılmaz", () => assert.equal(getPayoutEligibility({ ...deliveredAt(), durum: "Teslim", teslimatDogrulandi: false }, new Date(deliveryTime.getTime() + 49 * 3600000)).eligible, false));
test("legacy itiraz alanı tek başına güvenilir claim blokesi sayılmaz", () => assert.equal(getPayoutEligibility({ ...deliveredAt(), itirazAcik: true }, new Date(deliveryTime.getTime() + 49 * 3600000)).eligible, true));
test("daha önce payout yapılmışsa eligible false", () => assert.equal(getPayoutEligibility({ ...deliveredAt(), walletAktarildi: true }, new Date(deliveryTime.getTime() + 49 * 3600000)).eligible, false));
