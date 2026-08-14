const orderService = require("../services/orderService");

/*
==========================================
SİPARİŞİ ÖDENDİ YAP
==========================================
*/

exports.siparisOdendi = async (req, res) => {

    try {

        const {

            id,

            paymentId,

            conversationId

        } = req.body;

        const sonuc = await orderService.siparisOdendi(

            id,

            paymentId,

            conversationId

        );

        return res.json({

            success: true,

            siparis: sonuc

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
SEPETİ TEMİZLE
==========================================
*/

exports.sepetTemizle = async (req, res) => {

    try {

        const { email } = req.body;

        await orderService.sepetTemizle(email);

        return res.json({

            success: true

        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({

            success: false,

            error: err.message

        });

    }

};