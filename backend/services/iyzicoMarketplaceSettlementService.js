const crypto = require("crypto");
const iyzipay = require("../config/iyzico");
const { getPayoutEligibility } = require("./deliveryConfirmationService");
const { toKurus } = require("./paymentCallbackService");

const MODE = "IYZICO_MARKETPLACE";
const STATUS = Object.freeze({
    PROTECTED: "PROTECTED",
    PROCESSING: "PROCESSING",
    APPROVED: "APPROVED",
    PAID: "PAID",
    REVIEW_REQUIRED: "REVIEW_REQUIRED",
    FAILED: "FAILED"
});
const PROVIDER_TIMEOUT_MS = 15000;
const PROCESSING_STALE_MS = 5 * 60 * 1000;

class MarketplaceSettlementError extends Error {
    constructor(message, code, status = 409) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

function providerCall(invoke, timeoutMs = PROVIDER_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            fn(value);
        };
        const timer = setTimeout(() => finish(reject, new MarketplaceSettlementError(
            "Ödeme sağlayıcısı sonucu zamanında doğrulanamadı.", "PROVIDER_TIMEOUT", 504
        )), timeoutMs);
        invoke((error, result) => error ? finish(reject, error) : finish(resolve, result));
    });
}

function approveProvider(paymentTransactionId, conversationId, client = iyzipay) {
    if (!client) throw new MarketplaceSettlementError("Iyzico yapılandırması bulunamadı.", "PROVIDER_NOT_CONFIGURED", 503);
    return providerCall((done) => client.approval.create({
        locale: "tr", conversationId, paymentTransactionId
    }, done));
}

function reportDate(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} 00:00:00`;
}

function containsTransaction(value, paymentTransactionId) {
    if (!value || typeof value !== "object") return false;
    if (String(value.paymentTransactionId || value.paymentTxId || value.transactionId || "") === String(paymentTransactionId)) return true;
    return Object.values(value).some((child) => Array.isArray(child)
        ? child.some((item) => containsTransaction(item, paymentTransactionId))
        : containsTransaction(child, paymentTransactionId));
}

function asDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value.toDate === "function") return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function queryProviderStatus({ paymentTransactionId, date, client = iyzipay }) {
    if (!client) throw new MarketplaceSettlementError("Iyzico yapılandırması bulunamadı.", "PROVIDER_NOT_CONFIGURED", 503);
    const conversationId = `settlement-query-${crypto.randomUUID()}`;
    const request = { locale: "tr", conversationId, date: reportDate(date) };
    const completed = await providerCall((done) => client.reportingPayoutCompleted.retrieve(request, done));
    if (completed?.status === "success" && containsTransaction(completed, paymentTransactionId)) return STATUS.PAID;
    const bounced = await providerCall((done) => client.reportingBouncedPayments.retrieve(request, done));
    if (bounced?.status === "success" && containsTransaction(bounced, paymentTransactionId)) return STATUS.FAILED;
    return STATUS.REVIEW_REQUIRED;
}

async function loadContext({ firestore, movementId }) {
    const movementRef = firestore.collection("bakiyeHareketleri").doc(movementId);
    const movementSnapshot = typeof movementRef.get === "function"
        ? await movementRef.get()
        : await firestore.runTransaction((tx) => tx.get(movementRef));
    if (!movementSnapshot.exists) throw new MarketplaceSettlementError("Hakediş kaydı bulunamadı.", "MOVEMENT_NOT_FOUND", 404);
    const movement = movementSnapshot.data();
    if (movement.settlementMode !== MODE) return { applicable: false };
    if (!movement.siparisId) throw new MarketplaceSettlementError("Sipariş bağlantısı bulunamadı.", "ORDER_LINK_MISSING");
    const orderRef = firestore.collection("siparisler").doc(movement.siparisId);
    const orderSnapshot = typeof orderRef.get === "function"
        ? await orderRef.get()
        : await firestore.runTransaction((tx) => tx.get(orderRef));
    if (!orderSnapshot.exists) throw new MarketplaceSettlementError("Sipariş bulunamadı.", "ORDER_NOT_FOUND", 404);
    return { applicable: true, movementRef, movement, orderRef, order: orderSnapshot.data() };
}

async function finalizePaid({ firestore, FieldValue, movementId }) {
    return firestore.runTransaction(async (tx) => {
        const movementRef = firestore.collection("bakiyeHareketleri").doc(movementId);
        const movementSnapshot = await tx.get(movementRef);
        if (!movementSnapshot.exists) throw new MarketplaceSettlementError("Hakediş kaydı bulunamadı.", "MOVEMENT_NOT_FOUND", 404);
        const movement = movementSnapshot.data();
        if (movement.settlementStatus === STATUS.PAID) return { success: true, alreadyPaid: true };
        const orderRef = firestore.collection("siparisler").doc(movement.siparisId);
        const walletRef = firestore.collection("wallets").doc(movement.satici);
        const [orderSnapshot, walletSnapshot] = await Promise.all([tx.get(orderRef), tx.get(walletRef)]);
        if (!orderSnapshot.exists || !walletSnapshot.exists) throw new MarketplaceSettlementError("Settlement muhasebe kaydı eksik.", "ACCOUNTING_RECORD_MISSING");
        const wallet = walletSnapshot.data();
        const pending = toKurus(wallet.pending || 0);
        const net = toKurus(movement.netTutar || 0);
        if (!Number.isInteger(net) || net <= 0 || pending < net) throw new MarketplaceSettlementError("Rezerve bakiye tutarsız.", "RESERVED_BALANCE_MISMATCH");
        const timestamp = FieldValue.serverTimestamp();
        tx.update(walletRef, {
            pending: Number(((pending - net) / 100).toFixed(2)),
            paid: Number((Number(wallet.paid || 0) + net / 100).toFixed(2)),
            guncellenmeTarihi: timestamp
        });
        tx.update(movementRef, { durum: "Aktarıldı", settlementStatus: STATUS.PAID, providerPaidAt: timestamp, guncellenmeTarihi: timestamp });
        tx.update(orderRef, { payoutCompleted: true, hakEdisOdendi: true, hakEdisDurumu: "Ödendi", settlementStatus: STATUS.PAID, hakEdisOdemeTarihi: timestamp, guncellenmeTarihi: timestamp });
        return { success: true, alreadyPaid: false };
    });
}

async function markReview({ firestore, FieldValue, movementId, code, status = STATUS.REVIEW_REQUIRED }) {
    const timestamp = FieldValue.serverTimestamp();
    const movementRef = firestore.collection("bakiyeHareketleri").doc(movementId);
    const snapshot = await movementRef.get();
    if (!snapshot.exists) return;
    const movement = snapshot.data();
    await Promise.all([
        movementRef.set({ settlementStatus: status, settlementErrorCode: code, settlementUpdatedAt: timestamp }, { merge: true }),
        firestore.collection("siparisler").doc(movement.siparisId).set({ settlementStatus: status, settlementErrorCode: code, guncellenmeTarihi: timestamp }, { merge: true })
    ]);
}

async function releaseMarketplaceEarning({ firestore, FieldValue, movementId, now = new Date(), approve = approveProvider, query = queryProviderStatus }) {
    const context = await loadContext({ firestore, movementId });
    if (!context.applicable) return { applicable: false };
    const { movement, order } = context;
    if (movement.settlementStatus === STATUS.PAID) return { applicable: true, success: true, alreadyPaid: true };
    const eligibility = getPayoutEligibility(order, now);
    if (!eligibility.eligible) return { applicable: true, success: false, waiting: true, reason: eligibility.reason };
    if (!movement.paymentTransactionId || !order.paymentTransactionId) {
        await markReview({ firestore, FieldValue, movementId, code: "PAYMENT_TRANSACTION_ID_MISSING" });
        return { applicable: true, success: false, reviewRequired: true };
    }

    const processingAt = asDate(movement.settlementUpdatedAt);
    const staleProcessing = movement.settlementStatus === STATUS.PROCESSING
        && processingAt && now.getTime() - processingAt.getTime() >= PROCESSING_STALE_MS;
    if ([STATUS.APPROVED, STATUS.REVIEW_REQUIRED, STATUS.FAILED].includes(movement.settlementStatus) || staleProcessing) {
        try {
            const providerStatus = await query({ paymentTransactionId: movement.paymentTransactionId, date: now });
            if (providerStatus === STATUS.PAID) return { applicable: true, ...(await finalizePaid({ firestore, FieldValue, movementId })) };
            await markReview({ firestore, FieldValue, movementId, code: providerStatus === STATUS.FAILED ? "PROVIDER_BOUNCED" : "PROVIDER_RESULT_UNKNOWN", status: providerStatus });
            return { applicable: true, success: false, reviewRequired: true, providerStatus };
        } catch (error) {
            await markReview({ firestore, FieldValue, movementId, code: error.code || "PROVIDER_QUERY_FAILED" });
            return { applicable: true, success: false, reviewRequired: true };
        }
    }

    const lockResult = await firestore.runTransaction(async (tx) => {
        const snapshot = await tx.get(context.movementRef);
        const current = snapshot.data();
        if (current.settlementStatus !== STATUS.PROTECTED) return false;
        tx.update(context.movementRef, { settlementStatus: STATUS.PROCESSING, settlementUpdatedAt: FieldValue.serverTimestamp() });
        return true;
    });
    if (!lockResult) return { applicable: true, success: false, inProgress: true };
    try {
        const response = await approve(movement.paymentTransactionId, `approve-${movementId}`);
        if (response?.status !== "success") {
            await markReview({ firestore, FieldValue, movementId, code: response?.errorCode || "APPROVAL_FAILED" });
            return { applicable: true, success: false, reviewRequired: true };
        }
        if (response.paymentTransactionId && String(response.paymentTransactionId) !== String(movement.paymentTransactionId)) {
            await markReview({ firestore, FieldValue, movementId, code: "APPROVAL_TRANSACTION_MISMATCH" });
            return { applicable: true, success: false, reviewRequired: true };
        }
        const timestamp = FieldValue.serverTimestamp();
        await Promise.all([
            context.movementRef.set({ settlementStatus: STATUS.APPROVED, providerApprovedAt: timestamp, settlementErrorCode: null }, { merge: true }),
            context.orderRef.set({ settlementStatus: STATUS.APPROVED, providerApprovedAt: timestamp, settlementErrorCode: null }, { merge: true })
        ]);
        return { applicable: true, success: true, approved: true, paid: false };
    } catch (error) {
        await markReview({ firestore, FieldValue, movementId, code: error.code || "APPROVAL_RESULT_UNKNOWN" });
        return { applicable: true, success: false, reviewRequired: true };
    }
}

async function queryMarketplaceSettlement({ firestore, FieldValue, orderId, query = queryProviderStatus }) {
    const snapshot = await firestore.collection("bakiyeHareketleri").where("siparisId", "==", orderId).limit(2).get();
    const movementDoc = snapshot.docs.find((doc) => doc.get("settlementMode") === MODE);
    if (!movementDoc) throw new MarketplaceSettlementError("Marketplace hakediş kaydı bulunamadı.", "SETTLEMENT_NOT_FOUND", 404);
    const movement = movementDoc.data();
    if (movement.settlementStatus === STATUS.PAID) return { status: STATUS.PAID, alreadyPaid: true };
    if (![STATUS.APPROVED, STATUS.REVIEW_REQUIRED, STATUS.FAILED].includes(movement.settlementStatus)) {
        throw new MarketplaceSettlementError("Settlement henüz sorgulanabilir durumda değil.", "SETTLEMENT_NOT_QUERYABLE");
    }
    const orderDoc = await firestore.collection("siparisler").doc(orderId).get();
    if (!orderDoc.exists) throw new MarketplaceSettlementError("Sipariş bulunamadı.", "ORDER_NOT_FOUND", 404);
    try {
        const status = await query({ paymentTransactionId: movement.paymentTransactionId, date: new Date() });
        if (status === STATUS.PAID) {
            await finalizePaid({ firestore, FieldValue, movementId: movementDoc.id });
            return { status: STATUS.PAID };
        }
        await markReview({ firestore, FieldValue, movementId: movementDoc.id, code: status === STATUS.FAILED ? "PROVIDER_BOUNCED" : "PROVIDER_RESULT_UNKNOWN", status });
        return { status, reserved: true };
    } catch (error) {
        await markReview({ firestore, FieldValue, movementId: movementDoc.id, code: error.code || "PROVIDER_QUERY_FAILED" });
        return { status: STATUS.REVIEW_REQUIRED, reserved: true };
    }
}

module.exports = { MODE, STATUS, PROCESSING_STALE_MS, MarketplaceSettlementError, providerCall, reportDate, containsTransaction, approveProvider, queryProviderStatus, releaseMarketplaceEarning, queryMarketplaceSettlement, finalizePaid };
