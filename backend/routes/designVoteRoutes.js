const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/designVoteController");

const router = express.Router();

router.get("/top", controller.top);
router.get("/mine", authMiddleware, controller.mine);
router.post("/summary", controller.summary);
router.post("/:listingId", authMiddleware, controller.create);
router.delete("/:listingId", authMiddleware, controller.remove);

module.exports = router;
