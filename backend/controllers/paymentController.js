
console.log("paymentController yüklendi");

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
                req.user
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

        console.log(
            "=== CALLBACK GELDİ ==="
        );

        const token =
            req.body.token;


        if (!token) {

            console.log(
                "Callback token bulunamadı."
            );


            return res.redirect(

                process.env.FRONTEND_URL +
                "/payment-fail"

            );

        }


        const result =

            await paymentService.securePaymentCallback(

                token

            );


        console.log(
            "Callback ödeme sonucu:",
            result
        );


        return res.redirect(

            process.env.FRONTEND_URL +
            (
                result.redirect ||
                "/payment-fail"
            )

        );


    } catch (err) {

        console.error("Callback controller hatası:", {
            code: err.code || "CALLBACK_FAILED",
            message: err.message || "Callback tamamlanamadı."
        });


        return res.redirect(

            process.env.FRONTEND_URL +
            "/payment-fail"

        );

    }

};
