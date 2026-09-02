const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

// Ödeme Başlat
router.post("/", authMiddleware, paymentController.startPayment);

// Callback
router.post(
  "/callback",
  paymentController.paymentCallback
);

module.exports = router;
