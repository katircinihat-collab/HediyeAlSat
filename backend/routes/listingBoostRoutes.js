const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { financialRateLimit } = require("../middleware/rateLimit");
const controller = require("../controllers/listingBoostController");

const router = express.Router();
router.post("/initialize", authMiddleware, financialRateLimit, controller.initialize);

module.exports = router;
