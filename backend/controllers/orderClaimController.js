const { firestore } = require("../config/firebase");
const { OrderClaimError, createClaim, cancelClaim, updateClaimStatus, submitReturnShipment, reportReturnReceived, confirmReturnReceived, correctReturnShipment } = require("../services/orderClaimService");
const iyzipay = require("../config/iyzico");
const { RefundError, executeRefund, createIyzicoRefundProvider } = require("../services/iyzicoRefundService");

function sendError(res, error) {
    return res.status(error.status || 500).json({ success: false, code: error.code || "ORDER_CLAIM_FAILED", message: error instanceof OrderClaimError || error instanceof RefundError ? error.message : "Talep işlemi tamamlanamadı." });
}
function maskTransaction(value) { const text = String(value || ""); return text.length > 8 ? `${text.slice(0, 4)}…${text.slice(-4)}` : text ? "••••" : null; }
async function withRefundPreview(claim) {
    if (claim.tip !== "iade") return claim;
    const orderSnap = await firestore.collection("siparisler").doc(claim.orderId).get();
    if (!orderSnap.exists) return claim;
    const order = orderSnap.data();
    return { ...claim, refundPreview: { amount: order.iyzicoItemPaidPrice ?? null, currency: order.paymentCurrency || "TRY", paymentTransactionIdMasked: maskTransaction(order.paymentTransactionId), available: Boolean(order.paymentTransactionId && order.iyzicoItemPaidPrice) } };
}
exports.create = async (req, res) => {
    try {
        const result = await createClaim({ firestore, orderId: String(req.params.orderId || "").trim(), user: req.user, body: req.body });
        return res.status(result.idempotent ? 200 : 201).json({ success: true, idempotent: result.idempotent, claimId: result.claimId, message: result.idempotent ? "Bu sipariş için aktif bir talep zaten bulunuyor." : "Talebiniz incelemeye alındı. Satıcı hakedişi inceleme süresince bekletilir." });
    } catch (error) { return sendError(res, error); }
};
exports.cancel = async (req, res) => {
    try { return res.json({ success: true, ...(await cancelClaim({ firestore, claimId: String(req.params.claimId || "").trim(), user: req.user })) }); }
    catch (error) { return sendError(res, error); }
};
exports.listAdmin = async (_req, res) => {
    try {
        const snap = await firestore.collection("orderClaims").orderBy("createdAt", "desc").limit(200).get();
        const claims = await Promise.all(snap.docs.map((doc) => withRefundPreview({ id: doc.id, ...doc.data() })));
        return res.json({ success: true, claims });
    } catch { return res.status(500).json({ success: false, message: "Talepler yüklenemedi." }); }
};
exports.getAdmin = async (req, res) => {
    try { const snap = await firestore.collection("orderClaims").doc(String(req.params.claimId || "")).get(); if (!snap.exists) throw new OrderClaimError("Talep bulunamadı.", 404, "CLAIM_NOT_FOUND"); return res.json({ success: true, claim: await withRefundPreview({ id: snap.id, ...snap.data() }) }); }
    catch (error) { return sendError(res, error); }
};
exports.updateAdminStatus = async (req, res) => {
    try { return res.json({ success: true, ...(await updateClaimStatus({ firestore, claimId: String(req.params.claimId || "").trim(), status: req.body?.status, resolutionNote: req.body?.resolutionNote, admin: req.user })) }); }
    catch (error) { return sendError(res, error); }
};
exports.submitReturnShipment = async (req, res) => {
    try { return res.json({ success: true, ...(await submitReturnShipment({ firestore, claimId: String(req.params.claimId || "").trim(), user: req.user, body: req.body })) }); }
    catch (error) { return sendError(res, error); }
};
exports.reportReturnReceived = async (req, res) => {
    try { return res.json({ success: true, ...(await reportReturnReceived({ firestore, claimId: String(req.params.claimId || "").trim(), user: req.user })) }); }
    catch (error) { return sendError(res, error); }
};
exports.confirmReturnReceived = async (req, res) => {
    try { return res.json({ success: true, ...(await confirmReturnReceived({ firestore, claimId: String(req.params.claimId || "").trim(), admin: req.user, note: req.body?.note })) }); }
    catch (error) { return sendError(res, error); }
};
exports.correctReturnShipment = async (req, res) => {
    try { return res.json({ success: true, ...(await correctReturnShipment({ firestore, claimId: String(req.params.claimId || "").trim(), admin: req.user, body: req.body })) }); }
    catch (error) { return sendError(res, error); }
};
exports.refund = async (req, res) => {
    try {
        const refundProvider = createIyzicoRefundProvider(iyzipay);
        const result = await executeRefund({ firestore, claimId: String(req.params.claimId || "").trim(), admin: req.user, refundProvider, ip: req.ip, description: req.body?.description });
        return res.json({ success: true, idempotent: result.idempotent, status: result.status, message: "Ödeme kuruluşu üzerinden para iadesi başlatıldı." });
    } catch (error) { return sendError(res, error); }
};
