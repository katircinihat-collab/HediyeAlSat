const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const adminListingController = require("../controllers/adminListingController");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get("/me", adminListingController.me);
router.put("/listings/:id/approve", adminListingController.onayla);
router.put("/listings/:id/reject", adminListingController.reddet);
router.patch("/listings/:id/flags", adminListingController.ozellikDegistir);
router.delete("/listings/:id", adminListingController.sil);
router.patch("/stores/:id/status", adminListingController.magazaDurumuGuncelle);

module.exports = router;
