const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");
const { financialRateLimit } = require("../middleware/rateLimit");

// Ödeme Başlat
router.post("/", authMiddleware, financialRateLimit, paymentController.startPayment);

// Callback
router.post(
  "/callback",
  paymentController.paymentCallback
);

module.exports = router;
