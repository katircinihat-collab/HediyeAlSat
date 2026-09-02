const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const orderStatusController = require("../controllers/orderStatusController");

const router = express.Router();
router.patch("/:orderId/status", authMiddleware, orderStatusController.updateSellerStatus);
router.post("/:orderId/confirm-delivery", authMiddleware, orderStatusController.confirmDeliveryAsBuyer);

module.exports = router;
