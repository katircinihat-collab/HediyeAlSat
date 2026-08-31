
const iyzipay = require("../config/iyzico");

const paymentModel = require("../models/paymentModel");

const orderService = require("./orderService");

const walletService = require("./walletService");

const { firestore, FieldValue } = require("../config/firebase");

const KOMISYON_ORANI = 0.08;


/*
==================================================
ÖDEME BAŞLAT
==================================================
*/

async function createPayment(data) {

    const {
        siparisIds = [],
        price,
        buyerName,
        buyerSurname,
        email,
        basketItems = [],

        // SPONSOR ÖDEME BİLGİLERİ
        sponsor = false,
        sponsorBasvuruId = "",
        paketId = "",
        paketAdi = "",
        sure = 0,
        magazaAdi = "",
        telefon = ""
    } = data;


    const conversationId =
        Date.now().toString();


    /*
    ==============================================
    SPONSOR / NORMAL ÖDEME AYRIMI
    ==============================================
    */

    const sponsorOdeme =
        sponsor === true ||
        Boolean(sponsorBasvuruId);


    /*
    ==============================================
    ÖDEME KAYDI OLUŞTUR
    ==============================================
    */

    await paymentModel.createPayment({

        conversationId,

        siparisIds,

        kullanici: email,

        odemeDurumu: false,

        paymentStatus: "WAITING",

        toplamTutar: Number(price),

        komisyonOrani:
            sponsorOdeme
                ? 0
                : KOMISYON_ORANI,

        /*
        Sponsor bilgileri
        */

        sponsor: sponsorOdeme,

        sponsorBasvuruId:
            sponsorBasvuruId || "",

        paketId:
            paketId || "",

        paketAdi:
            paketAdi || "",

        sponsorSuresi:
            Number(sure) || 0,

        magazaAdi:
            magazaAdi || "",

        telefon:
            telefon || ""

    });


    /*
    ==============================================
    İYZİCO BASKET
    ==============================================
    */

    const iyzicoBasketItems =
        basketItems.length > 0
            ? basketItems
            : [
                {
                    id: sponsorBasvuruId || conversationId,
                    name:
                        paketAdi ||
                        "HediyeAlSat Sponsor Mağaza",
                    category1: "Sponsor Mağaza",
                    itemType: "VIRTUAL",
                    price:
                        Number(price).toFixed(2)
                }
            ];


    /*
    ==============================================
    İYZİCO REQUEST
    ==============================================
    */

    const request = {

        locale: "tr",

        conversationId,

        basketId: conversationId,

        price:
            Number(price).toFixed(2),

        paidPrice:
            Number(price).toFixed(2),

        currency: "TRY",

        paymentGroup: "PRODUCT",

        callbackUrl:
            process.env.CALLBACK_URL,


        buyer: {

            id:
                email || conversationId,

            name:
                buyerName || "Müşteri",

            surname:
                buyerSurname || "-",

            email:
                email,

            identityNumber:
                "11111111111",

            registrationAddress:
                "Sakarya",

            ip:
                "85.34.78.112",

            city:
                "Sakarya",

            country:
                "Turkey"

        },


        shippingAddress: {

            contactName:
                (buyerName || "Müşteri") +
                " " +
                (buyerSurname || "-"),

            city:
                "Sakarya",

            country:
                "Turkey",

            address:
                "Adapazarı"

        },


        billingAddress: {

            contactName:
                (buyerName || "Müşteri") +
                " " +
                (buyerSurname || "-"),

            city:
                "Sakarya",

            country:
                "Turkey",

            address:
                "Adapazarı"

        },


        basketItems:
            iyzicoBasketItems

    };


    /*
    ==============================================
    İYZİCO ÖDEME BAŞLAT
    ==============================================
    */
if (!iyzipay) {
    throw new Error("Iyzico henüz yapılandırılmadı.");
}

    return new Promise((resolve, reject) => {

        iyzipay.checkoutFormInitialize.create(

            request,

            (err, result) => {

                if (err) {

                    console.log(
                        "İyzico bağlantı hatası:",
                        err
                    );

                    reject(err);

                    return;

                }


                console.log(
                    "İyzico sonucu:"
                );

                console.log(result);


                resolve(result);

            }

        );

    });

}


/*
==================================================
SPONSOR BAŞVURUSUNU ÖDEME SONRASI AKTİFLEŞTİR
==================================================
*/

async function sponsorBasvurusunuGuncelle(
    odeme,
    result
) {

    if (
        !odeme.sponsor ||
        !odeme.sponsorBasvuruId
    ) {

        return;

    }


    const basvuruRef =
        firestore
            .collection("sponsorBasvurular")
            .doc(
                odeme.sponsorBasvuruId
            );


    const basvuru =
        await basvuruRef.get();


    if (!basvuru.exists) {

        throw new Error(
            "Sponsor başvurusu bulunamadı."
        );

    }


    const sure =
        Number(
            odeme.sponsorSuresi
        ) || 0;


    const baslangic =
        new Date();


    const bitis =
        new Date(
            baslangic.getTime() +
            sure *
            24 *
            60 *
            60 *
            1000
        );


    await basvuruRef.update({

        durum:
            "Ödendi",

        odemeDurumu:
            true,

        paymentStatus:
            "SUCCESS",

        paymentId:
            result.paymentId,

        odemeTarihi:
            FieldValue.serverTimestamp(),

        sponsorAktif:
            true,

        sponsorBaslangic:
            baslangic,

        sponsorBitis:
            bitis,

        sponsorPaket:
            odeme.paketAdi,

        sponsorPaketId:
            odeme.paketId,

        sponsorSuresi:
            sure,

        sponsorTutar:
            Number(
                odeme.toplamTutar
            ),

        guncellenmeTarihi:
            FieldValue.serverTimestamp()

    });


    console.log(
        "SPONSOR BAŞVURUSU ÖDEME SONRASI AKTİFLEŞTİRİLDİ:",
        odeme.sponsorBasvuruId
    );

}


/*
==================================================
ÖDEME CALLBACK
==================================================
*/

async function paymentCallback(token) {

    return new Promise((resolve, reject) => {

        console.log(
            "İyzico retrieve başladı..."
        );


        iyzipay.checkoutForm.retrieve(

            {
                locale: "tr",
                token: token
            },


            async (err, result) => {

                console.log(
                    "retrieve callback çalıştı"
                );

                console.log(
                    "ERR:",
                    err
                );

                console.log(
                    "RESULT:",
                    result
                );


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


                    /*
                    ==================================
                    ÖDEME BAŞARISIZ
                    ==================================
                    */

                    if (
                        result.paymentStatus !==
                        "SUCCESS"
                    ) {

                        const conversationId =
                            result.conversationId ||
                            result.basketId;


                        if (conversationId) {

                            await paymentModel.updatePayment(

                                conversationId,

                                {
                                    paymentStatus:
                                        "FAILED",

                                    callbackSonucu:
                                        result
                                }

                            );

                        }


                        return resolve({

                            success: false,

                            redirect:
                                "/payment-fail"

                        });

                    }


                    /*
                    ==================================
                    CONVERSATION ID
                    ==================================
                    */

                    const conversationId =

                        result.conversationId ||

                        result.basketId;


                    console.log(
                        "Conversation ID:",
                        conversationId
                    );


                    /*
                    ==================================
                    ÖDEME KAYDINI BUL
                    ==================================
                    */

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


                    /*
                    ==================================
                    SPONSOR ÖDEMESİ
                    ==================================
                    */

                    if (odeme.sponsor) {

                        console.log(
                            "SPONSOR ÖDEMESİ TESPİT EDİLDİ"
                        );


                        await sponsorBasvurusunuGuncelle(

                            odeme,

                            result

                        );


                        await paymentModel.updatePayment(

                            conversationId,

                            {

                                odemeDurumu:
                                    true,

                                paymentStatus:
                                    "SUCCESS",

                                paymentId:
                                    result.paymentId,

                                callbackSonucu:
                                    result

                            }

                        );


                        console.log(
                            "SPONSOR ÖDEMESİ BAŞARIYLA TAMAMLANDI"
                        );


                        return resolve({

                            success: true,

                            sponsor: true,

                            redirect:
                                "/payment-success"

                        });

                    }


                    /*
                    ==================================
                    NORMAL SİPARİŞ ÖDEMESİ
                    ==================================
                    */

                    for (
                        const siparisId
                        of odeme.siparisIds || []
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
                    ==================================
                    SEPETİ TEMİZLE
                    ==================================
                    */

                    if (odeme.kullanici) {

                        await orderService.sepetTemizle(

                            odeme.kullanici

                        );

                    }


                    /*
                    ==================================
                    ÖDEME KAYDINI GÜNCELLE
                    ==================================
                    */

                    await paymentModel.updatePayment(

                        conversationId,

                        {

                            odemeDurumu:
                                true,

                            paymentStatus:
                                "SUCCESS",

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