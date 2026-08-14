const express = require("express");

const router = express.Router();

const walletController =
    require("../controllers/walletController");

const authMiddleware =
    require("../middleware/authMiddleware");


// =====================================================
// WALLET GETİR
// GET /api/wallet/:email
// =====================================================

router.get(
    "/:email",
    authMiddleware,
    walletController.getWallet
);


// =====================================================
// IBAN KAYDET
// POST /api/wallet/save-iban
// =====================================================

router.post(
    "/save-iban",
    authMiddleware,
    walletController.ibanKaydet
);


// =====================================================
// PARA ÇEKME TALEBİ
// POST /api/wallet/withdraw
// =====================================================

router.post(
    "/withdraw",
    authMiddleware,
    walletController.paraCek
);


// =====================================================
// KULLANICININ PARA ÇEKME TALEPLERİ
// GET /api/wallet/withdraw/:email
// =====================================================

router.get(
    "/withdraw/:email",
    authMiddleware,
    walletController.taleplerim
);


// =====================================================
// ADMIN - TÜM PARA ÇEKME TALEPLERİ
// GET /api/wallet/admin/withdraw
// =====================================================

router.get(
    "/admin/withdraw",
    authMiddleware,
    walletController.adminTalepler
);


// =====================================================
// ADMIN - PARA ÇEKME ONAYLA
// PUT /api/wallet/admin/withdraw/approve/:id
// =====================================================

router.put(
    "/admin/withdraw/approve/:id",
    authMiddleware,
    walletController.onayla
);


// =====================================================
// ADMIN - PARA ÇEKME REDDET
// PUT /api/wallet/admin/withdraw/reject/:id
// =====================================================

router.put(
    "/admin/withdraw/reject/:id",
    authMiddleware,
    walletController.reddet
);


module.exports = router;