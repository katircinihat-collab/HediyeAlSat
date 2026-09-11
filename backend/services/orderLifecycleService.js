const { ORDER_STATUSES, normalizeOrderStatus } = require("../constants/orderStatuses");
const { getPayoutEligibility } = require("./deliveryConfirmationService");

const OPEN_CLAIM_STATUSES = new Set(["acik", "inceleniyor", "kabul_edildi"]);
const PAYMENT_PROBLEM_STATUSES = new Set(["MANUAL_REVIEW", "AMOUNT_MISMATCH", "FAILED_FINALIZATION"]);

function asDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value.toDate === "function") return value.toDate();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isDigitalOrder(order) {
    return order?.urunTipi === "dijital" || order?.fizikselKargo === false
        || order?.dijitalTeslimat === true || order?.teslimatTipi === "dijital";
}

function lifecycleView(order, now = new Date()) {
    const status = normalizeOrderStatus(order?.durum) || ORDER_STATUSES.ODEME_BEKLENIYOR;
    const digital = isDigitalOrder(order);
    const payout = getPayoutEligibility(order || {}, now);
    const paid = order?.odemeDurumu === true;
    let stage = paid ? "paid" : "payment_pending";
    if (status === ORDER_STATUSES.HAZIRLANIYOR) stage = "preparing";
    if (status === ORDER_STATUSES.KARGODA) stage = "shipping";
    if (status === ORDER_STATUSES.TESLIM_EDILDI) stage = payout.eligible ? "earning_ready" : "protection_period";
    if (order?.walletAktarildi === true || order?.hakEdisOdendi === true || order?.payoutCompleted === true) stage = "earning_released";
    if (order?.hakEdisBlokeli === true) stage = "manual_review";
    if ([ORDER_STATUSES.IPTAL, ORDER_STATUSES.IADE].includes(status)) stage = "closed";
    return {
        status, stage, digital, paid,
        shippingStatus: digital ? "Dijital teslimat" : status === ORDER_STATUSES.KARGODA ? "Kargoda" : status === ORDER_STATUSES.TESLIM_EDILDI ? "Teslim edildi" : "Kargo bekleniyor",
        payoutStatus: order?.hakEdisDurumu || payout.status,
        holdEndsAt: asDate(order?.hakEdisBlokeBitis),
        remainingMs: payout.remainingMs ?? null
    };
}

function actionReasons(order, now = new Date()) {
    const view = lifecycleView(order, now);
    const reasons = [];
    if (order?.manualReview === true || order?.adminReviewRequired === true) reasons.push("MANUAL_REVIEW");
    if (PAYMENT_PROBLEM_STATUSES.has(order?.paymentStatus) || order?.finalizationStatus === "FAILED") reasons.push("PAYMENT_FINALIZATION");
    if (view.paid && !order?.paymentId) reasons.push("PAYMENT_ID_MISSING");
    if (order?.hakEdisBlokeli === true || OPEN_CLAIM_STATUSES.has(order?.claimStatus)) reasons.push("OPEN_CLAIM_OR_DISPUTE");
    if (view.digital && [ORDER_STATUSES.HAZIRLANIYOR, ORDER_STATUSES.KARGODA].includes(view.status)) reasons.push("DIGITAL_SHIPPING_STATE");
    if (!view.digital && view.status === ORDER_STATUSES.TESLIM_EDILDI && order?.teslimatDogrulandi !== true) reasons.push("DELIVERY_NOT_VERIFIED");
    if (order?.teslimatDogrulandi === true && view.status !== ORDER_STATUSES.TESLIM_EDILDI) reasons.push("DELIVERY_STATE_MISMATCH");
    const holdEnd = view.holdEndsAt;
    const releaseLate = holdEnd && now.getTime() - holdEnd.getTime() > 2 * 60 * 60 * 1000;
    if (releaseLate && !order?.hakEdisBlokeli && !order?.walletAktarildi && !order?.hakEdisOdendi && !order?.payoutCompleted) reasons.push("EARNING_RELEASE_OVERDUE");
    return [...new Set(reasons)];
}

function buildTimeline(order, now = new Date()) {
    const view = lifecycleView(order, now);
    const events = [
        { key: "created", label: "Sipariş oluşturuldu", at: asDate(order?.tarih), complete: true },
        { key: "paid", label: "Ödeme doğrulandı", at: asDate(order?.odemeTarihi), complete: view.paid },
        { key: "preparing", label: view.digital ? "Dijital teslimat hazırlandı" : "Hazırlanıyor", at: asDate(order?.hazirlanmaTarihi), complete: view.digital ? view.paid : [ORDER_STATUSES.HAZIRLANIYOR, ORDER_STATUSES.KARGODA, ORDER_STATUSES.TESLIM_EDILDI].includes(view.status) },
        { key: "shipping", label: view.digital ? "Dijital teslim edildi" : "Kargoya verildi", at: asDate(view.digital ? order?.dijitalTeslimatTarihi : order?.kargoTarihi), complete: view.digital ? order?.teslimatDogrulandi === true : [ORDER_STATUSES.KARGODA, ORDER_STATUSES.TESLIM_EDILDI].includes(view.status) },
        { key: "delivered", label: "Teslimat doğrulandı", at: asDate(order?.teslimatDogrulamaTarihi), complete: order?.teslimatDogrulandi === true },
        { key: "hold", label: "48 saat kontrol süresi", at: view.holdEndsAt, complete: Boolean(view.holdEndsAt && view.holdEndsAt <= now) },
        { key: "earning", label: order?.payoutCompleted || order?.walletAktarildi ? "Hakediş bakiyeye aktarıldı" : "Hakediş ödemeye hazır", at: asDate(order?.hakEdisOdemeTarihi), complete: view.stage === "earning_ready" || view.stage === "earning_released" }
    ];
    return events;
}

module.exports = { OPEN_CLAIM_STATUSES, asDate, isDigitalOrder, lifecycleView, actionReasons, buildTimeline };
