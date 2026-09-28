
const paymentService =
    require("../services/paymentService");
const paymentTrace = require("../services/paymentTrace");


/*
==================================================
ÖDEME BAŞLAT
==================================================
*/

exports.startPayment = async (req, res) => {
    try {

        const result =
            await paymentService.createPayment(
                req.body,
                req.user,
                { ip: req.ip }
            );


        res.json(result);


    } catch (err) {

        paymentTrace.failure("PAYMENT_INITIALIZATION", err);

        res.status(err.status || 500).json({

            success: false,
            code: err.code || "PAYMENT_START_FAILED",
            error: err.status ? err.message : "Ödeme oluşturulamadı."

        });

    }

};


/*
==================================================
CALLBACK
==================================================
*/

exports.paymentCallback = async (
    req,
    res
) => {

    try {

        console.info("Ödeme callback alındı.", { tokenPresent: Boolean(req.body?.token) });
        paymentTrace.callbackParsed(req.body);

        const token =
            req.body.token;


        if (!token) {
            paymentTrace.trace("PAYMENT_FAILURE", { failedStage: "CALLBACK_PARSE", errorCode: "TOKEN_MISSING" });

            console.info(
                "Callback token bulunamadı."
            );


            return res.redirect(
                303,

                process.env.FRONTEND_URL +
                "/payment-fail"

            );

        }


        const result =

            await paymentService.securePaymentCallback(

                token

            );


        console.info("Ödeme callback tamamlandı.", {
            sponsor: Boolean(result.sponsor),
            listingBoost: Boolean(result.listingBoost),
            redirect: result.redirect || "/payment-fail"
        });


        return res.redirect(
            303,

            process.env.FRONTEND_URL +
            (
                result.redirect ||
                "/payment-fail"
            )

        );


    } catch (err) {

        paymentTrace.failure("CALLBACK_HANDLER", err);


        return res.redirect(
            303,

            process.env.FRONTEND_URL +
            "/payment-fail"

        );

    }

};
