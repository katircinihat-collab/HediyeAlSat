const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");

// Ödeme Başlat
router.post("/", paymentController.startPayment);

// Callback
router.post(
  "/callback",
  (req, res, next) => {
    console.log("=== CALLBACK GELDİ ===");
    console.log(req.body);
    next();
  },
  paymentController.paymentCallback
);

module.exports = router;