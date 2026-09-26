import { isDigitalOrder, normalizeOrderStatus, sellerNextAction } from "./orderLifecycle.js";
import { payoutDisplay } from "./orderDelivery.js";

export const storeOrderFilters = ["Tümü", "Yeni", "Hazırlanıyor", "Kargoda", "Teslim", "Sorunlu / İtirazlı", "Ödeme Denemeleri", "Başarısız Ödemeler"];
// This is presentation only. Eligibility and archival are always decided by the backend.
export const isPaymentAttempt = (order) => order?.odemeDurumu === false
  && ["Ödeme Bekleniyor", "Ödeme Başarısız", "FAILED", "EXPIRED"].includes(order.durum);
export const isSellerArchivedAttempt = (order) => order?.sellerAttemptArchived === true && isPaymentAttempt(order)
  && !Object.entries(order).some(([key, value]) => value && /^(paymentId|paymentTransaction|settlement|hakEdis|refund|payout|aktifTalep|kargoNo|teslimatDogrul)/i.test(key));
export const orderText = (value) => typeof value === "string" ? value.trim() : "";
export const orderImage = (value) => /^(https?:\/\/|\/[^/])/.test(orderText(value)) ? orderText(value) : "";
export const orderMoney = (value) => Number.isFinite(value) ? value.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "Tutar bilgisi yok";

export function orderDate(value) {
  try {
    if (value == null || value === "") return null;
    const date = typeof value?.toDate === "function" ? value.toDate()
      : new Date(typeof value?.seconds === "number" ? value.seconds * 1000 : value);
    return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
  } catch { return null; }
}

export function storeOrderView(source = {}) {
  const order = source && typeof source === "object" ? source : {};
  const normalizedStatus = normalizeOrderStatus(orderText(order.durum));
  const status = typeof normalizedStatus === "string" ? normalizedStatus : "Durum bilgisi yok";
  const digital = isDigitalOrder(order);
  const quantity = Number(order.adet);
  const amount = order.toplam == null || order.toplam === "" ? NaN : Number(order.toplam);
  const problem = order.hakEdisBlokeli === true || Boolean(orderText(order.aktifTalepId))
    || /itiraz|iade|iptal|başarısız/i.test(status.toLocaleLowerCase("tr-TR"));
  const delivered = ["Teslim Edildi", "Tamamlandı"].includes(status);
  const date = orderDate(order.odemeTarihi || order.tarih || order.olusturmaTarihi);
  const normalized = { ...order, durum: status, hakEdisBlokeBitis: orderDate(order.hakEdisBlokeBitis) || undefined };
  const action = order.odemeDurumu === true ? sellerNextAction(normalized) : { kind: "WAIT", label: "Ödeme onayı bekleniyor" };
  const buyer = [order.adSoyad, order.aliciAdi, order.alici?.adSoyad, order.alici?.displayName]
    .map(orderText).find((name) => name && !name.includes("@")) || "Alıcı adı kaydedilmemiş";
  return {
    id: orderText(order.id), number: orderText(order.siparisNo) || orderText(order.id),
    title: orderText(order.ilanBaslik) || orderText(order.urunAdi) || "Ürün bilgisi arşivlenmiş",
    buyer, variant: orderText(order.varyant), image: orderImage(order.resim),
    quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : null,
    amount: Number.isFinite(amount) && amount >= 0 ? amount : null,
    date, status, digital, problem, delivered, action,
    group: status === "Ödendi" ? "Yeni" : delivered ? "Teslim" : status,
    payout: payoutDisplay(normalized),
    step: delivered ? 3 : status === "Kargoda" ? 2 : status === "Hazırlanıyor" ? 1 : status === "Ödendi" ? 0 : -1,
    paid: order.odemeDurumu === true, paymentAttempt: isPaymentAttempt(order),
  };
}

export function matchesStoreOrder(view, search, filter) {
  const term = search.trim().toLocaleLowerCase("tr-TR");
  if (filter === "Ödeme Denemeleri" || filter === "Başarısız Ödemeler") {
    return view.paymentAttempt && (filter !== "Başarısız Ödemeler" || view.cleanupEligible === true)
      && [view.number, view.title, view.buyer].some((value) => value.toLocaleLowerCase("tr-TR").includes(term));
  }
  if (view.paymentAttempt) return false;
  return (filter === "Tümü" || (filter === "Sorunlu / İtirazlı" ? view.problem : view.group === filter))
    && [view.number, view.title, view.buyer].some((value) => value.toLocaleLowerCase("tr-TR").includes(term));
}

export function summarizeStoreOrders(views) {
  return {
    preparing: views.filter((v) => v.status === "Hazırlanıyor").length,
    shipping: views.filter((v) => !v.digital && v.status === "Kargoda").length,
    delivered: views.filter((v) => v.delivered).length,
    // Gross paid order total is not a wallet balance or settlement eligibility.
    revenue: views.filter((v) => v.paid).reduce((total, v) => total + (v.amount ?? 0), 0),
  };
}
