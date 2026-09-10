const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { financialRateLimit } = require("../middleware/rateLimit");
const controller = require("../controllers/sellerMarketplaceController");

const router = express.Router();

router.post("/onboard", authMiddleware, financialRateLimit, controller.onboardSelf);

module.exports = router;
