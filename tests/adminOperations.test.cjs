const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const controller = fs.readFileSync("backend/controllers/adminOperationsController.js", "utf8");
const routes = fs.readFileSync("backend/routes/adminRoutes.js", "utf8");
const middleware = fs.readFileSync("backend/middleware/adminMiddleware.js", "utf8");
const auditService = fs.readFileSync("backend/services/adminAuditService.js", "utf8");
const listingController = fs.readFileSync("backend/controllers/adminListingController.js", "utf8");
const sponsorController = fs.readFileSync("backend/controllers/sponsorStoreController.js", "utf8");
const rules = fs.readFileSync("firestore.rules", "utf8");

test("admin operasyon API'leri auth ve gerçek admin middleware arkasındadır", () => {
  assert.match(routes, /router\.use\(authMiddleware, adminMiddleware\)/);
  assert.match(middleware, /collection\("admins"\)|collection\("admins"\)/);
  assert.match(routes, /router\.get\("\/overview"/);
  assert.match(routes, /router\.get\("\/users"/);
  assert.match(routes, /router\.patch\("\/users\/:uid\/status"/);
});

test("kullanıcı listesi sayfalı ve hassas alan içermeyen Auth görünümüdür", () => {
  assert.match(controller, /const MAX_USERS = 50/);
  assert.match(controller, /admin\.auth\(\)\.listUsers\(MAX_USERS, pageToken\)/);
  assert.doesNotMatch(controller, /identityNumber|subMerchantKey|iban|passwordHash|passwordSalt/);
});

test("admin kendisini pasifleştiremez ve durum değişikliği audit edilir", () => {
  assert.match(controller, /uid === req\.user\.uid/);
  assert.match(controller, /admin\.auth\(\)\.updateUser\(uid, \{ disabled \}\)/);
  assert.match(controller, /USER_DISABLED/);
  assert.match(controller, /collection\("admins"\)\.doc\(targetUser\.email\)/);
  assert.match(controller, /revokeRefreshTokens\(uid\)/);
  assert.doesNotMatch(middleware, /error:\s*err\.message/);
});

test("kritik ilan mağaza ve sponsor işlemleri güvenli audit izi üretir", () => {
  assert.match(auditService, /adminAuditLogs/);
  assert.match(listingController, /LISTING_APPROVED/);
  assert.match(listingController, /LISTING_REJECTED/);
  assert.match(listingController, /STORE_DISABLED/);
  assert.match(sponsorController, /SPONSOR_APPLICATION_APPROVED/);
  assert.match(rules, /match \/adminAuditLogs\/\{logId\}[\s\S]*allow read, create, update, delete: if false/);
});

test("dashboard sahte KPI üretmeden authoritative koleksiyonları aggregate eder", () => {
  for (const collection of ["siparisler", "platformRevenueEvents", "wallets", "orderClaims", "sponsorBasvurular", "listingPromotions", "odemeler"]) {
    assert.match(controller, new RegExp(`collection\\("${collection}"\\)`));
  }
  assert.match(controller, /AggregateField\.sum/);
  assert.match(controller, /isListingPublished/);
});
