const express = require("express");

const router = express.Router();

const walletReleaseService =
    require("../services/walletReleaseService");

const authMiddleware =
    require("../middleware/authMiddleware");

const adminMiddleware =
    require("../middleware/adminMiddleware");
const { financialRateLimit } = require("../middleware/rateLimit");


// =====================================================
// BLOKAJI DOLAN SATIŞLARI SERBEST BIRAK
// POST /api/wallet-release/run
// =====================================================

router.post(
    "/run",
    authMiddleware,
    adminMiddleware,
    financialRateLimit,
    async (req, res) => {

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

    }
);


// =====================================================
// BLOKAJ DURUMUNU KONTROL ET
// GET /api/wallet-release/check
// =====================================================

router.get(
    "/check",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {

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

    }
);

router.get(
    "/admin/pending",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {

        try {

            const hareketler =
                await walletReleaseService
                    .blokajiDolanlariGetir();

            res.json({

                success: true,

                toplam:
                    hareketler.length,

                hareketler

            });

        }

        catch (error) {

            res.status(500).json({

                success: false,

                error:
                    error.message ||
                    "Blokaj listesi alınamadı."

            });

        }

    }
);

router.get(
    "/admin/:hareketId",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {

        try {

            const hareket =
                await walletReleaseService
                    .hareketDurumuGetir(
                        req.params.hareketId
                    );

            if (!hareket) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Bakiye hareketi bulunamadı."

                });

            }

            res.json({

                success: true,

                hareket

            });

        }

        catch (error) {

            res.status(500).json({

                success: false,

                error:
                    error.message ||
                    "Bakiye hareketi alınamadı."

            });

        }

    }
);


module.exports = router;
