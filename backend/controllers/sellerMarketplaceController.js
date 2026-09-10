const { ensureSellerMarketplaceProfile } = require("../services/sellerOnboardingService");

function safeError(res, error) {
    const body = {
        success: false,
        code: error.code || "SELLER_MARKETPLACE_ERROR",
        message: error.message || "Satıcı ödeme hesabı işlemi tamamlanamadı."
    };
    if (error.code === "SELLER_MARKETPLACE_INFO_INCOMPLETE") {
        body.missingFields = Array.isArray(error.missingFields) ? error.missingFields : [];
    }
    return res.status(error.status || 500).json(body);
}

async function onboardSelf(req, res) {
    try {
        const result = await ensureSellerMarketplaceProfile(req.user.uid, req.body || {});
        return res.json({ success: true, status: result.status });
    } catch (error) {
        return safeError(res, error);
    }
}

async function onboardAsAdmin(req, res) {
    try {
        const result = await ensureSellerMarketplaceProfile(req.params.sellerUid, req.body || {});
        return res.json({ success: true, status: result.status });
    } catch (error) {
        return safeError(res, error);
    }
}

module.exports = { onboardSelf, onboardAsAdmin };
