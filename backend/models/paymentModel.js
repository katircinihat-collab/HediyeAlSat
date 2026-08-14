const { firestore, FieldValue } = require("../config/firebase");

/*
==================================================
PAYMENT MODEL
==================================================
*/

/*
==========================================
Ödeme Referansı
==========================================
*/

function paymentRef(conversationId) {

    return firestore
        .collection("odemeler")
        .doc(conversationId);

}

/*
==========================================
Ödeme Oku
==========================================
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
==========================================
Ödeme Oluştur
==========================================
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
==========================================
Ödeme Güncelle
==========================================
*/

async function updatePayment(conversationId, data) {

    await paymentRef(conversationId).update({

        ...data,

        guncellenmeTarihi:
            FieldValue.serverTimestamp()

    });

}

/*
==========================================
Ödeme Var mı?
==========================================
*/

async function paymentExists(conversationId) {

    const doc = await paymentRef(conversationId).get();

    return doc.exists;

}

/*
==========================================
Kullanıcının Ödemeleri
==========================================
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
==========================================
Başarılı Ödemeler
==========================================
*/

async function getSuccessfulPayments() {

    const snap = await firestore
        .collection("odemeler")
        .where("paymentStatus", "==", "SUCCESS")
        .get();

    return snap.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

    }));

}

/*
==========================================
Bekleyen Ödemeler
==========================================
*/

async function getWaitingPayments() {

    const snap = await firestore
        .collection("odemeler")
        .where("paymentStatus", "==", "WAITING")
        .get();

    return snap.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

    }));

}

/*
==========================================
Ödeme Sil
==========================================
*/

async function deletePayment(conversationId) {

    await paymentRef(conversationId).delete();

}

module.exports = {

    paymentRef,

    getPayment,

    createPayment,

    updatePayment,

    paymentExists,

    getPaymentsByUser,

    getSuccessfulPayments,

    getWaitingPayments,

    deletePayment

};