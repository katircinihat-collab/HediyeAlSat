import test from "node:test";
import assert from "node:assert/strict";
import { calculateSellerFinanceMetrics } from "../src/utils/sellerFinanceMetrics.js";

test("ödenmemiş siparişleri satış istatistiklerine dahil etmez", () => {
  const metrics = calculateSellerFinanceMetrics([
    { toplam: 100, odemeDurumu: false },
    { toplam: 200, odemeDurumu: true, durum: "Ödendi" }
  ]);
  assert.deepEqual(metrics, {
    grossSales: 200,
    platformCommission: 16,
    sellerNetShare: 184,
    completedOrderCount: 1
  });
});

test("iptal ve refund edilmiş siparişleri gerçekleşen satıştan çıkarır", () => {
  const metrics = calculateSellerFinanceMetrics([
    { toplam: 100, odemeDurumu: true, durum: "İptal" },
    { toplam: 100, odemeDurumu: true, durum: "Ödendi", refundProviderStatus: "success" },
    { toplam: 125.5, odemeDurumu: true, durum: "Teslim Edildi" }
  ]);
  assert.equal(metrics.grossSales, 125.5);
  assert.equal(metrics.platformCommission, 10.04);
  assert.equal(metrics.sellerNetShare, 115.46);
  assert.equal(metrics.completedOrderCount, 1);
});

test("komisyonu backend ile aynı şekilde sipariş bazında kuruş ve yüzde 8 hesaplar", () => {
  const metrics = calculateSellerFinanceMetrics([
    { toplam: 10.01, odemeDurumu: true },
    { toplam: 10.01, odemeDurumu: true }
  ]);
  assert.equal(metrics.grossSales, 20.02);
  assert.equal(metrics.platformCommission, 1.6);
  assert.equal(metrics.sellerNetShare, 18.42);
});
