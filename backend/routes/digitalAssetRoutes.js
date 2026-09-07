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

module.exports = router;
