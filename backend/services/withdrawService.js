const {
    firestore,
    FieldValue
} = require("../config/firebase");

const walletModel =
    require("../models/walletModel");


/*
==================================================
PARA ÇEKME TALEBİ OLUŞTUR
==================================================
*/

async function paraCek(email, miktar) {

    miktar = Number(miktar);

    if (!email) {

        throw new Error(
            "Satıcı e-posta adresi bulunamadı."
        );

    }

    if (!miktar || miktar <= 0) {

        throw new Error(
            "Geçerli bir çekim miktarı giriniz."
        );

    }


    /*
    ==============================================
    CÜZDANI BUL
    ==============================================
    */

    const wallet =
        await walletModel.getWallet(email);


    if (!wallet) {

        throw new Error(
            "Satıcı cüzdanı bulunamadı."
        );

    }


    /*
    ==============================================
    IBAN KONTROLÜ
    ==============================================
    */

    if (!wallet.iban) {

        throw new Error(
            "Para çekebilmek için önce IBAN bilgilerinizi kaydedin."
        );

    }


    /*
    ==============================================
    BAKİYE KONTROLÜ
    ==============================================
    */

    const balance =
        Number(wallet.balance || 0);


    if (miktar > balance) {

        throw new Error(
            `Çekilebilir bakiyeniz yetersiz. Mevcut bakiye: ${balance.toFixed(2)} TL`
        );

    }


    /*
    ==============================================
    PARA ÇEKME TALEBİ ID
    ==============================================
    */

    const talepRef =
        firestore
            .collection("geriCekmeTalepleri")
            .doc();


    const walletReference =
        firestore
            .collection("wallets")
            .doc(email);


    /*
    ==============================================
    FIRESTORE TRANSACTION
    ==============================================
    */

    const sonuc =
        await firestore.runTransaction(
            async (transaction) => {

                /*
                Cüzdanı tekrar oku.
                */

                const walletSnapshot =
                    await transaction.get(
                        walletReference
                    );


                if (!walletSnapshot.exists) {

                    throw new Error(
                        "Satıcı cüzdanı bulunamadı."
                    );

                }


                const walletData =
                    walletSnapshot.data();


                const mevcutBalance =
                    Number(
                        walletData.balance || 0
                    );


                /*
                ==================================
                BAKİYEYİ TEKRAR KONTROL ET
                ==================================
                */

                if (miktar > mevcutBalance) {

                    throw new Error(
                        `Çekilebilir bakiyeniz yetersiz. Mevcut bakiye: ${mevcutBalance.toFixed(2)} TL`
                    );

                }


                /*
                ==================================
                YENİ BAKİYE
                ==================================
                */

                const yeniBakiye =
                    Number(
                        (
                            mevcutBalance -
                            miktar
                        ).toFixed(2)
                    );


                /*
                ==================================
                CÜZDAN BAKİYESİNİ DÜŞ
                ==================================
                */

                transaction.update(

                    walletReference,

                    {

                        balance:
                            yeniBakiye,

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    }

                );


                /*
                ==================================
                PARA ÇEKME TALEBİ OLUŞTUR
                ==================================
                */

                transaction.set(

                    talepRef,

                    {

                        email,

                        miktar,

                        iban:
                            walletData.iban || "",

                        bankaAdi:
                            walletData.bankaAdi || "",

                        hesapSahibi:
                            walletData.hesapSahibi || "",

                        durum:
                            "Bekliyor",

                        talepTarihi:
                            FieldValue.serverTimestamp(),

                        islemTarihi:
                            null,

                        aciklama:
                            "",

                        eskiBakiye:
                            mevcutBalance,

                        yeniBakiye:
                            yeniBakiye

                    }

                );


                /*
                ==================================
                SONUÇ
                ==================================
                */

                return {

                    talepId:
                        talepRef.id,

                    miktar,

                    eskiBakiye:
                        mevcutBalance,

                    yeniBakiye:
                        yeniBakiye

                };

            }

        );


    console.log(
        "Para çekme talebi oluşturuldu:",
        sonuc
    );


    return {

        success: true,

        ...sonuc

    };

}


/*
==================================================
PARA ÇEKME TALEPLERİNİ GETİR
==================================================
*/

async function talepleriGetir(email) {

    if (!email) {

        throw new Error(
            "E-posta adresi bulunamadı."
        );

    }

    const snap =
        await firestore
            .collection("geriCekmeTalepleri")
            .where(
                "email",
                "==",
                email
            )
            .get();


    const talepler =
        snap.docs.map(doc => {

            const data =
                doc.data();


            let talepTarihi = null;


            if (data.talepTarihi) {

                if (
                    typeof data.talepTarihi.toDate === "function"
                ) {

                    talepTarihi =
                        data.talepTarihi
                            .toDate()
                            .toISOString();

                } else {

                    talepTarihi =
                        data.talepTarihi;
                }

            }


            return {

                id:
                    doc.id,

                ...data,

                talepTarihi:
                    talepTarihi

            };

        });


    // En yeni talep üstte
    talepler.sort(
        (a, b) => {

            const tarihA =
                a.talepTarihi
                    ? new Date(
                        a.talepTarihi
                    ).getTime()
                    : 0;

            const tarihB =
                b.talepTarihi
                    ? new Date(
                        b.talepTarihi
                    ).getTime()
                    : 0;

            return tarihB - tarihA;

        }
    );


    return talepler;

}


/*
==================================================
BEKLEYEN TALEPLERİ GETİR
==================================================
*/

async function bekleyenTalepleriGetir() {

    const snap =
        await firestore
            .collection("geriCekmeTalepleri")
            .where(
                "durum",
                "==",
                "Bekliyor"
            )
            .get();


    return snap.docs.map(doc => ({

        id:
            doc.id,

        ...doc.data()

    }));

}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    paraCek,

    talepleriGetir,

    bekleyenTalepleriGetir

};