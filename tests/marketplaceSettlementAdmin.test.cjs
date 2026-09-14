const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("settlement durum sorgusu yalnız mevcut admin middleware zinciri arkasındadır", () => {
  const routes = fs.readFileSync("backend/routes/adminRoutes.js", "utf8");
  assert.match(routes, /router\.use\(authMiddleware, adminMiddleware\)/);
  assert.match(routes, /orders\/:orderId\/marketplace-settlement\/query/);
  assert.doesNotMatch(routes, /marketplace-settlement\/retry|marketplace-settlement\/pay/);
  const walletRoutes = fs.readFileSync("backend/routes/walletReleaseRoutes.js", "utf8");
  assert.doesNotMatch(walletRoutes, /"\/admin\/release"|"\/admin\/release-all"/);
});

test("admin hata kartı yalnız durum sorgular ve rezerve para bilgisini gösterir", () => {
  const ui = fs.readFileSync("src/components/admin/AdminOrders.jsx", "utf8");
  assert.match(ui, /Para durumu:/);
  assert.match(ui, /Durumu Sorgula/);
  assert.doesNotMatch(ui, /Tekrar Öde/);
});

test("marketplace settlement ayrı banka withdrawal ödemesi üretmez", () => {
  const service = fs.readFileSync("backend/services/iyzicoMarketplaceSettlementService.js", "utf8");
  assert.match(service, /client\.approval\.create/);
  assert.match(service, /reportingPayoutCompleted/);
  assert.match(service, /reportingBouncedPayments/);
  assert.doesNotMatch(service, /paraCekmeTalepleri|withdrawalPending|iban/);
});
