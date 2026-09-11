const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { financialRateLimit } = require("../middleware/rateLimit");
const adminListingController = require("../controllers/adminListingController");
const orderStatusController = require("../controllers/orderStatusController");
const orderClaimController = require("../controllers/orderClaimController");
const financialReconciliationController = require("../controllers/financialReconciliationController");
const sellerMarketplaceController = require("../controllers/sellerMarketplaceController");
const sponsorStoreController = require("../controllers/sponsorStoreController");
const adminOperationsController = require("../controllers/adminOperationsController");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get("/me", adminListingController.me);
router.get("/overview", adminOperationsController.overview);
router.get("/users", adminOperationsController.listUsers);
router.patch("/users/:uid/status", adminOperationsController.updateUserStatus);
router.get("/audit-logs", adminOperationsController.auditLogs);
router.put("/listings/:id/approve", adminListingController.onayla);
router.put("/listings/:id/reject", adminListingController.reddet);
router.patch("/listings/:id/flags", adminListingController.ozellikDegistir);
router.patch("/listings/:id/stock", adminListingController.stokGuncelle);
router.patch("/listings/:id/publication", adminListingController.yayinDurumuGuncelle);
router.delete("/listings/:id", adminListingController.sil);
router.patch("/stores/:id/status", adminListingController.magazaDurumuGuncelle);
router.post("/orders/:orderId/confirm-delivery", orderStatusController.confirmDeliveryAsAdmin);
router.get("/order-claims", orderClaimController.listAdmin);
router.get("/order-claims/:claimId", orderClaimController.getAdmin);
router.patch("/order-claims/:claimId/status", orderClaimController.updateAdminStatus);
router.post("/order-claims/:claimId/confirm-return-received", orderClaimController.confirmReturnReceived);
router.patch("/order-claims/:claimId/return-shipment", orderClaimController.correctReturnShipment);
router.post("/order-claims/:claimId/refund", financialRateLimit, orderClaimController.refund);
router.get("/financial-reconciliations", financialReconciliationController.list);
router.get("/financial-reconciliations/:id", financialReconciliationController.get);
router.patch("/financial-reconciliations/:id", financialRateLimit, financialReconciliationController.update);
router.post("/sellers/:sellerUid/marketplace/onboard", financialRateLimit, sellerMarketplaceController.onboardAsAdmin);
router.get("/sponsor-applications", sponsorStoreController.adminList);
router.patch("/sponsor-applications/:id/approve", financialRateLimit, sponsorStoreController.approve);
router.patch("/sponsor-applications/:id/reject", financialRateLimit, sponsorStoreController.reject);

module.exports = router;
