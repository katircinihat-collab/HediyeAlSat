
const iyzipay = require("../config/iyzico");
const crypto = require("crypto");

const paymentModel = require("../models/paymentModel");

const orderService = require("./orderService");

const walletService = require("./walletService");

const { firestore, FieldValue } = require("../config/firebase");
const orderModel = require("../models/orderModel");
const { PaymentValidationError, validateNormalPayment, buildIyzicoBasket } = require("./paymentValidationService");
const { validateRetrievedPayment, mapPaymentItemTransactions, finalizePayment } = require("./paymentCallbackService");
const { reserveStock, releaseReservation, releaseExpiredReservations } = require("./stockReservationService");

const KOMISYON_ORANI = 0.08;


/*
==================================================
ÖDEME BAŞLAT
==================================================
*/

async function createPayment(data, authenticatedUser, requestContext = {}) {

    if (!authenticatedUser || !authenticatedUser.uid || !authenticatedUser.email) {
        throw new PaymentValidationError("Ödeme başlatmak için giriş yapmalısınız.", 401, "AUTH_REQUIRED");
    }

    const {
        siparisIds = [],
        buyerName,
        buyerSurname,

        // SPONSOR ÖDEME BİLGİLERİ
        sponsor = false,
        sponsorBasvuruId = ""
    } = data;


    const conversationId =
        `${Date.now()}_${crypto.randomUUID()}`;


    /*
    ==============================================
    SPONSOR / NORMAL ÖDEME AYRIMI
    ==============================================
    */

    const sponsorOdeme =
        sponsor === true ||
        Boolean(sponsorBasvuruId);

    const email = authenticatedUser.email;
    let trustedSiparisIds = siparisIds;
    let trustedPrice;
    let trustedBasketItems;
    let trustedSponsor = null;
    let trustedProductTotal = 0;
    let trustedShipping = 0;
    let trustedShippingDetails = [];
    let trustedPaymentItems = [];
    let trustedBuyer = null;
    let stockReservation = null;

    if (sponsorOdeme) {
        if (!sponsorBasvuruId) {
            throw new PaymentValidationError("Sponsor başvurusu bulunamadı.", 404, "SPONSOR_APPLICATION_NOT_FOUND");
        }

        const applicationSnapshot = await firestore.collection("sponsorBasvurular").doc(sponsorBasvuruId).get();
        if (!applicationSnapshot.exists) {
            throw new PaymentValidationError("Sponsor başvurusu bulunamadı.", 404, "SPONSOR_APPLICATION_NOT_FOUND");
        }
        const application = applicationSnapshot.data();
        if (application.kullaniciId !== authenticatedUser.uid || application.email !== email) {
            throw new PaymentValidationError("Bu sponsor başvurusu kullanıcı hesabınıza ait değil.", 403, "SPONSOR_APPLICATION_FORBIDDEN");
        }
        if (application.odemeDurumu === true) {
            throw new PaymentValidationError("Bu sponsor başvurusunun ödemesi tamamlanmış.", 409, "SPONSOR_ALREADY_PAID");
        }

        trustedPrice = Number(application.paketFiyati);
        if (!Number.isFinite(trustedPrice) || trustedPrice <= 0) {
            throw new PaymentValidationError("Sponsor paket tutarı geçersiz.");
        }
        trustedSiparisIds = [];
        trustedSponsor = application;
        trustedBasketItems = [{
            id: `SPONSOR-${application.paketId}`,
            name: application.paketAdi,
            category1: "Sponsor Mağaza",
            category2: "Reklam",
            itemType: "VIRTUAL",
            price: trustedPrice.toFixed(2)
        }];
    } else {
        await releaseExpiredReservations({ firestore, FieldValue });

        const verified = await validateNormalPayment({
            siparisIds,
            user: authenticatedUser,
            getOrder: orderModel.getOrder,
            getListing: async (listingId) => {
                const snapshot = await firestore.collection("ilanlar").doc(listingId).get();
                return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
            }
        });

        trustedPrice = verified.payableTotal;
        trustedProductTotal = verified.productTotal;
        trustedShipping = verified.shipping;
        trustedShippingDetails = verified.shippingDetails;
        trustedBasketItems = buildIyzicoBasket(verified);
        trustedPaymentItems = verified.verifiedItems.map((item) => ({
            orderId: item.siparisId,
            listingId: item.listingId,
            quantity: item.quantity,
            expectedItemPrice: item.total,
            itemType: item.itemType
        }));
        trustedBuyer = verified.verifiedItems[0]?.buyer || null;

        stockReservation = await reserveStock({
            firestore,
            FieldValue,
            conversationId,
            verifiedItems: verified.verifiedItems
        });

        await Promise.all(verified.verifiedItems.map((item) => orderModel.updateOrder(
            item.siparisId,
            { kargoOdemeTipi: item.shippingPayer }
        )));
    }


    /*
    ==============================================
    ÖDEME KAYDI OLUŞTUR
    ==============================================
    */

    await paymentModel.createPayment({

        conversationId,

        siparisIds: trustedSiparisIds,

        kullanici: email,

        odemeDurumu: false,

        paymentStatus: "WAITING",

        toplamTutar: trustedPrice,

        expectedPaidPrice: trustedPrice,

        currency: "TRY",

        odemeTipi: sponsorOdeme ? "sponsor" : "siparis",

        urunToplami: trustedProductTotal,

        kargoUcreti: trustedShipping,

        kargoDetaylari: trustedShippingDetails,

        paymentItems: trustedPaymentItems,

        stockReservationId: stockReservation?.id || null,

        stockReservationExpiresAt: stockReservation?.expiresAt || null,

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
            trustedSponsor?.paketId || "",

        paketAdi:
            trustedSponsor?.paketAdi || "",

        sponsorSuresi:
            Number(trustedSponsor?.sponsorSuresi) || 0,

        magazaAdi:
            trustedSponsor?.magazaAdi || "",

        telefon:
            trustedSponsor?.telefon || ""

    });


    /*
    ==============================================
    İYZİCO BASKET
    ==============================================
    */

    const iyzicoBasketItems = trustedBasketItems;


    /*
    ==============================================
    İYZİCO REQUEST
    ==============================================
    */

    const productionMode = process.env.NODE_ENV === "production";
    const identityNumber = process.env.IYZIPAY_BUYER_IDENTITY_NUMBER || (productionMode ? "" : "11111111111");
    if (!identityNumber) {
        throw new PaymentValidationError("Ödeme kimlik yapılandırması eksik.", 503, "BUYER_IDENTITY_CONFIG_MISSING");
    }
    const trustedAddress = trustedBuyer?.address || (productionMode ? "" : "Adapazarı");
    const trustedCity = trustedBuyer?.city || (productionMode ? "" : "Sakarya");
    if (!sponsorOdeme && (!trustedAddress || !trustedCity) && trustedPaymentItems.some((item) => item.itemType === "PHYSICAL")) {
        throw new PaymentValidationError("Fiziksel sipariş için teslimat bilgileri eksik.", 409, "DELIVERY_ADDRESS_MISSING");
    }

    const request = {

        locale: "tr",

        conversationId,

        basketId: conversationId,

        price:
            trustedPrice.toFixed(2),

        paidPrice:
            trustedPrice.toFixed(2),

        currency: "TRY",

        paymentGroup: "PRODUCT",

        callbackUrl:
            process.env.CALLBACK_URL,


        buyer: {

            id:
                authenticatedUser.uid,

            name:
                buyerName || "Müşteri",

            surname:
                buyerSurname || "-",

            email:
                email,

            identityNumber:
                identityNumber,

            registrationAddress:
                trustedAddress || "Dijital Teslimat",

            ip:
                requestContext.ip || "127.0.0.1",

            city:
                trustedCity || "Dijital",

            country:
                "Turkey"

        },


        shippingAddress: {

            contactName:
                (buyerName || "Müşteri") +
                " " +
                (buyerSurname || "-"),

            city:
                trustedCity || "Dijital",

            country:
                "Turkey",

            address:
                trustedAddress || "Dijital Teslimat"

        },


        billingAddress: {

            contactName:
                (buyerName || "Müşteri") +
                " " +
                (buyerSurname || "-"),

            city:
                trustedCity || "Dijital",

            country:
                "Turkey",

            address:
                trustedAddress || "Dijital Teslimat"

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

    try {
        return await new Promise((resolve, reject) => {

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


                resolve(result);

            }

        );

        });
    } catch (error) {
        if (stockReservation?.id) {
            await releaseReservation({
                firestore,
                FieldValue,
                reservationId: stockReservation.id,
                reason: "PAYMENT_INITIALIZATION_FAILED"
            }).catch(() => undefined);
        }
        throw error;
    }

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
 if (!iyzipay) {
        throw new Error("Iyzico henüz yapılandırılmadı.");
    }
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

async function securePaymentCallback(token) {
    if (!iyzipay) throw new Error("Iyzico henüz yapılandırılmadı.");

    const result = await new Promise((resolve, reject) => {
        iyzipay.checkoutForm.retrieve({ locale: "tr", token }, (error, response) => {
            if (error) return reject(error);
            if (!response) return reject(new Error("Ödeme sonucu bulunamadı."));
            resolve(response);
        });
    });

    const conversationId = result.conversationId || result.basketId;
    const payment = conversationId ? await paymentModel.getPayment(conversationId) : null;

    try {
        const verified = validateRetrievedPayment(result, payment);
        // Daha önce güvenle tamamlanmış ödemelerin tekrarlanan callback'i yeniden
        // finansal işlem üretmeden finalizePayment'in idempotent yoluna düşer.
        const itemTransactions = payment?.sponsor || payment?.paymentStatus === "SUCCESS"
            ? null
            : mapPaymentItemTransactions(result, payment);
        const finalized = await finalizePayment({
            firestore,
            FieldValue,
            conversationId: verified.conversationId,
            paymentId: verified.paymentId,
            itemTransactions,
            currency: result.currency
        });

        if (!finalized.alreadyFinalized && payment?.kullanici) {
            await orderService.sepetTemizle(payment.kullanici);
        }
        return { success: true, sponsor: finalized.sponsor, redirect: "/payment-success" };
    } catch (error) {
        if (payment && error.paymentStatus) {
            await paymentModel.updatePayment(payment.id, {
                paymentStatus: error.paymentStatus,
                callbackStatus: error.code
            });
        }
        if (payment?.stockReservationId && error.code === "PAYMENT_NOT_SUCCESS") {
            await releaseReservation({
                firestore,
                FieldValue,
                reservationId: payment.stockReservationId,
                reason: "PAYMENT_NOT_SUCCESS"
            }).catch(() => undefined);
        }
        if (payment && error.paymentStatus === "MANUAL_REVIEW") {
            const { recordFinancialReconciliation } = require("./financialReconciliationService");
            await recordFinancialReconciliation({ firestore, event: {
                type: error.code?.startsWith("STOCK_") ? "stock_allocation" : "payment_callback",
                reasonCode: error.code || "PAYMENT_CALLBACK_MANUAL_REVIEW",
                reason: error.message,
                paymentId: result.paymentId || payment.paymentId || null,
                buyer: payment.kullanici || null,
                grossAmount: payment.expectedPaidPrice ?? payment.toplamTutar,
                providerStatus: result.paymentStatus || null,
                sourceCollection: "odemeler",
                sourceId: payment.id
            } }).catch(() => undefined);
        }
        console.error("Callback doğrulama/finalize hatası:", {
            conversationId: conversationId || null,
            code: error.code || "CALLBACK_FAILED"
        });
        throw error;
    }
}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    createPayment,

    paymentCallback,

    securePaymentCallback,

    KOMISYON_ORANI

};
