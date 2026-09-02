const { toKurus } = require("./paymentCallbackService");

const REFUND_STATUSES = Object.freeze({ PENDING: "PENDING", SUCCESS: "PROVIDER_SUCCESS", FAILED: "PROVIDER_FAILED", RECONCILIATION: "RECONCILIATION_REQUIRED" });

class RefundError extends Error {
    constructor(message, status = 400, code = "REFUND_FAILED") { super(message); this.status = status; this.code = code; }
}
function clean(value, max = 1000) { const text = String(value || "").trim(); return text.slice(0, max); }
function isDigital(listing) { return listing?.urunTipi === "dijital" || listing?.fizikselKargo === false; }
function trustedRefundAmount(order) {
    const paid = toKurus(order.iyzicoItemPaidPrice); const item = toKurus(order.iyzicoItemPrice);
    const product = toKurus(Number(order.fiyat) * Number(order.adet));
    if (!Number.isInteger(paid) || paid <= 0 || paid !== item || paid !== product) {
        throw new RefundError("İade tutarı güvenli biçimde doğrulanamadı.", 409, "REFUND_AMOUNT_UNVERIFIED");
    }
    return { kurus: paid, amount: Number((paid / 100).toFixed(2)) };
}
async function prepareRefund({ firestore, claimId, admin, now = () => new Date() }) {
    return firestore.runTransaction(async (tx) => {
        const claimRef = firestore.collection("orderClaims").doc(claimId); const lockRef = firestore.collection("refundFinalizations").doc(claimId);
        const [claimSnap, lockSnap] = await Promise.all([tx.get(claimRef), tx.get(lockRef)]);
        if (!claimSnap.exists) throw new RefundError("İade talebi bulunamadı.", 404, "CLAIM_NOT_FOUND");
        const claim = claimSnap.data();
        if (lockSnap.exists) {
            const lock = lockSnap.data();
            if (lock.status === REFUND_STATUSES.SUCCESS) return { idempotent: true, completed: true, lock };
            throw new RefundError("Bu iade işlemi yeniden gönderilemez; provider sonucu doğrulanmalıdır.", 409, lock.status === REFUND_STATUSES.PENDING ? "REFUND_IN_PROGRESS" : "REFUND_RETRY_BLOCKED");
        }
        if (claim.tip !== "iade" || claim.durum !== "kabul_edildi" || claim.payoutBlock !== true) throw new RefundError("Yalnız kabul edilmiş ve blokeli iade talebi işlenebilir.", 409, "REFUND_NOT_ELIGIBLE");
        if (claim.returnFlowStatus !== "teslim_dogrulandi" || claim.returnReceivedConfirmationType !== "admin") throw new RefundError("Geri teslim yönetici tarafından doğrulanmamış.", 409, "RETURN_NOT_VERIFIED");
        const orderRef = firestore.collection("siparisler").doc(claim.orderId); const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) throw new RefundError("Sipariş bulunamadı.", 404, "ORDER_NOT_FOUND");
        const order = orderSnap.data();
        if (order.odemeDurumu !== true) throw new RefundError("Ödemesi alınmamış sipariş iade edilemez.", 409, "ORDER_NOT_PAID");
        if (order.refundProviderStatus === "success") throw new RefundError("Sipariş için provider iadesi zaten başarılı.", 409, "ORDER_ALREADY_REFUNDED");
        if (order.walletAktarildi === true || order.hakEdisOdendi === true || order.payoutCompleted === true) throw new RefundError("Satıcı hakedişi yapılmış sipariş otomatik iade edilemez.", 409, "SELLER_PAYOUT_COMPLETED");
        if (!order.paymentId) throw new RefundError("Ödeme kimliği bulunamadı.", 409, "REFUND_PAYMENT_ID_MISSING");
        if (!order.paymentTransactionId) throw new RefundError("Eski ödeme için işlem kimliği bulunamadı; manuel inceleme gerekli.", 409, "REFUND_TRANSACTION_ID_MISSING");
        const currency = order.paymentCurrency || "TRY";
        if (currency !== "TRY") throw new RefundError("Para birimi desteklenmiyor.", 409, "REFUND_CURRENCY_INVALID");
        const listingId = order.ilanId || order.urunId;
        if (!listingId) throw new RefundError("Sipariş ürünü doğrulanamadı.", 409, "LISTING_NOT_VERIFIED");
        const listingSnap = await tx.get(firestore.collection("ilanlar").doc(listingId));
        if (!listingSnap.exists) throw new RefundError("Sipariş ürünü doğrulanamadı.", 409, "LISTING_NOT_VERIFIED");
        if (isDigital(listingSnap.data())) throw new RefundError("Dijital ürünler fiziksel iade endpointiyle iade edilemez.", 409, "DIGITAL_REFUND_NOT_ALLOWED");
        const refundAmount = trustedRefundAmount(order); const timestamp = now(); const conversationId = `refund-${claimId}`;
        const lock = { claimId, orderId: claim.orderId, paymentId: order.paymentId, paymentTransactionId: order.paymentTransactionId, refundAmount: refundAmount.amount, currency, conversationId, status: REFUND_STATUSES.PENDING, attemptCount: 1, createdAt: timestamp, updatedAt: timestamp, requestedBy: admin.uid || admin.email };
        tx.create(lockRef, lock);
        return { idempotent: false, completed: false, lock, claimRef, orderRef };
    });
}
function validateProviderSuccess(response, lock) {
    if (String(response?.status).toLowerCase() !== "success") throw new RefundError("Ödeme kuruluşu iadeyi reddetti.", 502, "PROVIDER_FAILED");
    if (String(response.paymentTransactionId || "") !== lock.paymentTransactionId) throw new RefundError("Provider işlem kimliği eşleşmedi.", 502, "PROVIDER_TRANSACTION_MISMATCH");
    if (response.conversationId !== lock.conversationId) throw new RefundError("Provider görüşme kimliği eşleşmedi.", 502, "PROVIDER_CONVERSATION_MISMATCH");
    if (response.currency !== lock.currency) throw new RefundError("Provider para birimi eşleşmedi.", 502, "PROVIDER_CURRENCY_MISMATCH");
    if (toKurus(response.price) !== toKurus(lock.refundAmount)) throw new RefundError("Provider iade tutarı eşleşmedi.", 502, "PROVIDER_AMOUNT_MISMATCH");
    return { hostReference: clean(response.hostReference, 200), providerRefundId: clean(response.refundId || response.paymentId, 200) };
}
async function finalizeRefund({ firestore, claimId, status, provider = {}, now = () => new Date() }) {
    return firestore.runTransaction(async (tx) => {
        const lockRef = firestore.collection("refundFinalizations").doc(claimId); const lockSnap = await tx.get(lockRef);
        if (!lockSnap.exists) throw new RefundError("Refund kilidi bulunamadı.", 409, "REFUND_LOCK_MISSING");
        const lock = lockSnap.data();
        if (lock.status === REFUND_STATUSES.SUCCESS) return { idempotent: true, status: lock.status };
        if (lock.status !== REFUND_STATUSES.PENDING) throw new RefundError("Refund sonucu daha önce kaydedilmiş.", 409, "REFUND_ALREADY_FINALIZED");
        const timestamp = now(); const safeProvider = { providerErrorCode: clean(provider.errorCode, 100), providerErrorMessage: clean(provider.errorMessage, 500), hostReference: clean(provider.hostReference, 200), providerRefundId: clean(provider.providerRefundId, 200) };
        tx.update(lockRef, { status, ...safeProvider, updatedAt: timestamp });
        if (status === REFUND_STATUSES.SUCCESS) {
            tx.update(firestore.collection("orderClaims").doc(lock.claimId), { refundProviderStatus: "success", refundProvider: "iyzico", refundAmount: lock.refundAmount, refundCurrency: lock.currency, refundPaymentTransactionId: lock.paymentTransactionId, refundPaymentId: lock.paymentId, refundConversationId: lock.conversationId, refundProcessedAt: timestamp, refundReference: safeProvider.hostReference || safeProvider.providerRefundId || null, refundUpdatedAt: timestamp, payoutBlock: true });
            tx.update(firestore.collection("siparisler").doc(lock.orderId), { refundProviderStatus: "success", refundProviderProcessedAt: timestamp, refundClaimId: lock.claimId, hakEdisBlokeli: true, hakEdisDurumu: "İncelemede", guncellenmeTarihi: timestamp });
        } else {
            tx.update(firestore.collection("orderClaims").doc(lock.claimId), { refundProviderStatus: status === REFUND_STATUSES.FAILED ? "failed" : "unknown", refundProviderErrorCode: safeProvider.providerErrorCode || null, refundProviderErrorMessage: safeProvider.providerErrorMessage || null, refundUpdatedAt: timestamp, payoutBlock: true });
        }
        return { idempotent: false, status };
    });
}
async function executeRefund({ firestore, claimId, admin, refundProvider, now = () => new Date(), ip = "85.34.78.112", description = "" }) {
    const prepared = await prepareRefund({ firestore, claimId, admin, now });
    if (prepared.idempotent) return { success: true, idempotent: true, status: REFUND_STATUSES.SUCCESS };
    const request = { locale: "tr", conversationId: prepared.lock.conversationId, paymentTransactionId: prepared.lock.paymentTransactionId, price: prepared.lock.refundAmount.toFixed(2), currency: prepared.lock.currency, ip, reason: "other", description: clean(description, 500) || "Admin onaylı fiziksel ürün iadesi" };
    let response;
    try { response = await refundProvider(request); }
    catch (error) {
        await finalizeRefund({ firestore, claimId, status: REFUND_STATUSES.RECONCILIATION, provider: { errorCode: error.code || "PROVIDER_NETWORK_ERROR", errorMessage: "Provider sonucu doğrulanamadı." }, now });
        throw new RefundError("İade sonucu doğrulanamadı; manuel mutabakat gerekli.", 502, "REFUND_RECONCILIATION_REQUIRED");
    }
    try {
        const verified = validateProviderSuccess(response, prepared.lock);
        await finalizeRefund({ firestore, claimId, status: REFUND_STATUSES.SUCCESS, provider: verified, now });
        return { success: true, idempotent: false, status: REFUND_STATUSES.SUCCESS };
    } catch (error) {
        const explicitFailure = error.code === "PROVIDER_FAILED";
        await finalizeRefund({ firestore, claimId, status: explicitFailure ? REFUND_STATUSES.FAILED : REFUND_STATUSES.RECONCILIATION, provider: { errorCode: response?.errorCode || error.code, errorMessage: explicitFailure ? clean(response?.errorMessage, 500) || "Provider iadeyi reddetti." : "Provider cevabı güvenli biçimde doğrulanamadı." }, now });
        throw error;
    }
}
function createIyzicoRefundProvider(iyzipay) {
    if (!iyzipay?.refund?.create) throw new RefundError("Iyzico refund servisi yapılandırılmadı.", 503, "REFUND_PROVIDER_UNAVAILABLE");
    return (request) => new Promise((resolve, reject) => iyzipay.refund.create(request, (error, response) => error ? reject(error) : resolve(response)));
}

module.exports = { REFUND_STATUSES, RefundError, trustedRefundAmount, prepareRefund, validateProviderSuccess, finalizeRefund, executeRefund, createIyzicoRefundProvider };
