const cargoService = require("../services/cargoService");

/*
==========================================
KARGOLARI KONTROL ET
==========================================
*/

exports.kargolariKontrolEt = async (req, res) => {

    try {

        await cargoService.kargolariKontrolEt();

        return res.json({

            success: true,

            message: "Kargo kontrolü tamamlandı."

        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({

            success: false,

            error: err.message

        });

    }

};

/*
==========================================
TEK SİPARİŞ KARGO KONTROL
==========================================
*/

exports.kargoKontrol = async (req, res) => {

    try {

        const { siparisId } = req.params;

        const sonuc = await cargoService.kargoKontrol(siparisId);

        return res.json({

            success: true,

            data: sonuc

        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({

            success: false,

            error: err.message

        });

    }

};