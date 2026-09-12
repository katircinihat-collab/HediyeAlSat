const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const model = fs.readFileSync("backend/models/walletModel.js", "utf8");
const controller = fs.readFileSync("backend/controllers/walletController.js", "utf8");
const routes = fs.readFileSync("backend/routes/withdrawRoutes.js", "utf8");
const adminUi = fs.readFileSync("src/pages/AdminWithdraw.jsx", "utf8");
const rules = fs.readFileSync("firestore.rules", "utf8");

test("çekim talebi otomatik processing durumuna alınır ve payout yokken paid yapılmaz", () => {
  assert.match(model, /durum:\s*"PROCESSING"/);
  assert.match(model, /payoutStatus:\s*"PROCESSING"/);
  assert.doesNotMatch(model.slice(model.indexOf("async function paraCekmeTalebiOlustur"), model.indexOf("async function paraCekmeOnayla")), /durum:\s*"ODENDI"/);
});

test("transaction guard aynı satıcı için eşzamanlı ikinci talebi engeller", () => {
  assert.match(model, /withdrawalRequestGuards/);
  assert.match(model, /guardSnapshot\.exists && guardSnapshot\.data\(\)\?\.active === true/);
  assert.match(model, /Devam eden bir para çekme talebiniz bulunuyor/);
  assert.match(model, /ownerRequestsSnapshot/);
  assert.match(model, /legacyRequestsSnapshot/);
  assert.match(model, /\["BEKLIYOR", "PROCESSING"\]/);
});

test("backend sahiplik minimum ve çekilebilir bakiye limitlerini transaction içinde doğrular", () => {
  assert.match(model, /Kullanıcı sahipliği doğrulanamadı/);
  assert.match(model, /miktar < 50/);
  assert.match(model, /miktarKurus > balanceKurus/);
});

test("admin ödeme veya onay endpointi yoktur; yalnız gerekçeli iptal endpointi vardır", () => {
  assert.doesNotMatch(routes, /approve\/:id/);
  assert.match(routes, /cancel\/:id/);
  assert.doesNotMatch(adminUi, /Manuel Transferi Doğrula|\/approve\//);
  assert.match(adminUi, /İptal \/ Bloke Et/);
  assert.match(controller, /WITHDRAWAL_CANCELLED/);
});

test("guard ve finansal kayıtlar client erişimine kapalıdır", () => {
  assert.match(rules, /match \/withdrawalRequestGuards\/\{ownerUid\}[\s\S]*?allow read, create, update, delete: if false/);
  assert.match(rules, /match \/withdrawalFinalizations\/\{finalizationId\}[\s\S]*?allow read, create, update, delete: if false/);
});
