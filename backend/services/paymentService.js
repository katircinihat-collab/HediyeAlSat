const iyzipay = require("../config/iyzico");

const paymentModel = require("../models/paymentModel");

const orderService = require("./orderService");

const walletService = require("./walletService");

const KOMISYON_ORANI = 0.08;


/*
==================================================
ÖDEME BAŞLAT
==================================================
*/

async function createPayment(data) {

    const {
        siparisIds,
        price,
        buyerName,
        buyerSurname,
        email,
        basketItems
    } = data;


    const conversationId =
        Date.now().toString();


    await paymentModel.createPayment({

        conversationId,

        siparisIds,

        kullanici: email,

        odemeDurumu: false,

        paymentStatus: "WAITING",

        toplamTutar: Number(price),

        komisyonOrani: KOMISYON_ORANI

    });


    const request = {

        locale: "tr",

        conversationId,

        basketId: conversationId,

        price: String(price),

        paidPrice: String(price),

        currency: "TRY",

        paymentGroup: "PRODUCT",


        callbackUrl:
            process.env.CALLBACK_URL,


        buyer: {

            id: email,

            name: buyerName,

            surname: buyerSurname,

            email,

            identityNumber:
                "11111111111",

            registrationAddress:
                "Sakarya",

            ip: "85.34.78.112",

            city: "Sakarya",

            country: "Turkey"

        },


        shippingAddress: {

            contactName:
                buyerName +
                " " +
                buyerSurname,

            city: "Sakarya",

            country: "Turkey",

            address: "Adapazarı"

        },


        billingAddress: {

            contactName:
                buyerName +
                " " +
                buyerSurname,

            city: "Sakarya",

            country: "Turkey",

            address: "Adapazarı"

        },


        basketItems

    };


    return new Promise((resolve, reject) => {

        iyzipay.checkoutFormInitialize.create(

            request,

            (err, result) => {

                if (err) {

                    reject(err);

                } else {

                    console.log("İyzico sonucu:");

                    console.log(result);

                    resolve(result);

                }

            }

        );

    });

}


/*
==================================================
ÖDEME CALLBACK
==================================================
*/

async function paymentCallback(token) {

    return new Promise((resolve, reject) => {

        console.log("İyzico retrieve başladı...");


        iyzipay.checkoutForm.retrieve(

            {
                locale: "tr",
                token: token
            },


            async (err, result) => {

                console.log("retrieve callback çalıştı");

                console.log("ERR:", err);

                console.log("RESULT:", result);


                try {

                    if (err) {

                        return reject(err);

                    }


                    if (!result) {

                        return reject(
                            new Error(
                                "Ödeme sonucu bulunamadı."
                            )
                        );

                    }


                    if (
                        result.paymentStatus !== "SUCCESS"
                    ) {

                        return resolve({

                            success: false,

                            redirect:
                                "/payment-fail"

                        });

                    }


                    const conversationId =

                        result.conversationId ||

                        result.basketId;


                    console.log(
                        "Conversation ID:",
                        conversationId
                    );


                    const odeme =

                        await paymentModel.getPayment(

                            conversationId

                        );


                    if (!odeme) {

                        return reject(

                            new Error(
                                "Ödeme kaydı bulunamadı."
                            )

                        );

                    }


                    console.log(
                        "Ödeme kaydı bulundu:",
                        odeme
                    );


                    for (
                        const siparisId
                        of odeme.siparisIds
                    ) {


                        console.log(
                            "Sipariş işleniyor:",
                            siparisId
                        );


                        const siparis =

                            await orderService.siparisOdendi(

                                siparisId,

                                result.paymentId,

                                conversationId

                            );


                        if (siparis) {


                            await walletService.walletGuncelle(

                                siparis,

                                result.paymentId,

                                conversationId

                            );

                        }

                    }


                    /*
                    =====================================
                    SEPETİ TEMİZLE
                    =====================================
                    */

                    await orderService.sepetTemizle(

                        odeme.kullanici

                    );


                    /*
                    =====================================
                    ÖDEME KAYDINI GÜNCELLE
                    =====================================
                    */

                    await paymentModel.updatePayment(

                        conversationId,

                        {

                            odemeDurumu: true,

                            paymentStatus: "SUCCESS",

                            paymentId:
                                result.paymentId,

                            callbackSonucu:
                                result

                        }

                    );


                    console.log(
                        "ÖDEME BAŞARIYLA TAMAMLANDI"
                    );


                    resolve({

                        success: true,

                        redirect:
                            "/payment-success"

                    });


                } catch (e) {

                    console.log(
                        "Callback işlem hatası:",
                        e
                    );

                    reject(e);

                }

            }

        );

    });

}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    createPayment,

    paymentCallback,

    KOMISYON_ORANI

};