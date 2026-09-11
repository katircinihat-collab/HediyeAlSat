const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const controller = require("../controllers/sponsorStoreController");
const router = express.Router();
router.use(authMiddleware);
router.post("/applications", controller.create);
router.get("/applications/mine", controller.mine);
module.exports = router;
