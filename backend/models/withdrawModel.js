const { firestore, FieldValue } = require("../config/firebase");

/*
==================================================
WITHDRAW MODEL
Satıcı para çekme talepleri
==================================================
*/

/*
==================================================
REFERANS
==================================================
*/

function withdrawRef(id) {
    return firestore
        .collection("cekmeTalepleri")
        .doc(id);
}


/*
==================================================
TALEP OLUŞTUR
==================================================
*/

async function createWithdraw(data) {

    const ref =
        await firestore
            .collection("cekmeTalepleri")
            .add({

                ...data,

                durum: "BEKLIYOR",

                olusturmaTarihi:
                    FieldValue.serverTimestamp(),

                guncellenmeTarihi:
                    FieldValue.serverTimestamp()

            });

    return {

        id: ref.id,

        ...data,

        durum: "BEKLIYOR"

    };
}


/*
==================================================
TALEP OKU
==================================================
*/

async function getWithdraw(id) {

    const doc =
        await withdrawRef(id).get();

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
SATICININ TALEPLERİ
==================================================
*/

async function getWithdrawsBySeller(email) {

    const snap =
        await firestore
            .collection("cekmeTalepleri")
            .where("satici", "==", email)
            .get();

    return snap.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

    }));
}


/*
==================================================
BEKLEYEN TALEPLER
==================================================
*/

async function getPendingWithdraws() {

    const snap =
        await firestore
            .collection("cekmeTalepleri")
            .where("durum", "==", "BEKLIYOR")
            .get();

    return snap.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

    }));
}


/*
==================================================
TALEP GÜNCELLE
==================================================
*/

async function updateWithdraw(id, data) {

    await withdrawRef(id).update({

        ...data,

        guncellenmeTarihi:
            FieldValue.serverTimestamp()

    });

}


/*
==================================================
TALEP SİL
==================================================
*/

async function deleteWithdraw(id) {

    await withdrawRef(id).delete();

}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    withdrawRef,

    createWithdraw,

    getWithdraw,

    getWithdrawsBySeller,

    getPendingWithdraws,

    updateWithdraw,

    deleteWithdraw

};