const { firestore } = require("../config/firebase");
const service = require("../services/userLevelService");

async function mine(req, res) {
    try { return res.json({ success: true, levels: service.levels, ...(await service.syncUserLevel({ firestore, uid: req.user.uid, email: req.user.email })) }); }
    catch { return res.status(500).json({ success: false, message: "Seviye bilgisi alınamadı." }); }
}
async function publicLevels(req, res) {
    try { return res.json({ success: true, users: await service.getPublicSummaries(firestore, req.body?.uids), verifiedReviewIds: await service.getVerifiedReviewIds(firestore, req.body?.reviewIds) }); }
    catch { return res.status(500).json({ success: false, message: "Unvanlar alınamadı." }); }
}
async function review(req, res) {
    try { return res.status(201).json({ success: true, ...(await service.createVerifiedProductReview({ firestore, user: req.user, listingId: req.params.listingId, rating: req.body?.rating, comment: req.body?.comment })) }); }
    catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || "Yorum kaydedilemedi." }); }
}
module.exports = { mine, publicLevels, review };
