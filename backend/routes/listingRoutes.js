const express = require("express");
const controller = require("../controllers/listingImpressionController");
const { impressionRateLimit } = require("../middleware/rateLimit");

const router = express.Router();
router.post("/:id/impression", impressionRateLimit, controller.record);

module.exports = router;
