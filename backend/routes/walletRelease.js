const express =
    require("express");

const router =
    express.Router();

const walletReleaseService =
    require("../services/walletReleaseService");

const authMiddleware =
    require("../middleware/authMiddleware");


/*
==================================================
ADMIN KONTROLÜ
==================================================
*/

function adminKontrol(req, res, next) {

    if (
        !process.env.ADMIN_EMAIL ||
        req.user.email !==
        process.env.ADMIN_EMAIL
    ) {

        return res.status(403).json({

            success: false,

            error:
                "Admin yetkisi gerekli."

        });

    }


    next();

}


/*
==================================================
BLOKAJI DOLMUŞ SATIŞLARI GETİR
==================================================

GET

/api/wallet-release/admin/pending
==================================================
*/

router.get(

    "/admin/pending",

    authMiddleware,

    adminKontrol,

    async (req, res) => {

        try {

            const liste =
                await walletReleaseService
                    .blokajiDolanlariGetir();


            res.json({

                success: true,

                toplam:
                    liste.length,

                hareketler:
                    liste

            });

        }

        catch (error) {

            console.log(
                "Wallet release liste hatası:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }

);


/*
==================================================
TEK SATIŞI BALANCE'A AKTAR
==================================================

POST

/api/wallet-release/admin/release
==================================================
*/

router.post(

    "/admin/release",

    authMiddleware,

    adminKontrol,

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


            if (
                !sonuc.success
            ) {

                return res.status(400).json({

                    success: false,

                    ...sonuc

                });

            }


            res.json({

                success: true,

                message:
                    "Satış kullanılabilir bakiyeye aktarıldı.",

                ...sonuc

            });

        }

        catch (error) {

            console.log(
                "Wallet release hatası:",
                error
            );


            res.status(400).json({

                success: false,

                error:
                    error.message

            });

        }

    }

);


/*
==================================================
BLOKAJI DOLANLARIN TAMAMINI AKTAR
==================================================

POST

/api/wallet-release/admin/release-all
==================================================
*/

router.post(

    "/admin/release-all",

    authMiddleware,

    adminKontrol,

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

            console.log(
                "Toplu wallet release hatası:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }

);


/*
==================================================
TEK HAREKET DURUMU
==================================================

GET

/api/wallet-release/admin/:hareketId
==================================================
*/

router.get(

    "/admin/:hareketId",

    authMiddleware,

    adminKontrol,

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
                    error.message

            });

        }

    }

);


module.exports = router;