const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const digitalAssetController = require("../controllers/digitalAssetController");
const { downloadRateLimit } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/status", authMiddleware, digitalAssetController.status);
router.get("/download/:orderId", authMiddleware, downloadRateLimit, digitalAssetController.download);

router.post(
    "/upload/:listingId",
    authMiddleware,
    express.raw({ type: ["application/pdf", "image/jpeg", "image/png"], limit: "15mb" }),
    digitalAssetController.upload
);

router.use((error, _req, res, next) => {
    if (error?.type === "entity.too.large") {
        return res.status(413).json({
            success: false,
            code: "DIGITAL_ASSET_TOO_LARGE",
            message: "Dosya en fazla 15 MB olabilir."
        });
    }
    next(error);
});

module.exports = router;
