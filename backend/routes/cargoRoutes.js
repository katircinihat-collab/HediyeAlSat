const express = require("express");

const router = express.Router();

const cargoController = require("../controllers/cargoController");

/*
==========================================
TÜM KARGOLARI KONTROL ET
==========================================
*/

router.post(
    "/check",
    cargoController.kargolariKontrolEt
);

/*
==========================================
TEK KARGO KONTROL
==========================================
*/

router.post(
    "/check/:siparisId",
    cargoController.kargoKontrol
);

module.exports = router;