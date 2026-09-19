const { admin, firestore, FieldValue } = require("../config/firebase");
const { awardXP, getXpProfile, XpError } = require("../services/xpService");

exports.me = async (req, res) => {
    try { return res.json({ success: true, ...(await getXpProfile({ firestore, uid: req.user.uid, limit: req.query.limit })) }); }
    catch { return res.status(500).json({ success: false, message: "XP bilgileri şu anda alınamıyor." }); }
};

exports.welcome = async (req, res) => {
    try {
        const account = await admin.auth().getUser(req.user.uid);
        const age = Date.now() - new Date(account.metadata.creationTime).getTime();
        if (!Number.isFinite(age) || age < 0 || age > 24 * 60 * 60 * 1000) throw new XpError("Hoş geldin bonusu yalnız yeni üyelikte tanımlanır.", 403, "XP_WELCOME_NOT_ELIGIBLE");
        const result = await awardXP({ firestore, FieldValue, uid: req.user.uid, reason: "WELCOME_BONUS", sourceId: req.user.uid });
        return res.status(result.applied ? 201 : 200).json({ success: true, result });
    } catch (error) { return res.status(error.status || 500).json({ success: false, code: error.code || "XP_WELCOME_FAILED", message: error.status ? error.message : "Hoş geldin bonusu tanımlanamadı." }); }
};
