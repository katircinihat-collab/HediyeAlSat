const express = require("express");

const router = express.Router();

const walletController =
    require("../controllers/walletController");


// =====================================================
// PARA ÇEKME TALEBİ OLUŞTUR
// POST /api/withdraw
// =====================================================

router.post("/", walletController.paraCek);


// =====================================================
// KULLANICININ PARA ÇEKME TALEPLERİ
// GET /api/withdraw/:email
// =====================================================

router.get("/:email", walletController.taleplerim);


// =====================================================
// ADMIN - TÜM PARA ÇEKME TALEPLERİ
// GET /api/withdraw/admin
// =====================================================

router.get(
    "/admin",
    walletController.adminTalepler
);


// =====================================================
// ADMIN - PARA ÇEKME TALEBİNİ ONAYLA
// PUT /api/withdraw/approve/:id
// =====================================================

router.put(
    "/approve/:id",
    walletController.onayla
);


// =====================================================
// ADMIN - PARA ÇEKME TALEBİNİ REDDET
// PUT /api/withdraw/reject/:id
// =====================================================

router.put(
    "/reject/:id",
    walletController.reddet
);


module.exports = router;