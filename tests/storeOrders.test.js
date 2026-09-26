import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { matchesStoreOrder, orderDate, storeOrderView, summarizeStoreOrders, isSellerArchivedAttempt } from "../src/utils/storeOrders.js";

test("payment attempts do not clutter operations; legacy deliveries remain visible", () => {
  const attempt = storeOrderView({ odemeDurumu: false, durum: "Ödeme Bekleniyor", toplam: 50 });
  assert.equal(matchesStoreOrder(attempt, "", "Tümü"), false);
  assert.equal(matchesStoreOrder(attempt, "", "Ödeme Denemeleri"), true);
  assert.equal(matchesStoreOrder(attempt, "", "Başarısız Ödemeler"), false);
  assert.equal(matchesStoreOrder({ ...attempt, cleanupEligible: true }, "", "Başarısız Ödemeler"), true);
  const archived = { odemeDurumu: false, durum: "Ödeme Bekleniyor", sellerAttemptArchived: true };
  assert.equal(isSellerArchivedAttempt(archived), true);
  assert.equal(isSellerArchivedAttempt({ ...archived, odemeDurumu: true }), false);
  assert.equal(isSellerArchivedAttempt({ ...archived, durum: "Teslim Edildi" }), false);
  assert.equal(isSellerArchivedAttempt({ ...archived, settlementStatus: "PROTECTED" }), false);
  assert.equal(matchesStoreOrder(storeOrderView({ durum: "Teslim Edildi" }), "", "Tümü"), true);
  assert.equal(summarizeStoreOrders([attempt, storeOrderView({ toplam: 200, odemeDurumu: true })]).revenue, 200);
});

test("Mağazam modern ve legacy durumları ortak lifecycle üzerinden eşler", () => {
  for (const [status, group, step] of [["Bekliyor", "Yeni", 0], ["Hazırlanıyor", "Hazırlanıyor", 1], ["Kargoya Verildi", "Kargoda", 2], ["Teslim", "Teslim", 3]]) {
    const view = storeOrderView({ durum: status });
    assert.equal(view.group, group); assert.equal(view.step, step);
  }
});
test("yalnız ödeme onaylı fiziksel sipariş için sıradaki aksiyon sunulur", () => {
  assert.equal(storeOrderView({ durum: "Ödendi" }).action.kind, "WAIT");
  assert.equal(storeOrderView({ durum: "Ödendi", odemeDurumu: true }).action.kind, "PREPARE");
  assert.equal(storeOrderView({ durum: "Hazırlanıyor", odemeDurumu: true }).action.kind, "SHIP");
  assert.equal(storeOrderView({ durum: "Kargoda", odemeDurumu: true, kargoNo: "123" }).action.kind, "WAIT");
});
test("dijital teslimatın tüm mevcut bayrakları fiziksel aksiyonu engeller", () => {
  for (const flags of [{ urunTipi: "dijital" }, { fizikselKargo: false }, { dijitalTeslimat: true }, { teslimatTipi: "dijital" }]) {
    const view = storeOrderView({ ...flags, durum: "Hazırlanıyor", odemeDurumu: true });
    assert.equal(view.digital, true); assert.equal(view.action.kind, "WAIT");
  }
});
test("ciro yalnız gerçek ödeme onaylı brüt toplam; bozuk tutarlar NaN üretmez", () => {
  const summary = summarizeStoreOrders([
    { toplam: 250, odemeDurumu: true, durum: "Hazırlanıyor" },
    { toplam: "120", odemeDurumu: true, durum: "Kargoya Verildi" },
    { toplam: "bozuk", odemeDurumu: true, durum: "Teslim" },
    { toplam: 900, odemeDurumu: false },
  ].map(storeOrderView));
  assert.deepEqual(summary, { preparing: 1, shipping: 1, delivered: 1, revenue: 370 });
});
test("arşivlenmiş ürün, map alıcı, eksik veya bozuk alan ekranı bozmaz", () => {
  const view = storeOrderView({ id: "123", alici: { email: "private@example.com" }, ilanBaslik: {}, resim: {}, toplam: {}, adet: {}, durum: {}, odemeTarihi: {} });
  assert.equal(view.title, "Ürün bilgisi arşivlenmiş");
  assert.equal(view.amount, null); assert.equal(view.date, null);
  assert.equal(view.buyer, "Alıcı adı kaydedilmemiş");
  assert.doesNotThrow(() => storeOrderView(null));
  assert.doesNotThrow(() => storeOrderView({ durum: "__proto__" }));
  assert.equal(storeOrderView({ ilanBaslik: "Eski ürün" }).title, "Eski ürün");
});
test("alıcı adı adSoyad snapshotından gelir; e-posta ekrana taşınmaz", () => {
  assert.equal(storeOrderView({ adSoyad: "Gerçek Alıcı", alici: "private@example.com" }).buyer, "Gerçek Alıcı");
  assert.equal(storeOrderView({ alici: "private@example.com" }).buyer, "Alıcı adı kaydedilmemiş");
});
test("arama sipariş no, ürün, alıcı ve Türkçe küçük harfleri destekler", () => {
  const view = storeOrderView({ id: "ORD-123", ilanBaslik: "İpek", adSoyad: "Işık", durum: "paid" });
  for (const term of ["123", "ipek", "ışık"]) assert.equal(matchesStoreOrder(view, term, "Yeni"), true);
  assert.equal(matchesStoreOrder(view, "ipek", "Teslim"), false);
  assert.equal(matchesStoreOrder(storeOrderView({ aktifTalepId: "claim" }), "", "Sorunlu / İtirazlı"), true);
});
test("Timestamp, seconds ve ISO tarihleri desteklenir; bozuk timestamp izole edilir", () => {
  assert.equal(orderDate({ seconds: 1000 }).getTime(), 1000000);
  assert.equal(orderDate({ toDate: () => new Date(1000) }).getTime(), 1000);
  assert.ok(orderDate("2026-09-20T10:00:00Z"));
  assert.equal(orderDate({ toDate: () => { throw new Error(); } }), null);
});
test("teslim doğrulanmadan finansal ödeme vaadi yok; kayıtlı durumlar korunur", () => {
  assert.equal(storeOrderView({ durum: "Ödendi" }).payout, null);
  assert.match(storeOrderView({ teslimatDogrulandi: true }).payout.label, /Bekleyen/);
  assert.match(storeOrderView({ teslimatDogrulandi: true, hakEdisDurumu: "PAID" }).payout.label, /tamamlandı/);
  assert.match(storeOrderView({ hakEdisBlokeli: true }).payout.label, /İnceleme/);
});
test("sayfa auth restore, iki yetkili seller sorgusu, cleanup ve retry içerir", () => {
  const page = fs.readFileSync(new URL("../src/pages/SellerOrders.jsx", import.meta.url), "utf8")
    + fs.readFileSync(new URL("../src/hooks/useSellerOrders.js", import.meta.url), "utf8");
  assert.match(page, /onAuthStateChanged\(auth/);
  assert.match(page, /\["saticiUid", user.uid\]/);
  assert.match(page, /\["satici", user.email\]/);
  assert.match(page, /stopOrders\(\); stopAuth\(\)/);
  assert.match(page, /Tekrar dene/);
  assert.match(page, /new Map/);
  assert.doesNotMatch(page, /collection\(db, "ilanlar"\)/);
});
test("kart yalnız yetkili servislerle mutasyon ve private fulfillment yapar", () => {
  const card = fs.readFileSync(new URL("../src/components/store/StoreOrderCard.jsx", import.meta.url), "utf8");
  assert.match(card, /updateSellerOrderStatus\(view.id, payload\)/);
  assert.match(card, /lock.current/);
  assert.match(card, /getIdToken/);
  assert.match(card, /\/fulfillment/);
  assert.match(card, /addressOpen && canShowAddress/);
  assert.match(card, /maxLength=\{80\}/);
  assert.match(card, /maxLength=\{120\}/);
  assert.match(card, /IntersectionObserver/);
  assert.match(card, /if \(view.image \|\| !listingId/);
  assert.doesNotMatch(card, /updateDoc|setDoc|paymentTransactionId|subMerchantKey|collection\(/);
});
test("responsive stiller yalnız Mağazam ekranına scoped ve dar gridler esnek", () => {
  const css = fs.readFileSync(new URL("../src/styles/pages/store-orders.css", import.meta.url), "utf8");
  assert.match(css, /minmax\(0, 1fr\)/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /focus-visible/);
  assert.match(css, /max-width: 480px/);
  assert.match(css, /object-fit: contain/);
});
