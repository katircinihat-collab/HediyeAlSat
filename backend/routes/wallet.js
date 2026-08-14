const express =
    require("express");

const router =
    express.Router();

const walletController =
    require("../controllers/walletController");


/*
Cüzdan
*/

router.get(
    "/",
    walletController.getWallet
);


/*
IBAN
*/

router.post(
    "/iban",
    walletController.ibanKaydet
);


/*
Para çekme
*/

router.post(
    "/withdraw",
    walletController.paraCek
);


/*
Satıcının para çekme talepleri
*/

router.get(
    "/withdrawals",
    walletController.taleplerim
);


/*
Admin
*/

router.get(
    "/admin/withdrawals",
    walletController.adminTalepler
);


router.post(
    "/admin/withdrawals/:id/approve",
    walletController.onayla
);


router.post(
    "/admin/withdrawals/:id/reject",
    walletController.reddet
);


module.exports = router;