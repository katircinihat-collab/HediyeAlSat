const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const orderStatusController = require("../controllers/orderStatusController");
const orderClaimController = require("../controllers/orderClaimController");
const sellerOrderArchiveController = require("../controllers/sellerOrderArchiveController");
const { financialRateLimit } = require("../middleware/rateLimit");

const router = express.Router();
router.get("/mine", authMiddleware, orderStatusController.listBuyerOrders);
router.post("/seller/cleanup-preview", authMiddleware, financialRateLimit, sellerOrderArchiveController.preview);
router.post("/:orderId/archive-failed", authMiddleware, financialRateLimit, sellerOrderArchiveController.archive);
router.patch("/:orderId/status", authMiddleware, orderStatusController.updateSellerStatus);
router.post("/:orderId/confirm-delivery", authMiddleware, orderStatusController.confirmDeliveryAsBuyer);
router.post("/:orderId/claim", authMiddleware, orderClaimController.create);

module.exports = router;
