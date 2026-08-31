const walletService =
    require("../services/walletService");


/*
==================================================
WALLET GET
==================================================
*/

exports.getWallet = async (req, res) => {

    try {

        const email =
            req.user.email;


        if (
            req.params.email &&
            req.params.email !== email
        ) {

            return res.status(403).json({

                success: false,

                error:
                    "Bu cüzdana erişim yetkiniz yok."

            });

        }


        if (!email) {

            return res.status(400).json({

                success: false,

                error:
                    "Email gerekli."

            });

        }


        const wallet =
            await walletService.getWallet(
                email
            );


        res.json({

            success: true,

            wallet

        });


    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error:
                err.message

        });

    }

};


/*
==================================================
IBAN KAYDET
==================================================
*/

exports.ibanKaydet = async (req, res) => {

    try {

        const {
            iban,
            bankaAdi,
            hesapSahibi
        } = req.body;

        const email =
            req.user.email;


        const wallet =
            await walletService.ibanKaydet(

                email,

                {

                    iban,

                    bankaAdi,

                    hesapSahibi

                }

            );


        res.json({

            success: true,

            wallet

        });


    } catch (err) {

        console.error(err);

        res.status(400).json({

            success: false,

            error:
                err.message

        });

    }

};


/*
==================================================
PARA ÇEK
==================================================
*/

exports.paraCek = async (req, res) => {

    try {

        const {
            tutar,
            miktar
        } = req.body;

        const email =
            req.user.email;


        const sonuc =
            await walletService.paraCek(

                email,

                tutar ||
                miktar

            );


        res.json({

            success: true,

            message:
                "Para çekme talebiniz oluşturuldu.",

            sonuc

        });


    } catch (err) {

        console.error(err);

        res.status(400).json({

            success: false,

            error:
                err.message

        });

    }

};


/*
==================================================
TALEPLERİM
==================================================
*/

exports.taleplerim = async (
    req,
    res
) => {

    try {

        const email =
            req.user.email;


        const requestedEmail =
            req.params.email ||
            req.query.email;


        if (
            requestedEmail &&
            requestedEmail !== email
        ) {

            return res.status(403).json({

                success: false,

                error:
                    "Bu para çekme taleplerine erişim yetkiniz yok."

            });

        }


        const talepler =
            await walletService
                .paraCekmeTaleplerim(
                    email
                );


        res.json({

            success: true,

            talepler

        });


    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error:
                err.message

        });

    }

};


/*
==================================================
ADMIN - TALEPLER
==================================================
*/

exports.adminTalepler = async (
    req,
    res
) => {

    try {

        const talepler =
            await walletService
                .tumParaCekmeTalepleri();


        res.json({

            success: true,

            talepler

        });


    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error:
                err.message

        });

    }

};


/*
==================================================
ADMIN - ONAYLA
==================================================
*/

exports.onayla = async (
    req,
    res
) => {

    try {

        const sonuc =
            await walletService
                .paraCekmeOnayla(
                    req.params.id
                );


        res.json({

            success: true,

            sonuc

        });


    } catch (err) {

        console.error(err);

        res.status(400).json({

            success: false,

            error:
                err.message

        });

    }

};


/*
==================================================
ADMIN - REDDET
==================================================
*/

exports.reddet = async (
    req,
    res
) => {

    try {

        const sonuc =
            await walletService
                .paraCekmeReddet(

                    req.params.id,

                    req.body.neden

                );


        res.json({

            success: true,

            sonuc

        });


    } catch (err) {

        console.error(err);

        res.status(400).json({

            success: false,

            error:
                err.message

        });

    }

};
