const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const controllerSource = fs.readFileSync("backend/controllers/adminListingController.js", "utf8");
const routes = fs.readFileSync("backend/routes/adminRoutes.js", "utf8");
const adminPage = fs.readFileSync("src/pages/Admin.jsx", "utf8");
const detailPage = fs.readFileSync("src/pages/AdminDetail.jsx", "utf8");
const editPage = fs.readFileSync("src/pages/EditListing.jsx", "utf8");
const availability = require("../backend/utils/listingAvailability.js");
const { _test } = require("../backend/controllers/adminListingController.js");

test("Detay doğru admin ilan routeuna gider ve bulunamayan ilan boş ekranda kalmaz", () => {
  assert.match(adminPage, /to=\{`\/admin\/\$\{ilan\.id\}`\}>Detay/);
  assert.match(detailPage, /setError\("İlan bulunamadı\."\)/);
  assert.match(detailPage, /error \|\| "Yükleniyor\.\.\."/);
});
test("yayından kaldırma canonical kalıcı state üretir, yeniden yayın yalnız onaylı ilana açıktır", () => {
  const closed = availability.buildUnpublishedListingState({ timestamp: "now", adminUid: "admin" });
  assert.deepEqual({ aktif: closed.aktif, yayinda: closed.yayinda, durum: closed.durum }, {
    aktif: false, yayinda: false, durum: "Yayından Kaldırıldı"
  });
  assert.match(controllerSource, /listing\.onay !== true[\s\S]*LISTING_NOT_APPROVED/);
  assert.throws(
    () => availability.buildPublishedListingState({ listing: { onay: true, stok: 0 }, timestamp: "now", adminUid: "admin" }),
    /stoğunu girin/
  );
});

test("admin düzenleme endpointi izinli alanları doğrular ve kalıcı update kullanır", () => {
  const update = _test.buildAdminEditUpdate(
    { kategori: "Hediyelik Ürünler", resimler: [] },
    { baslik: "Yeni başlık", fiyat: "125", kategori: "Hediyelik Ürünler", aciklama: "Açıklama", marka: "M", renk: "K" },
    "now",
    "admin"
  );
  assert.equal(update.fiyat, 125);
  assert.equal(update.baslik, "Yeni başlık");
  assert.throws(() => _test.buildAdminEditUpdate({}, { baslik: "X", fiyat: 0 }, "now", "admin"), /Fiyat/);
  assert.match(routes, /router\.patch\("\/listings\/:id", adminListingController\.duzenle\)/);
  assert.match(editPage, /adminApi\(`\/listings\/\$\{id\}`/);
});

test("ücretsiz öne çıkarma trend, editör seçimi oneCikan alanını idempotent backend endpointiyle değiştirir", () => {
  assert.match(controllerSource, /const ADMIN_FLAGS = new Set\(\[[\s\S]*"oneCikan"[\s\S]*"trend"/);
  assert.match(controllerSource, /deger && !isListingPublished\(listing\)/);
  assert.match(controllerSource, /listing\[alan\] === deger[\s\S]*changed: false/);
  assert.match(adminPage, /"trend",[\s\S]*!ilan\.trend/);
  assert.match(adminPage, /"oneCikan",[\s\S]*!ilan\.oneCikan/);
  assert.doesNotMatch(controllerSource, /boostActive\s*:/);
});

test("silme hard delete yerine canonical soft archive yapar ve tekrar çağrı finansal geçmişi etkilemez", () => {
  const archived = availability.buildArchivedListingState({ timestamp: "now", adminUid: "admin" });
  assert.equal(archived.silindi, true);
  assert.equal(archived.onay, false);
  assert.equal(archived.aktif, false);
  assert.equal(archived.trend, false);
  assert.doesNotMatch(controllerSource, /await ref\.delete\(\)/);
  assert.match(controllerSource, /silindi === true[\s\S]*changed: false, archived: true/);
  assert.match(adminPage, /Sipariş ve finans geçmişi korunacaktır/);
});

test("bütün ilan mutasyonları auth ve server-side admin middleware arkasındadır", () => {
  assert.ok(routes.indexOf("router.use(authMiddleware, adminMiddleware)") < routes.indexOf("/listings/:id/approve"));
  assert.match(routes, /router\.get\("\/listings", adminListingController\.list\)/);
  assert.match(controllerSource, /collection\("ilanlar"\)\.limit\(200\)\.get\(\)/);
  for (const action of ["approve", "reject", "flags", "stock", "publication"]) {
    assert.match(routes, new RegExp(`/listings/:id/${action}`));
  }
});

test("admin ilan listesi client Firestore yerine yetkili backend üzerinden yüklenir ve hata yutulmaz", () => {
  assert.match(adminPage, /adminApi\("\/listings"\)/);
  assert.match(adminPage, /setIlanHatasi\(error\.message/);
  assert.match(adminPage, /İlanlar yükleniyor/);
  assert.doesNotMatch(adminPage, /collection\(db, "ilanlar"\)/);
});

test("UI duplicate clicki kilitler, işlem sırasında disable eder, hatayı gösterir ve listeyi yeniler", () => {
  assert.match(adminPage, /ilanIslemKilidi\.current\.has\(id\)/);
  assert.match(adminPage, /await action\(\);[\s\S]*await getir\(\)/);
  assert.match(adminPage, /role="alert"/);
  assert.match(adminPage, /disabled=\{ilanIslemi===ilan\.id/);
  assert.match(editPage, /if\(kaydediliyor\) return/);
  assert.match(editPage, /Kaydediliyor\.\.\./);
});
