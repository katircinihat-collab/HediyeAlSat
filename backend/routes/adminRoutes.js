const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const adminListingController = require("../controllers/adminListingController");
const orderStatusController = require("../controllers/orderStatusController");
const orderClaimController = require("../controllers/orderClaimController");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get("/me", adminListingController.me);
router.put("/listings/:id/approve", adminListingController.onayla);
router.put("/listings/:id/reject", adminListingController.reddet);
router.patch("/listings/:id/flags", adminListingController.ozellikDegistir);
router.delete("/listings/:id", adminListingController.sil);
router.patch("/stores/:id/status", adminListingController.magazaDurumuGuncelle);
router.post("/orders/:orderId/confirm-delivery", orderStatusController.confirmDeliveryAsAdmin);
router.get("/order-claims", orderClaimController.listAdmin);
router.get("/order-claims/:claimId", orderClaimController.getAdmin);
router.patch("/order-claims/:claimId/status", orderClaimController.updateAdminStatus);

module.exports = router;
