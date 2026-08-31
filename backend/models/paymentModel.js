
const { firestore, FieldValue } = require("../config/firebase");

/*
==================================================
PAYMENT MODEL
==================================================
*/

function paymentRef(conversationId) {

    return firestore
        .collection("odemeler")
        .doc(conversationId);

}

/*
==================================================
ÖDEME OKU
==================================================
*/

async function getPayment(conversationId) {

    const doc = await paymentRef(conversationId).get();

    if (!doc.exists) {
        return null;
    }

    return {
        id: doc.id,
        ...doc.data()
    };

}

/*
==================================================
ÖDEME OLUŞTUR
==================================================
*/

async function createPayment(data) {

    const ref = paymentRef(data.conversationId);

    await ref.set({

        ...data,

        olusturmaTarihi:
            FieldValue.serverTimestamp(),

        guncellenmeTarihi:
            FieldValue.serverTimestamp()

    });

}

/*
==================================================
ÖDEME GÜNCELLE
==================================================
*/

async function updatePayment(conversationId, data) {

    await paymentRef(conversationId).update({

        ...data,

        guncellenmeTarihi:
            FieldValue.serverTimestamp()

    });

}

/*
==================================================
ÖDEME VAR MI?
==================================================
*/

async function paymentExists(conversationId) {

    const doc =
        await paymentRef(conversationId).get();

    return doc.exists;

}

/*
==================================================
KULLANICININ ÖDEMELERİ
==================================================
*/

async function getPaymentsByUser(email) {

    const snap = await firestore
        .collection("odemeler")
        .where("kullanici", "==", email)
        .get();

    return snap.docs.map(doc => ({

        id: doc.id,
        ...doc.data()

    }));

}

/*
==================================================
BAŞARILI ÖDEMELER
==================================================
*/

async function getSuccessfulPayments() {

    const snap = await firestore
        .collection("odemeler")
        .where(
            "paymentStatus",
            "==",
            "SUCCESS"
        )
        .get();

    return snap.docs.map(doc => ({

        id: doc.id,
        ...doc.data()

    }));

}

/*
==================================================
BEKLEYEN ÖDEMELER
==================================================
*/

async function getWaitingPayments() {

    const snap = await firestore
        .collection("odemeler")
        .where(
            "paymentStatus",
            "==",
            "WAITING"
        )
        .get();

    return snap.docs.map(doc => ({

        id: doc.id,
        ...doc.data()

    }));

}

/*
==================================================
GÜVENLİ SPONSOR TEST ÖDEMESİ TEMİZLEME
==================================================

SADECE:

paymentStatus === "WAITING"

VE

sponsorBasvuruId mevcut

olan kayıtları siler.

SUCCESS olan sponsor ödemelerine dokunmaz.
Normal sipariş ödemelerine dokunmaz.
==================================================
*/

async function temizleBekleyenSponsorTestOdemeleri() {

    const snap = await firestore
        .collection("odemeler")
        .where(
            "paymentStatus",
            "==",
            "WAITING"
        )
        .get();

    let silinen = 0;

    const batch = firestore.batch();

    snap.docs.forEach(doc => {

        const data = doc.data();

        /*
        Sponsor ödemesi olduğunu kontrol ediyoruz.
        */

        const sponsorMu =
            !!data.sponsorBasvuruId;

        if (sponsorMu) {

            batch.delete(doc.ref);

            silinen++;

        }

    });

    if (silinen > 0) {

        await batch.commit();

    }

    console.log(
        `Temizlenen bekleyen sponsor ödemesi: ${silinen}`
    );

    return silinen;

}

/*
==================================================
ÖDEME SİL
==================================================
*/

async function deletePayment(conversationId) {

    await paymentRef(conversationId).delete();

}

/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    paymentRef,

    getPayment,

    createPayment,

    updatePayment,

    paymentExists,

    getPaymentsByUser,

    getSuccessfulPayments,

    getWaitingPayments,

    deletePayment,

    temizleBekleyenSponsorTestOdemeleri

};