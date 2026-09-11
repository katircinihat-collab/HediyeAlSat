const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { lifecycleView, actionReasons, buildTimeline } = require("../backend/services/orderLifecycleService");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const now = new Date("2026-09-11T12:00:00.000Z");

test("normal ödenmiş sipariş işlem gerektirenlere düşmez", () => {
  const order = { odemeDurumu: true, paymentId: "pay-1", durum: "Hazırlanıyor" };
  assert.deepEqual(actionReasons(order, now), []);
  assert.equal(lifecycleView(order, now).stage, "preparing");
});

test("teslimat 48 saat dolmadan bekler, sorunsuz dolunca hakediş hazırdır", () => {
  const base = { odemeDurumu: true, paymentId: "pay-1", durum: "Teslim Edildi", teslimatDogrulandi: true };
  assert.equal(lifecycleView({ ...base, hakEdisBlokeBitis: new Date(now.getTime() + 1) }, now).stage, "protection_period");
  assert.equal(lifecycleView({ ...base, hakEdisBlokeBitis: now }, now).stage, "earning_ready");
});

test("aktif claim release'i durdurur ve admin incelemesine düşer", () => {
  const order = { odemeDurumu: true, paymentId: "pay-1", durum: "Teslim Edildi", teslimatDogrulandi: true, hakEdisBlokeBitis: now, hakEdisBlokeli: true };
  assert.equal(lifecycleView(order, now).stage, "manual_review");
  assert.ok(actionReasons(order, now).includes("OPEN_CLAIM_OR_DISPUTE"));
});

test("dijital sipariş fiziksel kargo state'indeyse anomali üretir", () => {
  assert.ok(actionReasons({ odemeDurumu: true, paymentId: "p", urunTipi: "dijital", durum: "Kargoda" }, now).includes("DIGITAL_SHIPPING_STATE"));
});

test("gecikmiş hakediş bakım penceresinden sonra incelemeye düşer", () => {
  const order = { odemeDurumu: true, paymentId: "p", durum: "Teslim Edildi", teslimatDogrulandi: true, hakEdisBlokeBitis: new Date(now.getTime() - 3 * 3600000) };
  assert.ok(actionReasons(order, now).includes("EARNING_RELEASE_OVERDUE"));
});

test("timeline mevcut canonical ve legacy alanlardan üretilir", () => {
  const timeline = buildTimeline({ odemeDurumu: true, durum: "Kargoya Verildi", kargoTarihi: now }, now);
  assert.equal(timeline.find((item) => item.key === "shipping").complete, true);
  assert.equal(timeline.length, 7);
});

test("admin order API middleware arkasında, cursor pagination ve limitlidir", () => {
  const routes = read("backend/routes/adminRoutes.js");
  const controller = read("backend/controllers/adminOrderController.js");
  assert.match(routes, /router\.use\(authMiddleware, adminMiddleware\)/);
  assert.match(routes, /router\.get\("\/orders"/);
  assert.match(routes, /router\.get\("\/orders\/action-required"/);
  assert.match(controller, /orderBy\("tarih", "desc"\).*orderBy\(admin\.firestore\.FieldPath\.documentId\(\), "desc"\)/s);
  assert.match(controller, /limit\(SCAN_LIMIT\)/);
  assert.equal(controller.includes("identityNumber"), false);
});

test("admin sipariş UI timeline, filtre ve işlem gereken kartını gösterir", () => {
  const ui = read("src/components/admin/AdminOrders.jsx");
  const adminPage = read("src/pages/Admin.jsx");
  assert.match(ui, /İşlem Gerektirenler/);
  assert.match(ui, /admin-order-timeline/);
  assert.match(ui, /Sonraki siparişleri yükle/);
  assert.match(adminPage, /<AdminActionRequired \/>/);
  assert.match(adminPage, /<AdminOrders \/>/);
});

test("sipariş cursor sorgusu gereksiz composite index üretmez", () => {
  const indexes = JSON.parse(read("firestore.indexes.json"));
  const found = indexes.indexes.find((index) => index.collectionGroup === "siparisler");
  assert.equal(found, undefined);
});
