import test from "node:test";
import assert from "node:assert/strict";
import { sellerDashboard, finiteMoney, splitSellerMovements, hasLegacyFinance, validBankForm, normalizeBankForm } from "../src/utils/sellerDashboard.js";

test("panel ve Siparişlerim ödeme onaylı aynı brüt ciroyu kullanır", () => {
  const view = sellerDashboard([null, { odemeDurumu: true, toplam: 120, durum: "Hazırlanıyor" }, { odemeDurumu: false, toplam: 1000 }, { odemeDurumu: true, toplam: "bozuk" }]);
  assert.equal(view.revenue, 120); assert.equal(view.preparing, 1); assert.equal(view.actions.length, 1);
});
test("dijital ve ödenmemiş kayıtlara fiziksel görev üretilmez", () => {
  const view = sellerDashboard([{ durum: "Ödendi", odemeDurumu: true, fizikselKargo: false }, { durum: "Hazırlanıyor", odemeDurumu: false }]);
  assert.equal(view.actions.length, 0);
});
test("grafik yalnız mevcut yılın ödeme onaylı verisini Türkiye gününe göre toplar", () => {
  const view = sellerDashboard([
    { odemeDurumu: true, toplam: 100, odemeTarihi: "2025-12-31T22:30:00Z" },
    { odemeDurumu: true, toplam: 200, odemeTarihi: "2025-12-31T19:30:00Z" },
    { odemeDurumu: false, toplam: 300, odemeTarihi: "2026-01-01" },
    { odemeDurumu: true, toplam: 20, odemeTarihi: "bozuk" },
  ], [], new Date("2026-09-26"));
  assert.equal(view.months[0].total, 100); assert.equal(view.months[0].count, 1);
  assert.equal(view.months.reduce((sum, month) => sum + month.total, 0), 100);
  assert.equal(view.missingDates, 1);
});
test("arşivli, stoksuz, null ürünler yayında sayılmaz", () => {
  const view = sellerDashboard([], [null, { onay: true, stok: 2 }, { onay: true, aktif: false }, { onay: true, stok: 0 }]);
  assert.equal(view.productCount, 3); assert.equal(view.published, 1);
});
test("marketplace ve legacy kayıtlar ayrı; banka kaydı legacy finans varlığı değildir", () => {
  const split = splitSellerMovements([null, { settlementMode: "IYZICO_MARKETPLACE", netTutar: 92 }, { netTutar: 5 }]);
  assert.equal(split.marketplace.length, 1); assert.equal(split.legacy.length, 1);
  assert.equal(hasLegacyFinance({ iban: "TR..." }, [], []), false);
  assert.equal(hasLegacyFinance({ balance: 5 }, [], []), true);
  assert.equal(hasLegacyFinance({}, [], [{ tutar: 5 }]), true);
});
test("IBAN normalize ve mod97 doğrulaması yapılır; geçersiz hesap reddedilir", () => {
  const form = { bankaAdi: "Banka", hesapSahibi: "Hesap Sahibi", iban: "tr33 0006 1005 1978 6457 8413 26" };
  assert.equal(validBankForm(form), true);
  assert.equal(normalizeBankForm(form).iban, "TR330006100519786457841326");
  assert.equal(validBankForm({ ...form, iban: "TR000006100519786457841326" }), false);
  assert.equal(validBankForm({ ...form, hesapSahibi: "A" }), false);
});
test("bozuk finansal kayıtlar NaN ve negatif özet üretmez", () => {
  for (const value of [null, undefined, {}, "yanlış", NaN, Infinity, -10]) assert.equal(finiteMoney(value), 0);
  assert.equal(finiteMoney("12.25"), 12.25);
});
