
console.log("paymentController yüklendi");

const paymentService =
    require("../services/paymentService");


/*
==================================================
ÖDEME BAŞLAT
==================================================
*/

exports.startPayment = async (req, res) => {

    console.log(
        "POST /api/payment geldi"
    );

    console.log(
        "Ödeme verisi:",
        req.body
    );


    try {

        const result =
            await paymentService.createPayment(
                req.body
            );


        res.json(result);


    } catch (err) {

        console.log(
            "Ödeme başlatma hatası:",
            err
        );


        res.status(500).json({

            success: false,

            error:
                err.message ||
                "Ödeme oluşturulamadı."

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

        console.log(
            "Callback body:",
            req.body
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

            await paymentService.paymentCallback(

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

        console.log(
            "Callback controller hatası:",
            err
        );


        return res.redirect(

            process.env.FRONTEND_URL +
            "/payment-fail"

        );

    }

};