const orderModel = require("../models/orderModel");
const stockService = require("./stockService");
const { FieldValue, firestore } = require("../config/firebase");


/*
==================================================
SİPARİŞİ ÖDENDİ YAP
==================================================
*/

async function siparisOdendi(id, paymentId, conversationId) {

    console.log("Sipariş işleniyor:", id);

    const siparis =
        await orderModel.getOrder(id);

    if (!siparis) {

        console.log("Sipariş bulunamadı:", id);

        return null;

    }


    /*
    ==========================================
    ÖDEME ZATEN YAPILMIŞ MI?
    ==========================================
    */

    if (siparis.odemeDurumu === true) {

        console.log(
            "Sipariş zaten ödenmiş, tekrar işlenmeyecek:",
            id
        );

        return {

            id,

            ...siparis,

            zatenOdendi: true

        };

    }


    /*
    ==========================================
    STOK DÜŞ
    ==========================================
    */

    if (siparis.urunId) {

        console.log(
            "Stok düşülüyor:",
            siparis.urunId
        );

        await stockService.stokDus(

            siparis.urunId,

            siparis.adet || 1

        );

    }


    /*
    ==========================================
    SİPARİŞİ GÜNCELLE
    ==========================================
    */

    await orderModel.updateOrder(

        id,

        {

            odemeDurumu: true,

            durum: "Ödendi",

            paymentId,

            conversationId,

            odemeTarihi:
                FieldValue.serverTimestamp()

        }

    );


    console.log(
        "Sipariş ödeme olarak işaretlendi:",
        id
    );


    return {

        id,

        ...siparis,

        odemeDurumu: true,

        durum: "Ödendi",

        paymentId,

        conversationId

    };

}


/*
==================================================
SEPETİ TEMİZLE
==================================================
*/

async function sepetTemizle(email) {

    console.log(
        "Sepet temizleniyor:",
        email
    );

    const snap = await firestore

        .collection("sepet")

        .where("kullanici", "==", email)

        .get();


    for (const item of snap.docs) {

        await item.ref.delete();

    }


    console.log(
        "Sepet temizlendi."
    );

}


/*
==================================================
SİPARİŞ GETİR
==================================================
*/

async function getOrder(id) {

    return await orderModel.getOrder(id);

}


/*
==================================================
ALICI SİPARİŞLERİ
==================================================
*/

async function getOrdersByUser(email) {

    return await orderModel.getOrdersByUser(email);

}


/*
==================================================
SATICI SİPARİŞLERİ
==================================================
*/

async function getOrdersBySeller(email) {

    return await orderModel.getOrdersBySeller(email);

}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    siparisOdendi,

    sepetTemizle,

    getOrder,

    getOrdersByUser,

    getOrdersBySeller

};