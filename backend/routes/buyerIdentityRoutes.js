const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { financialRateLimit } = require("../middleware/rateLimit");
const controller = require("../controllers/buyerIdentityController");

const router = express.Router();

router.get("/", authMiddleware, financialRateLimit, controller.get);
router.put("/", authMiddleware, financialRateLimit, controller.save);

module.exports = router;
