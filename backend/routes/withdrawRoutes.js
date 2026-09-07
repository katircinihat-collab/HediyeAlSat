const express = require("express");

const router = express.Router();

const walletController =
    require("../controllers/walletController");

const authMiddleware =
    require("../middleware/authMiddleware");

const adminMiddleware =
    require("../middleware/adminMiddleware");
const { financialRateLimit } = require("../middleware/rateLimit");


// =====================================================
// PARA ÇEKME TALEBİ OLUŞTUR
// POST /api/withdraw
// =====================================================

router.post(
    "/",
    authMiddleware,
    financialRateLimit,
    walletController.paraCek
);


// =====================================================
// ADMIN - TÜM PARA ÇEKME TALEPLERİ
// GET /api/withdraw/admin
// =====================================================

router.get(
    "/admin",
    authMiddleware,
    adminMiddleware,
    walletController.adminTalepler
);


// =====================================================
// KULLANICININ PARA ÇEKME TALEPLERİ
// GET /api/withdraw/:email
// =====================================================

router.get(
    "/:email",
    authMiddleware,
    walletController.taleplerim
);


// =====================================================
// ADMIN - PARA ÇEKME TALEBİNİ ONAYLA
// PUT /api/withdraw/approve/:id
// =====================================================

router.put(
    "/approve/:id",
    authMiddleware,
    adminMiddleware,
    financialRateLimit,
    walletController.onayla
);


// =====================================================
// ADMIN - PARA ÇEKME TALEBİNİ REDDET
// PUT /api/withdraw/reject/:id
// =====================================================

router.put(
    "/reject/:id",
    authMiddleware,
    adminMiddleware,
    financialRateLimit,
    walletController.reddet
);


module.exports = router;
