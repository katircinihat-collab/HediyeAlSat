const withdrawService =
    require("../services/withdrawService");


/*
==================================================
PARA ÇEKME TALEBİ OLUŞTUR
==================================================
*/

async function paraCek(req, res) {

    try {

        const {
            email,
            miktar
        } = req.body;


        console.log(
            "Para çekme isteği:",
            email,
            miktar
        );


        const sonuc =
            await withdrawService.paraCek(
                email,
                miktar
            );


        return res.json({

            success: true,

            message:
                "Para çekme talebiniz oluşturuldu.",

            ...sonuc

        });


    } catch (error) {

        console.error(
            "Para çekme hatası:",
            error
        );


        return res.status(400).json({

            success: false,

            error:
                error.message ||
                "Para çekme işlemi başarısız."

        });

    }

}


/*
==================================================
SATICININ PARA ÇEKME TALEPLERİ
==================================================
*/

async function talepler(req, res) {

    try {

        const {
            email
        } = req.query;


        const sonuc =
            await withdrawService.talepleriGetir(
                email
            );


        return res.json({

            success: true,

            talepler:
                sonuc

        });


    } catch (error) {

        console.error(
            "Para çekme talepleri hatası:",
            error
        );


        return res.status(400).json({

            success: false,

            error:
                error.message ||
                "Talepler alınamadı."

        });

    }

}


/*
==================================================
BEKLEYEN PARA ÇEKME TALEPLERİ
==================================================
*/

async function bekleyenTalepler(req, res) {

    try {

        const sonuc =
            await withdrawService
                .bekleyenTalepleriGetir();


        return res.json({

            success: true,

            talepler:
                sonuc

        });


    } catch (error) {

        console.error(
            "Bekleyen talepler hatası:",
            error
        );


        return res.status(400).json({

            success: false,

            error:
                error.message ||
                "Bekleyen talepler alınamadı."

        });

    }

}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    paraCek,

    talepler,

    bekleyenTalepler

};