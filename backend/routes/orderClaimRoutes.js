const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/orderClaimController");

const router = express.Router();
router.post("/:claimId/cancel", authMiddleware, controller.cancel);
module.exports = router;
