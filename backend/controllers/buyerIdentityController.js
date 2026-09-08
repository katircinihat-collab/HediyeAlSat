const buyerIdentityService = require("../services/buyerIdentityService");

exports.get = async (req, res) => {
    try {
        const result = await buyerIdentityService.getMaskedBuyerIdentity(req.user.uid);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            code: error.code || "BUYER_IDENTITY_READ_FAILED",
            message: error.status ? error.message : "Kimlik bilgisi durumu alınamadı."
        });
    }
};

exports.save = async (req, res) => {
    try {
        const result = await buyerIdentityService.saveBuyerIdentity(
            req.user.uid,
            req.body?.identityNumber
        );
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            code: error.code || "BUYER_IDENTITY_SAVE_FAILED",
            message: error.status ? error.message : "Kimlik bilgisi kaydedilemedi."
        });
    }
};
