const { firestore } = require("../config/firebase");
const { OrderClaimError, createClaim, cancelClaim, updateClaimStatus, submitReturnShipment, reportReturnReceived, confirmReturnReceived, correctReturnShipment } = require("../services/orderClaimService");

function sendError(res, error) {
    return res.status(error.status || 500).json({ success: false, code: error.code || "ORDER_CLAIM_FAILED", message: error instanceof OrderClaimError ? error.message : "Talep işlemi tamamlanamadı." });
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
        return res.json({ success: true, claims: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
    } catch { return res.status(500).json({ success: false, message: "Talepler yüklenemedi." }); }
};
exports.getAdmin = async (req, res) => {
    try { const snap = await firestore.collection("orderClaims").doc(String(req.params.claimId || "")).get(); if (!snap.exists) throw new OrderClaimError("Talep bulunamadı.", 404, "CLAIM_NOT_FOUND"); return res.json({ success: true, claim: { id: snap.id, ...snap.data() } }); }
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
