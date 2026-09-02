const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/orderClaimController");

const router = express.Router();
router.post("/:claimId/cancel", authMiddleware, controller.cancel);
router.post("/:claimId/return-shipment", authMiddleware, controller.submitReturnShipment);
router.post("/:claimId/report-return-received", authMiddleware, controller.reportReturnReceived);
module.exports = router;
