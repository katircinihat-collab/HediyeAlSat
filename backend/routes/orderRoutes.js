const express = require("express");

const router = express.Router();

const orderController = require("../controllers/orderController");

/*
==========================================
SİPARİŞİ ÖDENDİ YAP
==========================================
*/

router.post(
    "/paid",
    orderController.siparisOdendi
);

/*
==========================================
SEPETİ TEMİZLE
==========================================
*/

router.post(
    "/clear-cart",
    orderController.sepetTemizle
);

module.exports = router;