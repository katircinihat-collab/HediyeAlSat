import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { claimOptionsForOrder, isDigitalOrder, normalizeOrderStatus, orderTimeline, sellerActionSummary, sellerNextAction } from "../src/utils/orderLifecycle.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const now = new Date("2026-09-14T12:00:00.000Z");

test("legacy sipariş durumları tek canonical kullanıcı diline normalize edilir", () => {
  assert.equal(normalizeOrderStatus("Kargoya Verildi"), "Kargoda");
  assert.equal(normalizeOrderStatus("Teslim"), "Teslim Edildi");
  assert.equal(normalizeOrderStatus("DISPUTE_PENDING"), "İtiraz İnceleniyor");
});

test("fiziksel ve dijital siparişler farklı aksiyon ve timeline kullanır", () => {
  const digital = { urunTipi: "dijital", odemeDurumu: true, durum: "Ödendi" };
  assert.equal(isDigitalOrder(digital), true);
  assert.equal(sellerNextAction(digital).kind, "WAIT");
  assert.deepEqual(orderTimeline(digital).map((step) => step.label), ["Sipariş alındı", "Dijital teslimat", "48 saat kontrol", "Tamamlandı"]);
  assert.equal(sellerNextAction({ durum: "Ödendi" }).kind, "PREPARE");
  assert.equal(sellerNextAction({ durum: "Hazırlanıyor" }).kind, "SHIP");
});

test("itiraz ve iade yalnız doğru 48 saat penceresinde görünür", () => {
  const delivered = { odemeDurumu: true, durum: "Teslim", teslimatDogrulandi: true };
  assert.deepEqual(claimOptionsForOrder({ ...delivered, hakEdisBlokeBitis: new Date(now.getTime() + 1000) }, now), ["iade", "itiraz"]);
  assert.deepEqual(claimOptionsForOrder({ ...delivered, hakEdisBlokeBitis: new Date(now.getTime() - 1) }, now), []);
  assert.deepEqual(claimOptionsForOrder({ ...delivered, urunTipi: "dijital", hakEdisBlokeBitis: new Date(now.getTime() + 1000) }, now), ["itiraz"]);
});

test("satıcı yapılacaklar özeti öncelikli operasyonları ayırır", () => {
  const summary = sellerActionSummary([
    { id: "a", durum: "Ödendi" },
    { id: "b", durum: "Hazırlanıyor" },
    { id: "c", durum: "Kargoda" },
    { id: "d", durum: "Teslim", hakEdisBlokeli: true }
  ]);
  assert.equal(summary.prepare.length, 1);
  assert.equal(summary.ship.length, 1);
  assert.equal(summary.trackingMissing.length, 1);
  assert.equal(summary.claims.length, 1);
});

test("teslim sonrası satıcıya 48 saat, blokaj ve aktarıma hazır durumları açık gösterilir", () => {
  const future = { durum: "Teslim", teslimatDogrulandi: true, hakEdisBlokeBitis: new Date(Date.now() + 3600000) };
  assert.match(sellerNextAction(future).label, /48 saatlik kontrol süresi başladı/);
  assert.match(sellerNextAction({ ...future, hakEdisBlokeli: true }).label, /itiraz incelemesi/);
  assert.match(sellerNextAction({ ...future, hakEdisBlokeBitis: new Date(Date.now() - 1) }).label, /aktarım sürecine hazır/);
});

test("teslim onayı response'u alıcı detayına güvenilir 48 saat zamanlarını döndürür", () => {
  const controller = read("backend/controllers/orderStatusController.js");
  assert.match(controller, /teslimatDogrulamaTarihi: result\.teslimatDogrulamaTarihi/);
  assert.match(controller, /hakEdisBlokeBitis: result\.hakEdisBlokeBitis/);
});

test("sipariş ekranları güvenli state ve gerçek aksiyonları kullanır", () => {
  const list = read("src/pages/MyOrders.jsx");
  const detail = read("src/pages/OrderDetail.jsx");
  const seller = read("src/components/seller/SellerOrders.jsx");
  assert.match(list, /Siparişleriniz yükleniyor/);
  assert.match(list, /Siparişleriniz şu anda alınamıyor/);
  assert.match(list, /Henüz siparişiniz bulunmuyor/);
  assert.match(list, /<OrderTimeline order=\{siparis\}/);
  assert.doesNotMatch(detail, /PDF oluşturulacak|Değerlendirme sayfası açılacak/);
  assert.match(detail, /!digital&&canonicalDurum==="Kargoda"/);
  assert.match(seller, /Yapman Gerekenler/);
  assert.match(seller, /!digital && canonicalDurum === "Hazırlanıyor"/);
});

test("Siparişlerim auth restore'u bekler ve modern/legacy kullanıcı siparişlerini index gerektirmeden birleştirir", () => {
  const list = read("src/pages/MyOrders.jsx");
  assert.match(list, /onAuthStateChanged\(auth/);
  assert.match(list, /where\("aliciUid", "==", user\.uid\)/);
  assert.match(list, /where\("alici", "==", user\.email\)/);
  assert.match(list, /where\("kullanici", "==", user\.email\)/);
  assert.doesNotMatch(list, /orderBy\("tarih"/);
  assert.match(list, /reduce\(\(unique, order\) => unique\.set\(order\.id, order\), new Map\(\)\)/);
  assert.match(list, /\.sort\(\(left, right\) => timestamp\(right\) - timestamp\(left\)\)/);
  assert.match(list, /unsubscribeAuth\(\)/);
  assert.match(list, /unsubscribeOrders\.forEach\(\(unsubscribe\) => unsubscribe\(\)\)/);
});
