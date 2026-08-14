const {
    firestore,
    FieldValue
} = require("../config/firebase");


/*
==================================================
WALLET RELEASE SERVICE
==================================================

Amaç:

Satış ödeme aldığında:

pending
   ↓
blokaj süresi
   ↓
balance

Yani para blokaj süresi dolmadan
satıcının kullanılabilir bakiyesine geçmez.

==================================================
*/


/*
==================================================
TARİH PARSE
==================================================
*/

function parseBlockageDate(value) {

    if (!value) {
        return null;
    }


    if (value instanceof Date) {
        return value;
    }


    if (
        value &&
        typeof value.toDate === "function"
    ) {

        return value.toDate();

    }


    if (typeof value === "string") {

        /*
        iyzico formatı:

        yyyy-MM-dd HH:mm:ss
        */

        const normalized =
            value.replace(" ", "T");

        const date =
            new Date(normalized);

        if (!isNaN(date.getTime())) {
            return date;
        }

    }


    return null;

}


/*
==================================================
BİR HAREKETİ BALANCE'A AKTAR
==================================================
*/

async function hareketiBalanceAktar(
    hareketId
) {

    const hareketRef =
        firestore
            .collection("bakiyeHareketleri")
            .doc(hareketId);


    const sonuc =
        await firestore.runTransaction(

            async (transaction) => {

                /*
                ======================================
                HAREKETİ OKU
                ======================================
                */

                const hareketSnapshot =
                    await transaction.get(
                        hareketRef
                    );


                if (!hareketSnapshot.exists) {

                    return {

                        success: false,

                        neden:
                            "Hareket bulunamadı."

                    };

                }


                const hareket =
                    hareketSnapshot.data();


                /*
                ======================================
                ZATEN AKTARILMIŞ MI?
                ======================================
                */

                if (
                    hareket.durum ===
                    "Aktarıldı"
                ) {

                    return {

                        success: true,

                        zatenAktarildi: true,

                        hareketId

                    };

                }


                /*
                ======================================
                SADECE BEKLEYEN HAREKET
                ======================================
                */

                if (
                    hareket.durum !==
                    "Bekliyor"
                ) {

                    return {

                        success: false,

                        neden:
                            "Hareket bekleyen durumda değil.",

                        durum:
                            hareket.durum

                    };

                }


                /*
                ======================================
                BLOKAJ TARİHİ
                ======================================
                */

                const blockageDate =
                    parseBlockageDate(
                        hareket.blockageResolvedDate
                    );


                /*
                ======================================
                BLOKAJ TARİHİ YOKSA
                ======================================
                */

                if (!blockageDate) {

                    return {

                        success: false,

                        neden:
                            "Blokaj çözülme tarihi bulunamadı.",

                        hareketId

                    };

                }


                /*
                ======================================
                BLOKAJ HALA DEVAM EDİYOR
                ======================================
                */

                if (
                    blockageDate.getTime() >
                    Date.now()
                ) {

                    return {

                        success: false,

                        bekliyor: true,

                        neden:
                            "Blokaj süresi henüz dolmadı.",

                        blockageResolvedDate:
                            blockageDate.toISOString(),

                        hareketId

                    };

                }


                /*
                ======================================
                SATICI
                ======================================
                */

                const satici =
                    hareket.satici;


                if (!satici) {

                    throw new Error(
                        "Hareket içerisinde satıcı bulunamadı."
                    );

                }


                /*
                ======================================
                WALLET
                ======================================
                */

                const walletRef =
                    firestore
                        .collection("wallets")
                        .doc(satici);


                const walletSnapshot =
                    await transaction.get(
                        walletRef
                    );


                if (!walletSnapshot.exists) {

                    throw new Error(
                        "Satıcı cüzdanı bulunamadı."
                    );

                }


                const wallet =
                    walletSnapshot.data();


                const pending =
                    Number(
                        wallet.pending || 0
                    );


                const balance =
                    Number(
                        wallet.balance || 0
                    );


                const netTutar =
                    Number(
                        hareket.netTutar || 0
                    );


                /*
                ======================================
                PENDING'DEN DÜŞ
                ======================================
                */

                const yeniPending =
                    Number(

                        Math.max(
                            0,
                            pending - netTutar
                        ).toFixed(2)

                    );


                /*
                ======================================
                BALANCE'A EKLE
                ======================================
                */

                const yeniBalance =
                    Number(

                        (
                            balance +
                            netTutar
                        ).toFixed(2)

                    );


                /*
                ======================================
                WALLET GÜNCELLE
                ======================================
                */

                transaction.update(

                    walletRef,

                    {

                        pending:
                            yeniPending,

                        balance:
                            yeniBalance,

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    }

                );


                /*
                ======================================
                HAREKETİ GÜNCELLE
                ======================================
                */

                transaction.update(

                    hareketRef,

                    {

                        durum:
                            "Aktarıldı",

                        aktarilmaTarihi:
                            FieldValue.serverTimestamp(),

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    }

                );


                return {

                    success: true,

                    zatenAktarildi: false,

                    hareketId,

                    satici,

                    netTutar,

                    yeniPending,

                    yeniBalance

                };

            }

        );


    return sonuc;

}


/*
==================================================
BLOKAJI DOLMUŞ TÜM HAREKETLER
==================================================
*/

async function blokajiDolanlariGetir() {

    const snapshot =
        await firestore
            .collection("bakiyeHareketleri")
            .where(
                "durum",
                "==",
                "Bekliyor"
            )
            .get();


    const simdi =
        new Date();


    const liste = [];


    snapshot.forEach((doc) => {

        const data =
            doc.data();


        const blockageDate =
            parseBlockageDate(
                data.blockageResolvedDate
            );


        if (!blockageDate) {
            return;
        }


        if (
            blockageDate.getTime() <=
            simdi.getTime()
        ) {

            liste.push({

                id: doc.id,

                ...data,

                blockageResolvedDate:
                    blockageDate

            });

        }

    });


    return liste;

}


/*
==================================================
BLOKAJI DOLMUŞ SATIŞLARI BALANCE'A AKTAR
==================================================
*/

async function blokajiDolanlariAktar() {

    const liste =
        await blokajiDolanlariGetir();


    const sonuc = {

        toplam:
            liste.length,

        basarili:
            0,

        zatenAktarildi:
            0,

        hatali:
            0,

        detaylar: []

    };


    for (
        const hareket of liste
    ) {

        try {

            const result =
                await hareketiBalanceAktar(
                    hareket.id
                );


            sonuc.detaylar.push({

                hareketId:
                    hareket.id,

                result

            });


            if (
                result.zatenAktarildi
            ) {

                sonuc.zatenAktarildi++;

            }

            else if (
                result.success
            ) {

                sonuc.basarili++;

            }

            else {

                sonuc.hatali++;

            }

        }

        catch (error) {

            sonuc.hatali++;


            sonuc.detaylar.push({

                hareketId:
                    hareket.id,

                success:
                    false,

                error:
                    error.message

            });

        }

    }


    return sonuc;

}


/*
==================================================
SATIŞIN BLOKAJ DURUMUNU KONTROL ET
==================================================
*/

async function hareketDurumuGetir(
    hareketId
) {

    const ref =
        firestore
            .collection("bakiyeHareketleri")
            .doc(hareketId);


    const snapshot =
        await ref.get();


    if (!snapshot.exists) {

        return null;

    }


    const data =
        snapshot.data();


    const blockageDate =
        parseBlockageDate(
            data.blockageResolvedDate
        );


    const blokajDoldu =
        blockageDate
        ? blockageDate.getTime() <= Date.now()
        : false;


    return {

        id: snapshot.id,

        ...data,

        blokajDoldu,

        blockageResolvedDate:
            blockageDate

    };

}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    parseBlockageDate,

    hareketiBalanceAktar,

    blokajiDolanlariGetir,

    blokajiDolanlariAktar,

    hareketDurumuGetir

};