const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/xpController");
const router = express.Router();
router.use(authMiddleware);
router.get("/me", controller.me);
router.post("/welcome", controller.welcome);
module.exports = router;
