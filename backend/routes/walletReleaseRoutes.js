const express = require("express");

const router = express.Router();

const walletReleaseService =
    require("../services/walletReleaseService");

const authMiddleware =
    require("../middleware/authMiddleware");

const adminMiddleware =
    require("../middleware/adminMiddleware");


// =====================================================
// BLOKAJI DOLAN SATIŞLARI SERBEST BIRAK
// POST /api/wallet-release/run
// =====================================================

router.post(
    "/run",
    authMiddleware,
    adminMiddleware,
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

router.post(
    "/admin/release",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {

        try {

            const {
                hareketId
            } = req.body;

            if (!hareketId) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Hareket ID gerekli."

                });

            }

            const sonuc =
                await walletReleaseService
                    .hareketiBalanceAktar(
                        hareketId
                    );

            res.json({

                success:
                    sonuc.success,

                message:
                    sonuc.success
                        ? "Satış kullanılabilir bakiyeye aktarıldı."
                        : sonuc.neden,

                ...sonuc

            });

        }

        catch (error) {

            res.status(400).json({

                success: false,

                error:
                    error.message ||
                    "Bakiye aktarma işlemi başarısız."

            });

        }

    }
);

router.post(
    "/admin/release-all",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {

        try {

            const sonuc =
                await walletReleaseService
                    .blokajiDolanlariAktar();

            res.json({

                success: true,

                message:
                    "Blokajı dolan satışlar işlendi.",

                ...sonuc

            });

        }

        catch (error) {

            res.status(500).json({

                success: false,

                error:
                    error.message ||
                    "Toplu bakiye aktarma işlemi başarısız."

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
