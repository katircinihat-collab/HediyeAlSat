const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/userLevelController");
const router = express.Router();
router.get("/me", authMiddleware, controller.mine);
router.post("/public", controller.publicLevels);
router.post("/reviews/:listingId", authMiddleware, controller.review);
module.exports = router;
