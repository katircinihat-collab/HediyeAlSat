const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/giftBattleController");

const router = express.Router();

router.get("/today", controller.today);
router.get("/mine", authMiddleware, controller.mine);
router.post("/vote", authMiddleware, controller.vote);

module.exports = router;
