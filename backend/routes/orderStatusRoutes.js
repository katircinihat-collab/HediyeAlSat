const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const orderStatusController = require("../controllers/orderStatusController");
const orderClaimController = require("../controllers/orderClaimController");

const router = express.Router();
router.patch("/:orderId/status", authMiddleware, orderStatusController.updateSellerStatus);
router.post("/:orderId/confirm-delivery", authMiddleware, orderStatusController.confirmDeliveryAsBuyer);
router.post("/:orderId/claim", authMiddleware, orderClaimController.create);

module.exports = router;
