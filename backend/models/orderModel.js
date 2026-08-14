const { firestore, FieldValue } = require("../config/firebase");

/*
==================================================
ORDER MODEL
==================================================
*/

/*
==========================================
Sipariş Referansı
==========================================
*/

function orderRef(id) {

    return firestore
        .collection("siparisler")
        .doc(id);

}

/*
==========================================
Sipariş Oku
==========================================
*/

async function getOrder(id) {

    const doc = await orderRef(id).get();

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
Sipariş Oluştur
==========================================
*/

async function createOrder(data) {

    const ref = await firestore
        .collection("siparisler")
        .add({

            ...data,

            olusturmaTarihi:
                FieldValue.serverTimestamp(),

            guncellenmeTarihi:
                FieldValue.serverTimestamp()

        });

    return ref.id;

}

/*
==========================================
Sipariş Güncelle
==========================================
*/

async function updateOrder(id, data) {

    await orderRef(id).update({

        ...data,

        guncellenmeTarihi:
            FieldValue.serverTimestamp()

    });

}

/*
==========================================
Sipariş Sil
==========================================
*/

async function deleteOrder(id) {

    await orderRef(id).delete();

}

/*
==========================================
Kullanıcının Siparişleri
==========================================
*/

async function getOrdersByUser(email) {

    const snap = await firestore
        .collection("siparisler")
        .where("alici", "==", email)
        .get();

    return snap.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

    }));

}

/*
==========================================
Satıcının Siparişleri
==========================================
*/

async function getOrdersBySeller(email) {

    const snap = await firestore
        .collection("siparisler")
        .where("satici", "==", email)
        .get();

    return snap.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

    }));

}

/*
==========================================
Duruma Göre Siparişler
==========================================
*/

async function getOrdersByStatus(status) {

    const snap = await firestore
        .collection("siparisler")
        .where("durum", "==", status)
        .get();

    return snap.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

    }));

}

module.exports = {

    orderRef,

    getOrder,

    createOrder,

    updateOrder,

    deleteOrder,

    getOrdersByUser,

    getOrdersBySeller,

    getOrdersByStatus

};