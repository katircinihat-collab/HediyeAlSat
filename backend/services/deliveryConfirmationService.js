const { ORDER_STATUSES, normalizeOrderStatus } = require("../constants/orderStatuses");

const HOLD_DURATION_MS = 48 * 60 * 60 * 1000;

class DeliveryConfirmationError extends Error {
    constructor(message, status = 400, code = "DELIVERY_CONFIRMATION_FAILED") {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value.toDate === "function") return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function actorOwnsOrder(order, actor) {
    if (actor.type === "admin") return true;
    return Boolean(
        (actor.uid && order.aliciUid === actor.uid)
        || (actor.email && (order.alici === actor.email || order.kullanici === actor.email))
    );
}

function buildDeliveryConfirmation(order, actor, now = new Date()) {
    if (!order) throw new DeliveryConfirmationError("Sipariş bulunamadı.", 404, "ORDER_NOT_FOUND");
    if (!actorOwnsOrder(order, actor)) throw new DeliveryConfirmationError("Bu siparişi doğrulama yetkiniz yok.", 403, "ORDER_FORBIDDEN");
    if (order.teslimatDogrulandi === true) {
        return { idempotent: true, update: null };
    }
    if (order.odemeDurumu !== true) throw new DeliveryConfirmationError("Ödemesi alınmamış sipariş doğrulanamaz.", 409, "ORDER_NOT_PAID");
    if (normalizeOrderStatus(order.durum) !== ORDER_STATUSES.KARGODA) {
        throw new DeliveryConfirmationError("Yalnız kargodaki sipariş teslim alınabilir.", 409, "ORDER_NOT_SHIPPED");
    }
    const deliveryTime = new Date(now);
    const releaseTime = new Date(deliveryTime.getTime() + HOLD_DURATION_MS);
    return {
        idempotent: false,
        update: {
            durum: ORDER_STATUSES.TESLIM_EDILDI,
            teslimatDogrulandi: true,
            teslimatDogrulamaTarihi: deliveryTime,
            teslimatDogrulamaTipi: actor.type,
            teslimatDogrulayanUid: actor.uid || null,
            hakEdisBlokeBaslangic: deliveryTime,
            hakEdisBlokeBitis: releaseTime,
            hakEdisDurumu: "Beklemede",
            guncellenmeTarihi: deliveryTime
        }
    };
}

function getPayoutEligibility(order, now = new Date()) {
    const releaseTime = parseDate(order?.hakEdisBlokeBitis);
    const trustedDelivery = order?.teslimatDogrulandi === true
        && normalizeOrderStatus(order?.durum) === ORDER_STATUSES.TESLIM_EDILDI;
    const blocked = order?.durum === ORDER_STATUSES.IPTAL || order?.durum === ORDER_STATUSES.IADE
        || order?.iadeTalebi === true || order?.itirazAcik === true;
    const alreadyPaid = order?.walletAktarildi === true || order?.hakEdisOdendi === true || order?.payoutCompleted === true;
    if (order?.odemeDurumu !== true || !trustedDelivery || !releaseTime || blocked || alreadyPaid) {
        return { eligible: false, status: "Beklemede", remainingMs: releaseTime ? Math.max(0, releaseTime.getTime() - now.getTime()) : null };
    }
    const remainingMs = Math.max(0, releaseTime.getTime() - now.getTime());
    return { eligible: remainingMs === 0, status: remainingMs === 0 ? "Ödemeye Hazır" : "Beklemede", remainingMs };
}

async function confirmDelivery({ firestore, orderId, actor, now = () => new Date() }) {
    return firestore.runTransaction(async (transaction) => {
        const ref = firestore.collection("siparisler").doc(orderId);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) throw new DeliveryConfirmationError("Sipariş bulunamadı.", 404, "ORDER_NOT_FOUND");
        const result = buildDeliveryConfirmation(snapshot.data(), actor, now());
        if (result.update) transaction.update(ref, result.update);
        return { idempotent: result.idempotent, orderId, ...(result.update || {}) };
    });
}

module.exports = { HOLD_DURATION_MS, DeliveryConfirmationError, actorOwnsOrder, buildDeliveryConfirmation, getPayoutEligibility, confirmDelivery };
