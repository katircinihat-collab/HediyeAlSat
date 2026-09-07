const express = require("express");
const { maintenanceAuth } = require("../middleware/maintenanceAuth");
const { financialRateLimit } = require("../middleware/rateLimit");
const maintenanceController = require("../controllers/maintenanceController");

const router = express.Router();

router.post("/", financialRateLimit, maintenanceAuth, maintenanceController.run);

module.exports = router;
