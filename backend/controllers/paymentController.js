
const paymentService =
    require("../services/paymentService");


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

        console.error("Ödeme başlatma hatası:", err.message);

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

        const token =
            req.body.token;


        if (!token) {

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

        console.error("Callback controller hatası:", {
            code: err.code || "CALLBACK_FAILED"
        });


        return res.redirect(
            303,

            process.env.FRONTEND_URL +
            "/payment-fail"

        );

    }

};
