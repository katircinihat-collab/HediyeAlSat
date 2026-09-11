const paymentService = require("../services/paymentService");

async function initialize(req, res) {
    try {
        const result = await paymentService.createPayment({
            listingBoost: true,
            listingId: req.body?.listingId,
            packageId: req.body?.packageId
        }, req.user, { ip: req.ip });
        return res.json(result);
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            code: error.code || "LISTING_BOOST_PAYMENT_FAILED",
            message: error.status ? error.message : "Öne çıkarma ödemesi başlatılamadı."
        });
    }
}

module.exports = { initialize };
