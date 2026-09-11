const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("müşteri yalnız admin onayından sonra ödeme aksiyonu görür", () => {
  const source = read("src/pages/SponsorApplication.jsx");
  assert.match(source, /item\.status === "APPROVED_PAYMENT_PENDING"/);
  assert.match(source, /Ödemeyi Tamamla/);
  assert.match(source, /Başvuruyu İncelemeye Gönder/);
  assert.doesNotMatch(source, /setPaket/);
});

test("admin bronze gold diamond seçebilir ve reddedebilir", () => {
  const source = read("src/components/admin/AdminSponsorApplications.jsx");
  assert.match(source, /packages\.packages\.map/);
  assert.match(source, /"approve"/);
  assert.match(source, /"reject"/);
});

test("sponsor payment LISTING olup normal sepet temizleme koşulundan ayrıdır", () => {
  const source = read("backend/services/paymentService.js");
  assert.match(source, /trustedPaymentGroup = "LISTING"/);
  assert.match(source, /!payment\?\.listingBoost && !payment\?\.sponsor/);
  const exported = source.slice(source.lastIndexOf("module.exports"));
  assert.doesNotMatch(exported, /paymentCallback,/);
  assert.match(exported, /securePaymentCallback/);
});

test("callback tam platform gelirini ve deterministic sponsoredContent kaydını yazar", () => {
  const source = read("backend/services/paymentCallbackService.js");
  assert.match(source, /platformRevenueEvents/);
  assert.match(source, /sponsor_store_\$\{paymentId\}/);
  assert.match(source, /sponsor_store_\$\{storeId\}/);
  assert.match(source, /amount: selected\.price/);
  assert.match(source, /existingEnd > finalizedAt\.getTime\(\)/);
});

test("rules sponsor state machine alanlarını ve sponsoredContent yazımını client'a kapatır", () => {
  const rules = read("firestore.rules");
  assert.match(rules, /match \/sponsorBasvurular\/\{applicationId\}[\s\S]*allow create, update, delete: if false/);
  assert.match(rules, /match \/sponsoredContent\/\{sponsorId\}[\s\S]*allow create, update, delete: if false/);
  assert.match(rules, /match \/sponsorStoreGuards\/\{storeId\}[\s\S]*allow read, create, update, delete: if false/);
});
