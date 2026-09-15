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

test("satıcı hazırlanan sipariş sayacını dashboarda aktarır", () => {
  assert.match(
    seller,
    /s\.durum\s*===\s*"Hazırlanıyor"/
  );

  assert.match(
    seller,
    /setHazirlanan\(hazirlananSayisi\)/
  );

  assert.match(
    seller,
    /hazirlanan=\{hazirlanan\}/
  );
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
    /hareket\.settlementMode\s*===\s*"IYZICO_MARKETPLACE"/
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