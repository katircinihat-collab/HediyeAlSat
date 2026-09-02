const { firestore } = require("../config/firebase");

/*
==================================================
STOK SERVİSİ
==================================================
*/

/*
==========================================
STOK DÜŞ
==========================================
*/

async function stokDus(urunId, adet = 1) {

    if (!urunId) return;

    const urunRef = firestore
        .collection("ilanlar")
        .doc(urunId);

    const urunDoc = await urunRef.get();

    if (!urunDoc.exists) {

        console.log("Ürün bulunamadı.");

        return;

    }

    const urun = urunDoc.data();

    // Dijital tasarımlar tekrar satılabilir; stokları düşmez ve pasife alınmaz.
    if (urun.urunTipi === "dijital") return;

    const mevcutStok =
        Number(urun.stok || 0);

    const yeniStok =
        Math.max(
            0,
            mevcutStok - Number(adet)
        );

    const guncelle = {

        stok: yeniStok

    };

    /*
    Stok bittiyse ilan pasif olsun
    */

    if (yeniStok <= 0) {

        guncelle.aktif = false;

    }

    await urunRef.update(guncelle);

}

/*
==========================================
STOK EKLE
==========================================
*/

async function stokEkle(urunId, adet = 1) {

    if (!urunId) return;

    const urunRef = firestore
        .collection("ilanlar")
        .doc(urunId);

    const urunDoc = await urunRef.get();

    if (!urunDoc.exists) return;

    const urun = urunDoc.data();

    // Dijital tasarımlar stok tabanlı olmadığı için iade sırasında da stok değişmez.
    if (urun.urunTipi === "dijital") return;

    await urunRef.update({

        stok:
            Number(urun.stok || 0) +
            Number(adet),

        aktif: true

    });

}

/*
==========================================
STOK GETİR
==========================================
*/

async function stokGetir(urunId) {

    if (!urunId) return null;

    const doc = await firestore

        .collection("ilanlar")

        .doc(urunId)

        .get();

    if (!doc.exists) {

        return null;

    }

    return {

        id: doc.id,

        ...doc.data()

    };

}

module.exports = {

    stokDus,

    stokEkle,

    stokGetir

};
