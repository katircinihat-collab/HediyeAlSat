const express = require("express");

const router = express.Router();

const walletReleaseService =
    require("../services/walletReleaseService");


// =====================================================
// BLOKAJI DOLAN SATIŞLARI SERBEST BIRAK
// POST /api/wallet-release/run
// =====================================================

router.post("/run", async (req, res) => {

    try {

        const sonuc =
    await walletReleaseService.blokajiDolanlariAktar();


        res.json({

            success: true,

            message:
                "Blokaj süresi dolan satışlar kontrol edildi.",

            ...sonuc

        });

    }

    catch (error) {

        console.error(
            "Wallet release hatası:",
            error
        );


        res.status(500).json({

            success: false,

            error:
                error.message ||
                "Wallet release işlemi başarısız."

        });

    }

});


// =====================================================
// BLOKAJ DURUMUNU KONTROL ET
// GET /api/wallet-release/check
// =====================================================

router.get("/check", async (req, res) => {

    try {

        const sonuc =
    await walletReleaseService
        .blokajiDolanlariGetir();


        res.json({

            success: true,

            ...sonuc

        });

    }

    catch (error) {

        console.error(
            "Wallet release kontrol hatası:",
            error
        );


        res.status(500).json({

            success: false,

            error:
                error.message ||
                "Kontrol başarısız."

        });

    }

});


module.exports = router;