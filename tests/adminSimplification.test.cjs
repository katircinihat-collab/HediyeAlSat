const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const operations = fs.readFileSync("src/components/admin/AdminOperations.jsx", "utf8");
const page = fs.readFileSync("src/pages/Admin.jsx", "utf8");
const archive = fs.readFileSync("src/components/admin/AdminArchive.jsx", "utf8");
const api = fs.readFileSync("src/config/adminApi.js", "utf8");
const exceptions = fs.readFileSync("src/components/admin/AdminExceptions.jsx", "utf8");

test("sıfır istisnada Her şey yolunda, sorunlarda müdahale sayısı gösterilir", () => {
  assert.match(operations, /Her şey yolunda/);
  assert.match(operations, /işlem müdahale bekliyor/);
  assert.match(operations, /Şu anda müdahale gerektiren işlem bulunmuyor/);
});

test("dashboard backend hatası teknik ayrıntıyı varsayılan ekranda göstermez", () => {
  assert.match(operations, /Dashboard bilgileri şu anda alınamıyor/);
  assert.match(operations, /Birkaç dakika sonra tekrar deneyin/);
  assert.doesNotMatch(operations, /Dashboard verisi alınamadı:/);
  assert.match(api, /data\.message \|\| data\.error/);
});

test("ana navigasyon yedi sade bölümden oluşur ve büyük listeler koşullu açılır", () => {
  for (const label of ["Dashboard", "İşlem Gerektirenler", "Siparişler", "Kullanıcılar", "İlanlar", "Finans", "Arşiv"]) assert.match(page, new RegExp(label));
  assert.match(page, /activeSection === "orders"/);
  assert.match(page, /activeSection === "users"/);
  assert.match(page, /activeSection === "listings"/);
});

test("marketplace settlement ile legacy iç bakiye görsel olarak ayrıdır", () => {
  assert.match(page, /Marketplace Settlement/);
  assert.match(page, /Legacy \/ İç Bakiye/);
  assert.doesNotMatch(page, /Tekrar Öde/);
});

test("aktif settlement kartı para çekme değil satıcı settlement sorunu olarak adlandırılır", () => {
  assert.match(exceptions, /Satıcı Ödeme \/ Settlement Sorunu/);
  assert.doesNotMatch(exceptions, /Para Çekme Sorunu/);
  assert.match(exceptions, /Durumu Sorgula/);
});

test("arşiv yalnız resolved ve archived endpoint görünümünü kullanır", () => {
  assert.match(archive, /action-required\?view=archive/);
  assert.doesNotMatch(archive, /\?view=active/);
});

test("trafik ışığı sağlık satırlarında marketplace settlement bulunur", () => {
  for (const label of ["Ödemeler", "Sipariş Akışı", "48 Saat Hakediş", "Marketplace Settlement", "Zamanlanmış Bakım", "Backend"]) assert.match(operations, new RegExp(label));
  assert.match(operations, /✅ Normal/);
  assert.match(operations, /🟠 Kontrol/);
  assert.match(operations, /🔴 Sorun/);
});
