const test = require("node:test");
const assert = require("node:assert/strict");

const firebasePath = require.resolve("../backend/config/firebase");
require.cache[firebasePath] = { exports: { FieldValue: { serverTimestamp: () => "SERVER_TIME" } } };
const { levels, levelForPoints, orderCountsForPoints, publicSummary, buildPointEvents } = require("../backend/services/userLevelService");

const doc = (id, data = {}) => ({ id, data: () => data });
const completed = { odemeDurumu: true, durum: "Teslim Edildi", teslimatDogrulandi: true };

test("30 seviye merkezi ve artan eşiklerle tanımlıdır", () => {
  assert.equal(levels.length, 30);
  assert.deepEqual(levels.map((item) => item.minPoints), [...levels].map((item) => item.minPoints).sort((a, b) => a - b));
});
test("yeni kullanıcı seviye 1 olur", () => assert.equal(levelForPoints(0).level, 1));
test("10 puan seviye 2 olur", () => assert.equal(levelForPoints(10).level, 2));
test("15000 puan seviye 30 olur", () => assert.equal(levelForPoints(15000).level, 30));
test("tamamlanmış alışveriş puan olayı üretir", () => assert.equal(buildPointEvents({ uid: "u", purchases: [doc("o1")] })[0].points, 10));
test("tamamlanmış satış 15 ve ilk satış 10 bonus üretir", () => assert.equal(buildPointEvents({ uid: "u", sales: [doc("o1")] }).reduce((n, e) => n + e.points, 0), 25));
test("doğrulanmış yorum 3 puan üretir", () => assert.equal(buildPointEvents({ uid: "u", reviews: [doc("r1")] })[0].points, 3));
test("profil tamamlama 5 puan üretir", () => assert.equal(buildPointEvents({ uid: "u", profileComplete: true })[0].points, 5));
test("aynı referans deterministik event kimliği üretir", () => assert.equal(buildPointEvents({ uid: "u", purchases: [doc("o1")] })[0].id, "purchase_o1"));
test("teslim edilmiş ve ödenmiş sipariş tamamlanmış sayılır", () => assert.equal(orderCountsForPoints(completed), true));
test("iptal sipariş puan sayılmaz", () => assert.equal(orderCountsForPoints({ ...completed, durum: "İptal" }), false));
test("refund edilmiş sipariş puan sayılmaz", () => assert.equal(orderCountsForPoints({ ...completed, refundCompleted: true }), false));
test("aktif claim bulunan sipariş puan sayılmaz", () => assert.equal(orderCountsForPoints({ ...completed, hakEdisBlokeli: true }), false));
test("public özet yalnız unvan ve güven alanlarını döndürür", () => {
  const value = publicSummary({ points: 10, verifiedSeller: true, team: true, email: "secret@example.com" });
  assert.equal(value.title, "Hediye Meraklısı"); assert.equal(value.verifiedSeller, true); assert.equal(value.team, true); assert.equal("email" in value, false);
});
test("eksik eski kullanıcı özeti güvenli başlangıç seviyesine düşer", () => assert.equal(publicSummary({}).title, "Yeni Üye"));
