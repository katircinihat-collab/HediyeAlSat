const test = require("node:test");
const assert = require("node:assert/strict");
const { _test } = require("../backend/controllers/digitalAssetController");

test("ödenmiş dijital siparişin gerçek alıcısı sahiplik kontrolünü geçer", () => {
  assert.equal(_test.ownsPaidOrder({ odemeDurumu: true, aliciUid: "buyer" }, { uid: "buyer" }), true);
});
test("başka kullanıcı dijital siparişe erişemez", () => {
  assert.equal(_test.ownsPaidOrder({ odemeDurumu: true, aliciUid: "buyer" }, { uid: "other" }), false);
});
test("ödenmemiş sipariş indirilemez", () => {
  assert.equal(_test.ownsPaidOrder({ odemeDurumu: false, aliciUid: "buyer" }, { uid: "buyer" }), false);
});
test("signed download URL kısa süreli ve secret içermeden üretilir", () => {
  const result = _test.privateDownloadUrl({ cloudName: "demo", apiKey: "key", apiSecret: "top-secret" }, { providerAssetId: "digital-originals/u/a", resourceType: "image", format: "pdf" }, 1_700_000_000_000);
  assert.match(result.url, /^https:\/\/api\.cloudinary\.com\/v1_1\/demo\/image\/download\?/);
  assert.match(result.url, /signature=/);
  assert.doesNotMatch(result.url, /top-secret/);
  assert.equal(result.expiresAt, new Date(1_700_000_300_000).toISOString());
});
