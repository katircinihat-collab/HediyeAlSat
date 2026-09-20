const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/giftBattleController");
const adminMiddleware = require("../middleware/adminMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const { createRateLimit } = require("../middleware/rateLimit");

const router = express.Router();

router.get("/today", controller.today);
router.get("/mine", authMiddleware, controller.mine);
router.post("/vote", authMiddleware, controller.vote);
const createLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 12, message: "Çok fazla kapışma isteği gönderdiniz." });
const voteLimit = createRateLimit({ windowMs: 60 * 1000, max: 40, message: "Çok fazla oy isteği gönderdiniz." });
router.get("/community", controller.feedCommunityBattles);
router.get("/community/:battleId", optionalAuthMiddleware, controller.getCommunityBattle);
router.post("/community", authMiddleware, createLimit, controller.createCommunityBattle);
router.post("/community/:battleId/vote", authMiddleware, voteLimit, controller.voteCommunityBattle);
router.post("/community/:battleId/end", authMiddleware, controller.endCommunityBattle);
router.get("/admin/community", authMiddleware, adminMiddleware, controller.adminListCommunityBattles);
router.patch("/admin/community/:battleId/remove", authMiddleware, adminMiddleware, controller.adminRemoveCommunityBattle);

module.exports = router;
