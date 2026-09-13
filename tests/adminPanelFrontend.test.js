import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminPage = readFileSync("src/pages/Admin.jsx", "utf8");
const operations = readFileSync("src/components/admin/AdminOperations.jsx", "utf8");
const css = readFileSync("src/styles/components/admin-operations.css", "utf8");

test("admin panelinde gerçek dashboard kullanıcı ve audit ekranları bulunur", () => {
  assert.match(adminPage, /<AdminOperationsOverview/);
  assert.match(adminPage, /<AdminUsers/);
  assert.match(adminPage, /<AdminAuditLog/);
  assert.match(operations, /adminApi\("\/overview"\)/);
  assert.match(operations, /Sonraki 50 kullanıcıyı yükle/);
});

test("otonom kontrol merkezi yalnız durum sağlık özet ve arşivlenebilir istisnaları öne çıkarır", () => {
  const orders = readFileSync("src/components/admin/AdminOrders.jsx", "utf8");
  assert.match(operations, /Her şey yolunda/);
  assert.match(operations, /Sistem Sağlığı/);
  assert.match(operations, /Bugünün Özeti/);
  assert.match(orders, /Geçmiş \/ Arşiv/);
  assert.match(orders, /view=archive/);
});

test("ilan yönetimi arama filtre detay ve red aksiyonlarını korur", () => {
  assert.match(adminPage, /ilanArama/);
  assert.match(adminPage, /ilanFiltre/);
  assert.match(adminPage, /to=\{`\/admin\/\$\{ilan\.id\}`\}/);
  assert.match(adminPage, /\/listings\/\$\{ilan\.id\}\/reject/);
});

test("admin tabloları tablet ve mobilde taşmadan kullanılabilir", () => {
  assert.match(css, /overflow:\s*auto/);
  assert.match(css, /@media \(max-width:900px\)/);
  assert.match(css, /@media \(max-width:520px\)/);
});

test("sponsor admin aksiyonları JSON gönderir, onay ister ve duplicate çağrıyı kilitler", () => {
  const sponsor = readFileSync("src/components/admin/AdminSponsorApplications.jsx", "utf8");
  assert.match(sponsor, /"Content-Type": "application\/json"/);
  assert.match(sponsor, /window\.confirm/);
  assert.match(sponsor, /actionLock\.current\.has\(id\)/);
});

test("işlem gereken sipariş doğru Siparişler sekmesinde detay modalını açar", () => {
  const exceptions = readFileSync("src/components/admin/AdminExceptions.jsx", "utf8");
  const orders = readFileSync("src/components/admin/AdminOrders.jsx", "utf8");
  assert.match(adminPage, /onInspectOrder=\{\(orderId\)/);
  assert.match(exceptions, /onInspectOrder\?\.\(item\.orderId\)/);
  assert.match(orders, /initialOrderId/);
  assert.match(orders, /openDetail\(initialOrderId\)/);
  assert.doesNotMatch(exceptions, /href=\{`#order-/);
});

test("kullanıcı ve mağaza aksiyonları çift tıklama ve modal kapanışını güvenli yönetir", () => {
  const stores = readFileSync("src/components/admin/AdminStores.jsx", "utf8");
  assert.match(operations, /actionLock\.current\.has\(user\.uid\)/);
  assert.match(stores, /event\.target === event\.currentTarget/);
});
