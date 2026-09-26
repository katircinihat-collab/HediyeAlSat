const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const seller = fs.readFileSync(
  path.join(root, "src/pages/Seller.jsx"),
  "utf8"
);

const finance = fs.readFileSync(
  path.join(root, "src/components/seller/SellerFinance.jsx"),
  "utf8"
);
const sellerOrders = fs.readFileSync(path.join(root, "src/components/seller/SellerOrders.jsx"), "utf8");

test("satıcı paneli sipariş kaynağını paylaşır ve yönetim ekranını kopyalamaz", () => {
  assert.match(seller, /useSellerOrders\(\)/);
  assert.match(seller, /sellerDashboard\(orders, data.products\)/);
  assert.match(seller, /metrics.preparing/);
  assert.match(seller, /to="\/satici-siparisleri"/);
  assert.doesNotMatch(seller, /<SellerOrders/);
});

test("tekrarlı satış istatistikleri kaldırılır ve marketplace ile legacy bakiye ayrılır", () => {
  assert.doesNotMatch(
    seller,
    /SellerStatistics/
  );

  assert.match(
    finance,
    /Marketplace Satış Özeti/
  );

  assert.match(
    seller,
    /splitSellerMovements\(data.movements\)/
  );

  assert.match(
    finance,
    /eski HediyeAlSat\s*cüzdan bakiyesinden ayrıdır/
  );

  assert.match(
    finance,
    /Banka aktarımı iyzico tarafından\s*tamamlanmadan bir kazanç "Ödendi" olarak gösterilmez/
  );
});
test("marketplace kazanç özeti iade ve iptal edilen satışları hariç tutar", () => {
  assert.match(
    finance,
    /realizedMarketplaceHareketleri/
  );

  assert.match(
    finance,
    /isRealizedMarketplaceMovement/
  );

  assert.match(
    finance,
    /refundProviderStatus/
  );

  assert.match(
    finance,
    /refundAccountingCompleted/
  );

  assert.match(
    finance,
    /refundCompleted/
  );

  assert.match(
    finance,
    /INVALID_FINANCIAL_STATUSES\.has\(orderStatus\)/
  );

  assert.match(
    finance,
    /realizedMarketplaceHareketleri\.reduce/
  );

  assert.doesNotMatch(
    finance,
    /0\.08/
  );
});

test("satıcı sipariş aksiyonları fiziksel yaşam döngüsüne göre tekilleştirilir", () => {
  assert.match(sellerOrders, /canonicalDurum === "Ödendi"/);
  assert.match(sellerOrders, /canonicalDurum === "Hazırlanıyor"/);
  assert.match(sellerOrders, /!digital && canonicalDurum/);
  assert.doesNotMatch(sellerOrders, /canonicalDurum === "Kargoda"[\s\S]{0,200}Siparişi Hazırla/);
});

test("satıcı ekranı teknik Firestore sipariş kimliğini fallback olarak göstermez", () => {
  assert.doesNotMatch(sellerOrders, /siparis\.siparisNo \|\| siparis\.id/);
  assert.match(sellerOrders, /siparis\.siparisNo \|\| "Sipariş"/);
});
