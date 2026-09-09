const INVALID_FINANCIAL_STATUSES = new Set([
  "iptal",
  "iptal edildi",
  "iade",
  "refunded",
  "cancelled",
  "cancelled_by_seller"
]);

function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function isRealizedSale(order) {
  const status = String(order?.durum || "").trim().toLocaleLowerCase("tr-TR");
  const refundStatus = String(order?.refundProviderStatus || "").toLowerCase();
  return order?.odemeDurumu === true
    && order?.paymentStatus !== "FAILURE"
    && refundStatus !== "success"
    && order?.refundAccountingCompleted !== true
    && !INVALID_FINANCIAL_STATUSES.has(status);
}

function orderGrossCents(order) {
  if (Number.isFinite(Number(order?.toplam)) && Number(order.toplam) >= 0) {
    return toCents(order.toplam);
  }
  return toCents(Number(order?.fiyat || 0) * Math.max(1, Number(order?.adet || 1)));
}

export function calculateSellerFinanceMetrics(orders = []) {
  const realizedOrders = orders.filter(isRealizedSale);
  let grossCents = 0;
  let commissionCents = 0;

  for (const order of realizedOrders) {
    const orderGross = orderGrossCents(order);
    grossCents += orderGross;
    commissionCents += Math.round(orderGross * 0.08);
  }

  return {
    grossSales: grossCents / 100,
    platformCommission: commissionCents / 100,
    sellerNetShare: (grossCents - commissionCents) / 100,
    completedOrderCount: realizedOrders.length
  };
}
