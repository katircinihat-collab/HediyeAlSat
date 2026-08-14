console.log("paymentController yüklendi");
const paymentService =
require("../services/paymentService");

/*
==================================================
ÖDEME BAŞLAT
==================================================
*/

exports.startPayment = async (req, res) => {
console.log("POST /api/payment geldi");
console.log(req.body);
    try {

        const result =
            await paymentService.createPayment(req.body);

        res.json(result);

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

};

/*
==================================================
CALLBACK
==================================================
*/

exports.paymentCallback = async (req, res) => {

    try {

        const token = req.body.token;

        if (!token) {

            return res.redirect(

                process.env.FRONTEND_URL +
                "/payment-fail"

            );

        }

        const result =
            await paymentService.paymentCallback(token);

        return res.redirect(

            process.env.FRONTEND_URL +
            result.redirect

        );

    } catch (err) {

        console.log(err);

        return res.redirect(

            process.env.FRONTEND_URL +
            "/payment-fail"

        );

    }

};