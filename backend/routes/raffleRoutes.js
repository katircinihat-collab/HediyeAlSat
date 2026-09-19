const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { createRateLimit } = require("../middleware/rateLimit");
const controller = require("../controllers/raffleController");

const router = express.Router();
const chatRateLimit = createRateLimit({ windowMs: 60 * 1000, max: 10, message: "Çok hızlı mesaj gönderiyorsunuz. Lütfen kısa süre bekleyin." });

router.get("/active", controller.active);
router.get("/:eventId/messages", controller.messages);
router.get("/:eventId/me", authMiddleware, controller.me);
router.post("/:eventId/join", authMiddleware, controller.join);
router.delete("/:eventId/join", authMiddleware, controller.cancel);
router.patch("/:eventId/hint", authMiddleware, controller.updateHint);
router.get("/:eventId/result", authMiddleware, controller.result);
router.post("/:eventId/messages", authMiddleware, chatRateLimit, controller.sendMessage);

module.exports = router;
