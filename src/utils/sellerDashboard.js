import { storeOrderView, summarizeStoreOrders, orderText } from "./storeOrders.js";
import { isListingPublished } from "./listingAvailability.js";

export function finiteMoney(value) {
  if (typeof value !== "number" && typeof value !== "string") return 0;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export function sellerDashboard(orders = [], products = [], now = new Date()) {
  const views = orders.filter(Boolean).map(storeOrderView);
  const summary = summarizeStoreOrders(views);
  const actions = views.filter((view) => ["PREPARE", "SHIP", "TRACKING_MISSING"].includes(view.action.kind));
  const year = Number(new Intl.DateTimeFormat("en", { timeZone: "Europe/Istanbul", year: "numeric" }).format(now));
  const months = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, label: new Intl.DateTimeFormat("tr-TR", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, index))), total: 0, count: 0 }));
  let missingDates = 0;
  for (const view of views.filter((item) => item.paid)) {
    if (!view.date) { missingDates++; continue; }
    const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Istanbul", year: "numeric", month: "numeric" }).formatToParts(view.date);
    const value = (type) => Number(parts.find((part) => part.type === type).value);
    if (value("year") !== year) continue;
    months[value("month") - 1].total += view.amount ?? 0;
    months[value("month") - 1].count++;
  }
  return {
    ...summary, actions, orderCount: views.length,
    productCount: products.filter(Boolean).length,
    published: products.filter(isListingPublished).length,
    cancelled: views.filter((view) => /iptal|cancel/i.test(view.status)).length,
    disputed: views.filter((view) => view.problem).length,
    months, year, missingDates,
  };
}

export function splitSellerMovements(movements = []) {
  const records = movements.filter((item) => item && typeof item === "object");
  return {
    marketplace: records.filter((hareket) => hareket.settlementMode === "IYZICO_MARKETPLACE"),
    legacy: records.filter((hareket) => hareket.settlementMode !== "IYZICO_MARKETPLACE"),
  };
}

export function hasLegacyFinance(wallet, movements, requests) {
  return movements.length > 0 || requests.length > 0 || ["balance", "pending", "paid", "withdrawalPending"].some((key) => finiteMoney(wallet?.[key]) > 0);
}

export function normalizeBankForm(form) {
  return { bankaAdi: orderText(form.bankaAdi), hesapSahibi: orderText(form.hesapSahibi), iban: orderText(form.iban).replace(/\s+/g, "").toUpperCase() };
}

export function validBankForm(form) {
  const { iban, bankaAdi, hesapSahibi } = normalizeBankForm(form);
  if (!/^TR\d{24}$/.test(iban) || bankaAdi.length < 2 || bankaAdi.length > 100 || hesapSahibi.length < 3 || hesapSahibi.length > 120) return false;
  const digits = `${iban.slice(4)}${iban.slice(0, 4)}`.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
  return [...digits].reduce((remainder, digit) => (remainder * 10 + Number(digit)) % 97, 0) === 1;
}
