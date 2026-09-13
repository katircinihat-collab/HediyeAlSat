const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const seller = fs.readFileSync(path.join(root, "src/pages/Seller.jsx"), "utf8");
const finance = fs.readFileSync(path.join(root, "src/components/seller/SellerFinance.jsx"), "utf8");

test("satıcı hazırlanan sipariş sayacını dashboarda aktarır", () => {
  assert.match(seller, /s\.durum==="Hazırlanıyor"/);
  assert.match(seller, /setHazirlanan\(hazirlananSayisi\)/);
  assert.match(seller, /hazirlanan=\{hazirlanan\}/);
});

test("tekrarlı satış istatistikleri kaldırılır ve marketplace ile legacy bakiye ayrılır", () => {
  assert.doesNotMatch(seller, /SellerStatistics/);
  assert.match(finance, /Marketplace Satış Özeti/);
  assert.match(finance, /legacy\/iç cüzdandaki çekilebilir bakiye değildir/);
});
