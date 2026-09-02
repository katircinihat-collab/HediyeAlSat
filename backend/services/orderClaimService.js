const { normalizeOrderStatus, ORDER_STATUSES } = require("../constants/orderStatuses");
const { getPayoutEligibility } = require("./deliveryConfirmationService");

const CLAIM_STATUSES = Object.freeze({ OPEN: "acik", REVIEW: "inceleniyor", ACCEPTED: "kabul_edildi", REJECTED: "reddedildi", CANCELLED: "iptal_edildi" });
const ACTIVE_CLAIM_STATUSES = new Set([CLAIM_STATUSES.OPEN, CLAIM_STATUSES.REVIEW, CLAIM_STATUSES.ACCEPTED]);
const ADMIN_TRANSITIONS = Object.freeze({
    [CLAIM_STATUSES.OPEN]: new Set([CLAIM_STATUSES.REVIEW, CLAIM_STATUSES.REJECTED]),
    [CLAIM_STATUSES.REVIEW]: new Set([CLAIM_STATUSES.ACCEPTED, CLAIM_STATUSES.REJECTED])
});
const RETURN_FLOW_STATUSES = Object.freeze({ WAITING: "bekliyor", SHIPPED: "kargoya_verildi", VERIFIED: "teslim_dogrulandi" });

class OrderClaimError extends Error {
    constructor(message, status = 400, code = "ORDER_CLAIM_FAILED") { super(message); this.status = status; this.code = code; }
}

function ownsOrder(order, user) {
    return Boolean((user.uid && order.aliciUid === user.uid) || (user.email && (order.alici === user.email || order.kullanici === user.email)));
}
function cleanText(value, max, required = false) {
    const text = String(value || "").trim();
    if (required && !text) throw new OrderClaimError("Talep nedeni zorunludur.");
    if (text.length > max) throw new OrderClaimError(`Metin en fazla ${max} karakter olabilir.`);
    return text;
}
function sellerOwnsOrder(order, user) {
    return Boolean((user.uid && order.saticiUid === user.uid) || (user.email && (order.saticiEmail === user.email || order.satici === user.email)));
}
function validateShipmentFields(body = {}) {
    const carrier = cleanText(body.carrier, 80, true);
    const trackingNumber = cleanText(body.trackingNumber, 100, true);
    if (!/^[\p{L}\p{N} ._\-/]+$/u.test(carrier)) throw new OrderClaimError("Kargo firması geçersiz karakter içeriyor.");
    if (!/^[A-Za-z0-9._\-/]+$/.test(trackingNumber)) throw new OrderClaimError("Takip numarası geçersiz karakter içeriyor.");
    return { carrier, trackingNumber };
}
function assertAcceptedPhysicalReturn(claim, order, listing) {
    if (claim.tip !== "iade") throw new OrderClaimError("İtiraz taleplerinde geri kargo akışı kullanılamaz.", 409, "NOT_RETURN_CLAIM");
    if (claim.durum !== CLAIM_STATUSES.ACCEPTED || claim.payoutBlock !== true) throw new OrderClaimError("Geri kargo yalnız kabul edilmiş ve blokesi açık iade taleplerinde kullanılabilir.", 409, "RETURN_NOT_ACCEPTED");
    if (!order || !listing) throw new OrderClaimError("İade ürün ilişkisi doğrulanamadı.", 409, "LISTING_NOT_VERIFIED");
    if (listing.urunTipi === "dijital" || listing.fizikselKargo === false) throw new OrderClaimError("Dijital ürünlerde fiziksel geri kargo kullanılamaz.", 409, "DIGITAL_RETURN_NOT_ALLOWED");
}
async function readReturnContext(tx, firestore, claimId) {
    const claimRef = firestore.collection("orderClaims").doc(claimId); const claimSnap = await tx.get(claimRef);
    if (!claimSnap.exists) throw new OrderClaimError("Talep bulunamadı.", 404, "CLAIM_NOT_FOUND");
    const claim = claimSnap.data(); const orderRef = firestore.collection("siparisler").doc(claim.orderId); const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new OrderClaimError("Sipariş bulunamadı.", 404, "ORDER_NOT_FOUND");
    const order = orderSnap.data(); const listingId = order.ilanId || order.urunId;
    if (!listingId) throw new OrderClaimError("İade ürün ilişkisi doğrulanamadı.", 409, "LISTING_NOT_VERIFIED");
    const listingSnap = await tx.get(firestore.collection("ilanlar").doc(listingId));
    assertAcceptedPhysicalReturn(claim, order, listingSnap.exists ? listingSnap.data() : null);
    return { claimRef, claim, orderRef, order, listingId };
}
function validateClaimRequest(order, user, body) {
    if (!order) throw new OrderClaimError("Sipariş bulunamadı.", 404, "ORDER_NOT_FOUND");
    if (!ownsOrder(order, user)) throw new OrderClaimError("Bu sipariş için talep oluşturamazsınız.", 403, "ORDER_FORBIDDEN");
    if (order.odemeDurumu !== true) throw new OrderClaimError("Ödemesi alınmamış sipariş için talep oluşturulamaz.", 409, "ORDER_NOT_PAID");
    const tip = body.type === "iade" || body.type === "itiraz" ? body.type : null;
    if (!tip) throw new OrderClaimError("Talep tipi geçersiz.");
    const status = normalizeOrderStatus(order.durum);
    if (status === ORDER_STATUSES.IPTAL || status === ORDER_STATUSES.IADE) throw new OrderClaimError("Bu sipariş için talep oluşturulamaz.", 409, "ORDER_CLOSED");
    if (tip === "iade" && (status !== ORDER_STATUSES.TESLIM_EDILDI || order.teslimatDogrulandi !== true || order.urunTipi === "dijital")) {
        throw new OrderClaimError("İade talebi yalnız teslimatı doğrulanmış fiziksel siparişlerde açılabilir.", 409, "RETURN_NOT_AVAILABLE");
    }
    if (tip === "itiraz" && ![ORDER_STATUSES.KARGODA, ORDER_STATUSES.TESLIM_EDILDI].includes(status)) {
        throw new OrderClaimError("Bu sipariş aşamasında itiraz oluşturulamaz.", 409, "DISPUTE_NOT_AVAILABLE");
    }
    return { tip, nedenKodu: cleanText(body.reasonCode, 80, true), aciklama: cleanText(body.description, 2000) };
}
function releasedOrderUpdate(order, now) {
    const cleared = { ...order, hakEdisBlokeli: false, aktifTalepId: null, hakEdisBlokeNedeni: null };
    const eligibility = getPayoutEligibility(cleared, now);
    return { hakEdisBlokeli: false, aktifTalepId: null, hakEdisBlokeNedeni: null, hakEdisDurumu: eligibility.status, guncellenmeTarihi: now };
}
async function createClaim({ firestore, orderId, user, body, now = () => new Date() }) {
    const claimRef = firestore.collection("orderClaims").doc();
    const guardRef = firestore.collection("orderClaimGuards").doc(orderId);
    return firestore.runTransaction(async (tx) => {
        const orderRef = firestore.collection("siparisler").doc(orderId);
        const [orderSnap, guardSnap] = await Promise.all([tx.get(orderRef), tx.get(guardRef)]);
        if (!orderSnap.exists) throw new OrderClaimError("Sipariş bulunamadı.", 404, "ORDER_NOT_FOUND");
        const input = validateClaimRequest(orderSnap.data(), user, body || {});
        if (guardSnap.exists) return { idempotent: true, claimId: guardSnap.data().claimId };
        const order = orderSnap.data(); const timestamp = now();
        const claim = { orderId, buyerUid: user.uid, buyerEmail: user.email || null, sellerUid: order.saticiUid || null, sellerEmail: order.saticiEmail || order.satici || null, ...input, durum: CLAIM_STATUSES.OPEN, createdAt: timestamp, updatedAt: timestamp, resolvedAt: null, resolvedBy: null, resolutionNote: null, payoutBlock: true };
        tx.create(claimRef, claim);
        tx.create(guardRef, { orderId, claimId: claimRef.id, createdAt: timestamp });
        tx.update(orderRef, { hakEdisBlokeli: true, hakEdisBlokeNedeni: input.tip === "iade" ? "iade_talebi" : "itiraz", aktifTalepId: claimRef.id, hakEdisDurumu: "İncelemede", guncellenmeTarihi: timestamp });
        return { idempotent: false, claimId: claimRef.id, claim };
    });
}
async function cancelClaim({ firestore, claimId, user, now = () => new Date() }) {
    return firestore.runTransaction(async (tx) => {
        const claimRef = firestore.collection("orderClaims").doc(claimId); const claimSnap = await tx.get(claimRef);
        if (!claimSnap.exists) throw new OrderClaimError("Talep bulunamadı.", 404, "CLAIM_NOT_FOUND");
        const claim = claimSnap.data();
        if (claim.buyerUid !== user.uid) throw new OrderClaimError("Bu talebi iptal edemezsiniz.", 403, "CLAIM_FORBIDDEN");
        if (claim.durum !== CLAIM_STATUSES.OPEN) throw new OrderClaimError("Yalnız açık talep iptal edilebilir.", 409, "INVALID_CLAIM_TRANSITION");
        const orderRef = firestore.collection("siparisler").doc(claim.orderId); const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) throw new OrderClaimError("Sipariş bulunamadı.", 404, "ORDER_NOT_FOUND");
        const timestamp = now();
        tx.update(claimRef, { durum: CLAIM_STATUSES.CANCELLED, payoutBlock: false, updatedAt: timestamp, resolvedAt: timestamp, resolvedBy: user.uid });
        tx.delete(firestore.collection("orderClaimGuards").doc(claim.orderId));
        tx.update(orderRef, releasedOrderUpdate(orderSnap.data(), timestamp));
        return { claimId, durum: CLAIM_STATUSES.CANCELLED };
    });
}
async function updateClaimStatus({ firestore, claimId, status, admin, resolutionNote, now = () => new Date() }) {
    return firestore.runTransaction(async (tx) => {
        const claimRef = firestore.collection("orderClaims").doc(claimId); const claimSnap = await tx.get(claimRef);
        if (!claimSnap.exists) throw new OrderClaimError("Talep bulunamadı.", 404, "CLAIM_NOT_FOUND");
        const claim = claimSnap.data();
        if (!ADMIN_TRANSITIONS[claim.durum]?.has(status)) throw new OrderClaimError("Geçersiz talep durum geçişi.", 409, "INVALID_CLAIM_TRANSITION");
        const timestamp = now(); const note = cleanText(resolutionNote, 2000);
        const update = { durum: status, updatedAt: timestamp, resolutionNote: note || null };
        if (status === CLAIM_STATUSES.REJECTED) {
            const orderRef = firestore.collection("siparisler").doc(claim.orderId); const orderSnap = await tx.get(orderRef);
            if (!orderSnap.exists) throw new OrderClaimError("Sipariş bulunamadı.", 404, "ORDER_NOT_FOUND");
            Object.assign(update, { payoutBlock: false, resolvedAt: timestamp, resolvedBy: admin.uid || admin.email });
            tx.delete(firestore.collection("orderClaimGuards").doc(claim.orderId));
            tx.update(orderRef, releasedOrderUpdate(orderSnap.data(), timestamp));
        } else if (status === CLAIM_STATUSES.ACCEPTED) {
            Object.assign(update, { payoutBlock: true, resolvedAt: timestamp, resolvedBy: admin.uid || admin.email });
            if (claim.tip === "iade") Object.assign(update, { returnFlowStatus: RETURN_FLOW_STATUSES.WAITING, returnUpdatedAt: timestamp });
        }
        tx.update(claimRef, update);
        return { claimId, durum: status, payoutBlock: update.payoutBlock ?? claim.payoutBlock };
    });
}

async function submitReturnShipment({ firestore, claimId, user, body, now = () => new Date() }) {
    return firestore.runTransaction(async (tx) => {
        const context = await readReturnContext(tx, firestore, claimId); const { claimRef, claim } = context;
        if (claim.buyerUid !== user.uid) throw new OrderClaimError("Bu iade için kargo bilgisi giremezsiniz.", 403, "CLAIM_FORBIDDEN");
        const shipment = validateShipmentFields(body); const current = claim.returnFlowStatus || RETURN_FLOW_STATUSES.WAITING;
        if (current === RETURN_FLOW_STATUSES.SHIPPED) {
            if (claim.returnCarrier === shipment.carrier && claim.returnTrackingNumber === shipment.trackingNumber) return { idempotent: true, claimId, ...shipment };
            throw new OrderClaimError("Kayıtlı geri kargo bilgisi alıcı tarafından değiştirilemez.", 409, "RETURN_SHIPMENT_IMMUTABLE");
        }
        if (current !== RETURN_FLOW_STATUSES.WAITING) throw new OrderClaimError("Geri kargo bilgisi bu aşamada değiştirilemez.", 409, "INVALID_RETURN_FLOW");
        const timestamp = now();
        tx.update(claimRef, { returnFlowStatus: RETURN_FLOW_STATUSES.SHIPPED, returnCarrier: shipment.carrier, returnTrackingNumber: shipment.trackingNumber, returnShippedAt: timestamp, returnUpdatedAt: timestamp });
        return { idempotent: false, claimId, ...shipment, returnShippedAt: timestamp };
    });
}
async function reportReturnReceived({ firestore, claimId, user, now = () => new Date() }) {
    return firestore.runTransaction(async (tx) => {
        const { claimRef, claim, order } = await readReturnContext(tx, firestore, claimId);
        if (!sellerOwnsOrder(order, user)) throw new OrderClaimError("Bu iade için teslim bildirimi yapamazsınız.", 403, "CLAIM_FORBIDDEN");
        if ((claim.returnFlowStatus || RETURN_FLOW_STATUSES.WAITING) !== RETURN_FLOW_STATUSES.SHIPPED) throw new OrderClaimError("İade henüz geri kargoya verilmemiş.", 409, "RETURN_NOT_SHIPPED");
        if (claim.sellerReturnReceivedReported === true) return { idempotent: true, claimId };
        const timestamp = now(); tx.update(claimRef, { sellerReturnReceivedReported: true, sellerReturnReceivedReportedAt: timestamp, sellerReturnReceivedReportedBy: user.uid, returnUpdatedAt: timestamp });
        return { idempotent: false, claimId };
    });
}
async function confirmReturnReceived({ firestore, claimId, admin, note, now = () => new Date() }) {
    return firestore.runTransaction(async (tx) => {
        const { claimRef, claim, orderRef } = await readReturnContext(tx, firestore, claimId);
        if (claim.returnFlowStatus === RETURN_FLOW_STATUSES.VERIFIED) return { idempotent: true, claimId };
        if (claim.returnFlowStatus !== RETURN_FLOW_STATUSES.SHIPPED) throw new OrderClaimError("İade henüz geri kargoya verilmemiş.", 409, "RETURN_NOT_SHIPPED");
        const timestamp = now();
        tx.update(claimRef, { returnFlowStatus: RETURN_FLOW_STATUSES.VERIFIED, returnReceivedAt: timestamp, returnReceivedConfirmationType: "admin", returnReceivedConfirmedBy: admin.uid || admin.email, returnReceivedNote: cleanText(note, 2000), returnUpdatedAt: timestamp, payoutBlock: true });
        tx.update(orderRef, { hakEdisBlokeli: true, hakEdisDurumu: "İncelemede", aktifTalepId: claimId, guncellenmeTarihi: timestamp });
        return { idempotent: false, claimId, returnReceivedAt: timestamp };
    });
}
async function correctReturnShipment({ firestore, claimId, admin, body, now = () => new Date() }) {
    return firestore.runTransaction(async (tx) => {
        const { claimRef, claim } = await readReturnContext(tx, firestore, claimId);
        if (![RETURN_FLOW_STATUSES.SHIPPED, RETURN_FLOW_STATUSES.VERIFIED].includes(claim.returnFlowStatus)) throw new OrderClaimError("Düzeltilecek geri kargo kaydı bulunamadı.", 409, "RETURN_NOT_SHIPPED");
        const shipment = validateShipmentFields(body); const timestamp = now();
        tx.update(claimRef, { returnCarrier: shipment.carrier, returnTrackingNumber: shipment.trackingNumber, returnShipmentCorrectedAt: timestamp, returnShipmentCorrectedBy: admin.uid || admin.email, returnUpdatedAt: timestamp });
        return { claimId, ...shipment };
    });
}

module.exports = { CLAIM_STATUSES, ACTIVE_CLAIM_STATUSES, ADMIN_TRANSITIONS, RETURN_FLOW_STATUSES, OrderClaimError, ownsOrder, sellerOwnsOrder, validateClaimRequest, validateShipmentFields, assertAcceptedPhysicalReturn, releasedOrderUpdate, createClaim, cancelClaim, updateClaimStatus, submitReturnShipment, reportReturnReceived, confirmReturnReceived, correctReturnShipment };
