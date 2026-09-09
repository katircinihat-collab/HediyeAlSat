const { firestore } = require("../config/firebase");
const { recordListingImpression } = require("../services/listingImpressionService");

async function record(req, res) {
    try {
        const result = await recordListingImpression({ firestore, listingId: req.params.id });
        return res.json({ success: true, ...result });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            code: error.code || "IMPRESSION_FAILED",
            message: error.status ? error.message : "Gösterim kaydedilemedi."
        });
    }
}

module.exports = { record };
