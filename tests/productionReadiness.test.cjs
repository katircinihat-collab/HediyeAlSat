const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("production kartları dış placeholder servisine bağımlı değildir", () => {
  for (const file of ["src/components/ProductCard.jsx", "src/pages/Admin.jsx", "src/pages/Kiralik.jsx"]) {
    assert.doesNotMatch(read(file), /via\.placeholder\.com/);
    assert.match(read(file), /productFallback/);
  }
});

test("ana sayfa doğrulanmamış pazarlama KPI rakamları göstermez", () => {
  const stats = read("src/components/Stats.jsx");
  assert.doesNotMatch(stats, /25\.000\+|1\.500\+|15\.000\+|%98/);
  assert.doesNotMatch(read("src/pages/Home.jsx"), /binlerce hediye ilanı/i);
  assert.doesNotMatch(read("src/components/Footer.jsx"), /binlerce satıcı|on binlerce ürün/i);
  assert.doesNotMatch(read("src/components/Footer.jsx"), /href="#"/);
});

test("ağır admin ve seller sayfaları route bazında lazy yüklenir", () => {
  const app = read("src/App.jsx");
  assert.match(app, /const Seller = lazy\(\(\) => import\("\.\/pages\/Seller"\)\)/);
  assert.match(app, /const Admin = lazy\(\(\) => import\("\.\/pages\/Admin"\)\)/);
  assert.match(app, /<Suspense fallback=/);
});

test("liste ve detay canonical impression helperını paylaşır", () => {
  assert.match(read("src/components/ProductCard.jsx"), /getListingImpressionCount\(ilan\)/);
  assert.match(read("src/pages/DetailPage.jsx"), /getListingImpressionCount\(ilan\)/);
});
