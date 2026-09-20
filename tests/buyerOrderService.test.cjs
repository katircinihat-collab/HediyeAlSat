const test = require("node:test");
const assert = require("node:assert/strict");
const { buyerOwnsOrder, safeBuyerOrder, listBuyerOrders } = require("../backend/services/buyerOrderService");

function fakeFirestore(rows) {
  return { collection() { return { where(field, operator, value) {
    assert.equal(operator, "==");
    return { async get() { return { docs: rows.filter((row) => row.data[field] === value).map((row) => ({ id: row.id, data: () => row.data })) }; } };
  } }; } };
}

const user = { uid: "buyer-1", email: "buyer@example.com" };

test("buyer sahipliği modern UID, email ve legacy email ile doğrulanır", () => {
  assert.equal(buyerOwnsOrder({ aliciUid: user.uid }, user), true);
  assert.equal(buyerOwnsOrder({ alici: user.email }, user), true);
  assert.equal(buyerOwnsOrder({ kullanici: user.email }, user), true);
  assert.equal(buyerOwnsOrder({ aliciUid: "other", alici: "other@example.com" }, user), false);
});

test("Kura buyer projection receiver adresini ve teknik ödeme alanlarını sızdırmaz", () => {
  const result = safeBuyerOrder("order-1", { isRaffleGift: true, raffleRecipientDisplayName: "Ayşe T.", adres: "Gizli", telefon: "0555", il: "İstanbul", ilce: "Kadıköy", paymentTransactionId: "technical", recipientUid: "receiver" });
  assert.equal(result.raffleRecipientDisplayName, "Ayşe T.");
  for (const key of ["adres", "telefon", "il", "ilce", "paymentTransactionId", "recipientUid"]) assert.equal(key in result, false);
});

test("buyer endpoint modern, email ve legacy siparişleri birleştirir; başkasını dışlar", async () => {
  const rows = [
    { id: "modern", data: { aliciUid: user.uid, alici: user.email, tarih: new Date("2026-09-20") } },
    { id: "legacy", data: { kullanici: user.email, tarih: new Date("2026-09-19") } },
    { id: "other", data: { aliciUid: "other", alici: "other@example.com", kullanici: "other@example.com" } }
  ];
  const result = await listBuyerOrders(user, fakeFirestore(rows));
  assert.deepEqual(result.map((order) => order.id), ["modern", "legacy"]);
});

test("buyer orders route auth middleware ile korunur", () => {
  const fs = require("node:fs");
  const routes = fs.readFileSync("backend/routes/orderStatusRoutes.js", "utf8");
  assert.match(routes, /router\.get\("\/mine", authMiddleware, orderStatusController\.listBuyerOrders\)/);
});
