const STATUS_ALIASES = Object.freeze({
  Bekliyor: "Ödendi",
  paid: "Ödendi",
  yeni: "Ödendi",
  processing: "Hazırlanıyor",
  hazirlaniyor: "Hazırlanıyor",
  shipped: "Kargoda",
  "Kargoya Verildi": "Kargoda",
  delivered: "Teslim Edildi",
  Teslim: "Teslim Edildi",
  completed: "Tamamlandı",
  dispute: "İtiraz İnceleniyor",
  DISPUTE_PENDING: "İtiraz İnceleniyor"
});

export function normalizeOrderStatus(status) {
  return STATUS_ALIASES[status] || status || "Ödeme Bekleniyor";
}

export function isDigitalOrder(order = {}) {
  return order.urunTipi === "dijital"
    || order.fizikselKargo === false
    || order.dijitalTeslimat === true
    || order.teslimatTipi === "dijital";
}

export function dateValue(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function claimOptionsForOrder(order, now = new Date()) {
  if (!order || order.odemeDurumu !== true || order.hakEdisBlokeli === true) return [];
  const status = normalizeOrderStatus(order.durum);
  const deadline = dateValue(order.hakEdisBlokeBitis);
  const withinDeliveredWindow = status === "Teslim Edildi"
    && order.teslimatDogrulandi === true
    && deadline
    && deadline.getTime() >= now.getTime();
  if (isDigitalOrder(order)) return withinDeliveredWindow ? ["itiraz"] : [];
  if (status === "Kargoda") return ["itiraz"];
  return withinDeliveredWindow ? ["iade", "itiraz"] : [];
}

export function sellerNextAction(order) {
  const status = normalizeOrderStatus(order?.durum);
  if (isDigitalOrder(order)) return { kind: "WAIT", label: "Dijital teslimat otomatik yönetiliyor" };
  if (status === "Ödendi") return { kind: "PREPARE", label: "Siparişi Hazırla" };
  if (status === "Hazırlanıyor") return { kind: "SHIP", label: "Kargoya Ver" };
  if (status === "Kargoda" && !order.kargoNo) return { kind: "TRACKING_MISSING", label: "Takip numarası gerekli" };
  if (status === "Kargoda") return { kind: "WAIT", label: "Alıcının teslim alması bekleniyor" };
  if (status === "Teslim Edildi") return { kind: "WAIT", label: "48 saatlik kontrol süreci devam ediyor" };
  return { kind: "WAIT", label: "Şu anda işlem yapmanız gerekmiyor" };
}

export function orderTimeline(order = {}) {
  const status = normalizeOrderStatus(order.durum);
  const digital = isDigitalOrder(order);
  const steps = digital
    ? ["Sipariş alındı", "Dijital teslimat", "48 saat kontrol", "Tamamlandı"]
    : ["Sipariş alındı", "Hazırlanıyor", "Kargoda", "Teslim edildi", "48 saat kontrol", "Tamamlandı"];
  let current = 0;
  if (digital && order.odemeDurumu === true) current = order.teslimatDogrulandi ? 2 : 1;
  if (!digital) {
    if (status === "Hazırlanıyor") current = 1;
    if (status === "Kargoda") current = 2;
    if (status === "Teslim Edildi") current = 3;
  }
  const deadline = dateValue(order.hakEdisBlokeBitis);
  if (order.teslimatDogrulandi && deadline) current = deadline.getTime() <= Date.now() ? steps.length - 1 : steps.length - 2;
  return steps.map((label, index) => ({ label, complete: index <= current, current: index === current }));
}

export function sellerActionSummary(orders = []) {
  const actionable = orders.map((order) => ({ order, action: sellerNextAction(order) }));
  return {
    prepare: actionable.filter(({ action }) => action.kind === "PREPARE"),
    ship: actionable.filter(({ action }) => action.kind === "SHIP"),
    trackingMissing: actionable.filter(({ action }) => action.kind === "TRACKING_MISSING"),
    claims: orders.filter((order) => order.hakEdisBlokeli === true || order.aktifTalepId)
  };
}
