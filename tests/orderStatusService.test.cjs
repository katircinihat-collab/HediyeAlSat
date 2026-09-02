const test = require("node:test");
const assert = require("node:assert/strict");
const { ORDER_STATUSES, normalizeOrderStatus } = require("../backend/constants/orderStatuses");
const { sellerOwnsOrder, validateSellerTransition, buildSellerStatusUpdate } = require("../backend/services/orderStatusService");

const paid = { durum: "Ödendi", odemeDurumu: true };
const timestamp = () => "server-time";

test("satıcı Ödendi siparişini Hazırlanıyor yapabilir", () => assert.equal(validateSellerTransition(paid, "Hazırlanıyor").requested, ORDER_STATUSES.HAZIRLANIYOR));
test("başka satıcı siparişi değiştiremez", () => assert.equal(sellerOwnsOrder({ saticiUid: "seller-1", satici: "seller@example.com" }, { uid: "seller-2", email: "other@example.com" }), false));
test("ödemesi alınmamış sipariş değiştirilemez", () => assert.throws(() => validateSellerTransition({ ...paid, odemeDurumu: false }, "Hazırlanıyor"), /Ödemesi alınmamış/));
test("Ödendi durumundan doğrudan Kargoda geçilemez", () => assert.throws(() => validateSellerTransition(paid, "Kargoda"), /izin verilmiyor/));
test("Hazırlanıyor durumundan Kargoda geçilebilir", () => assert.equal(validateSellerTransition({ ...paid, durum: "Hazırlanıyor" }, "Kargoda").requested, "Kargoda"));
test("Kargoda durumundan Teslim Edildi geçilemez", () => assert.throws(() => validateSellerTransition({ ...paid, durum: "Kargoda" }, "Teslim Edildi"), /izin verilmiyor/));
test("Kargoda durumundan legacy Teslim geçilemez", () => assert.throws(() => validateSellerTransition({ ...paid, durum: "Kargoda" }, "Teslim"), /izin verilmiyor/));
test("satıcı İptal durumuna geçemez", () => assert.throws(() => validateSellerTransition(paid, "İptal"), /izin verilmiyor/));
test("satıcı İade durumuna geçemez", () => assert.throws(() => validateSellerTransition(paid, "İade"), /izin verilmiyor/));
test("kargoya geçerken firma, takip no ve server timestamp yazılır", () => {
    const update = buildSellerStatusUpdate({ ...paid, durum: "Hazırlanıyor" }, { durum: "Kargoda", kargoFirma: " Aras <script> ", kargoNo: " TR123 " }, { serverTimestamp: timestamp });
    assert.deepEqual(update, { durum: "Kargoda", kargoFirma: "Aras script", kargoNo: "TR123", kargoTarihi: "server-time", guncellenmeTarihi: "server-time" });
});
test("client payment alanları update payloadına taşınmaz", () => {
    const update = buildSellerStatusUpdate(paid, { durum: "Hazırlanıyor", paymentId: "fake", odemeDurumu: false, fiyat: 1 }, { serverTimestamp: timestamp });
    assert.deepEqual(Object.keys(update).sort(), ["durum", "guncellenmeTarihi"]);
});
test("legacy Bekliyor Ödendi olarak normalize edilir", () => assert.equal(validateSellerTransition({ ...paid, durum: "Bekliyor" }, "Hazırlanıyor").current, "Ödendi"));
test("legacy Kargoya Verildi Kargoda olarak normalize edilir", () => assert.equal(normalizeOrderStatus("Kargoya Verildi"), "Kargoda"));
test("legacy Teslim canonical Teslim Edildi olur ve değiştirilemez", () => {
    assert.equal(normalizeOrderStatus("Teslim"), "Teslim Edildi");
    assert.throws(() => validateSellerTransition({ ...paid, durum: "Teslim" }, "Hazırlanıyor"), /izin verilmiyor/);
});
test("sipariş yoksa güncelleme reddedilir", () => assert.throws(() => validateSellerTransition(null, "Hazırlanıyor"), /bulunamadı/));
