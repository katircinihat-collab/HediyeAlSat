const { firestore, FieldValue } =
    require("../config/firebase");


/*
==================================================
WALLET MODEL
==================================================
*/


function walletRef(email) {

    return firestore
        .collection("wallets")
        .doc(email);

}


/*
==================================================
WALLET OKU
==================================================
*/

async function getWallet(email) {

    const snapshot =
        await walletRef(email).get();

    if (!snapshot.exists) {

        return null;

    }

    return {

        id: snapshot.id,

        ...snapshot.data()

    };

}


/*
==================================================
WALLET OLUŞTUR
==================================================
*/

async function createWallet(email) {

    const ref =
        walletRef(email);

    const mevcut =
        await ref.get();

    if (mevcut.exists) {

        return {

            id: ref.id,

            ...mevcut.data()

        };

    }

    await ref.set({

        email,

        balance: 0,

        pending: 0,

        withdrawalPending: 0,

        paid: 0,

        iban: "",

        bankaAdi: "",

        hesapSahibi: "",

        sonOdeme: null,

        olusturmaTarihi:
            FieldValue.serverTimestamp(),

        guncellenmeTarihi:
            FieldValue.serverTimestamp()

    });

    return ref;

}


/*
==================================================
WALLET GÜNCELLE
==================================================
*/

async function updateWallet(
    email,
    data
) {

    await walletRef(email).set(

        {

            ...data,

            guncellenmeTarihi:
                FieldValue.serverTimestamp()

        },

        {

            merge: true

        }

    );

}


/*
==================================================
WALLET VAR MI?
==================================================
*/

async function walletExists(email) {

    const snapshot =
        await walletRef(email).get();

    return snapshot.exists;

}


/*
==================================================
WALLET SİL
==================================================
*/

async function deleteWallet(email) {

    await walletRef(email).delete();

}


/*
==================================================
SATIŞI CÜZDANA EKLE
==================================================

Satış doğrudan balance'a gitmez.

Önce:

pending

alanına gider.

Aynı ödeme ikinci kez callback olursa
hareket ID'si sayesinde tekrar eklenmez.

==================================================
*/

async function satisiCuzdanaEkle(
    siparis,
    hesap,
    paymentId,
    conversationId,
    blockageResolvedDate = null
) {

    const satici =
        siparis.satici;

    if (!satici) {

        throw new Error(
            "Siparişte satıcı bilgisi bulunamadı."
        );

    }

    const siparisId =
        siparis.id;

    if (!siparisId) {

        throw new Error(
            "Sipariş ID bulunamadı."
        );

    }

    const walletReference =
        walletRef(satici);

    const hareketId =
        `${paymentId}_${siparisId}`;

    const hareketReference =
        firestore
            .collection("bakiyeHareketleri")
            .doc(hareketId);


    const sonuc =
        await firestore.runTransaction(

            async (transaction) => {

                /*
                ==================================
                HAREKET KONTROLÜ
                ==================================
                */

                const hareketSnapshot =
                    await transaction.get(
                        hareketReference
                    );

                if (hareketSnapshot.exists) {

                    return {

                        zatenIslendi: true

                    };

                }


                /*
                ==================================
                WALLET KONTROL
                ==================================
                */

                const walletSnapshot =
                    await transaction.get(
                        walletReference
                    );

                let walletData = {

                    email: satici,

                    balance: 0,

                    pending: 0,

                    withdrawalPending: 0,

                    paid: 0,

                    iban: "",

                    bankaAdi: "",

                    hesapSahibi: ""

                };

                if (walletSnapshot.exists) {

                    walletData = {

                        ...walletData,

                        ...walletSnapshot.data()

                    };

                }


                const mevcutPending =
                    Number(
                        walletData.pending || 0
                    );

                const netTutar =
                    Number(
                        hesap.netTutar || 0
                    );


                const yeniPending =
                    Number(
                        (
                            mevcutPending +
                            netTutar
                        ).toFixed(2)
                    );


                /*
                ==================================
                WALLET GÜNCELLE
                ==================================
                */

                transaction.set(

                    walletReference,

                    {

                        email: satici,

                        balance:
                            Number(
                                walletData.balance || 0
                            ),

                        pending:
                            yeniPending,

                        withdrawalPending:
                            Number(
                                walletData.withdrawalPending || 0
                            ),

                        paid:
                            Number(
                                walletData.paid || 0
                            ),

                        iban:
                            walletData.iban || "",

                        bankaAdi:
                            walletData.bankaAdi || "",

                        hesapSahibi:
                            walletData.hesapSahibi || "",

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    },

                    {

                        merge: true

                    }

                );


                /*
                ==================================
                BAKİYE HAREKETİ
                ==================================
                */

                transaction.set(

                    hareketReference,

                    {

                        siparisId,

                        satici,

                        alici:
                            siparis.alici || "",

                        toplamTutar:
                            Number(
                                hesap.toplamTutar || 0
                            ),

                        komisyon:
                            Number(
                                hesap.komisyon || 0
                            ),

                        netTutar,

                        komisyonOrani:
                            Number(
                                hesap.komisyonOrani || 0
                            ),

                        blockageResolvedDate:
                            blockageResolvedDate || null,

                        tip: "Satış",

                        durum: "Bekliyor",

                        paymentId,

                        conversationId,

                        tarih:
                            FieldValue.serverTimestamp()

                    }

                );


                return {

                    zatenIslendi: false,

                    netTutar

                };

            }

        );


    return sonuc;

}


/*
==================================================
PENDING → BALANCE
==================================================

Blokaj süresi dolan satışların parası
kullanılabilir bakiyeye geçirilir.

==================================================
*/

async function pendingBakiyeyiAktar(
    hareketId
) {

    const hareketReference =
        firestore
            .collection("bakiyeHareketleri")
            .doc(hareketId);


    const sonuc =
        await firestore.runTransaction(

            async (transaction) => {

                const hareketSnapshot =
                    await transaction.get(
                        hareketReference
                    );

                if (!hareketSnapshot.exists) {

                    throw new Error(
                        "Bakiye hareketi bulunamadı."
                    );

                }

                const hareket =
                    hareketSnapshot.data();


                if (
                    hareket.durum !== "Bekliyor"
                ) {

                    return {

                        zatenAktarildi: true

                    };

                }


                const satici =
                    hareket.satici;

                const netTutar =
                    Number(
                        hareket.netTutar || 0
                    );


                const walletReference =
                    walletRef(satici);


                const walletSnapshot =
                    await transaction.get(
                        walletReference
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


                const yeniPending =
                    Number(
                        (
                            pending -
                            netTutar
                        ).toFixed(2)
                    );

                const yeniBalance =
                    Number(
                        (
                            balance +
                            netTutar
                        ).toFixed(2)
                    );


                transaction.update(

                    walletReference,

                    {

                        pending:
                            Math.max(
                                0,
                                yeniPending
                            ),

                        balance:
                            yeniBalance,

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    }

                );


                transaction.update(

                    hareketReference,

                    {

                        durum: "Kullanılabilir",

                        kullanilabilirTarih:
                            FieldValue.serverTimestamp()

                    }

                );


                return {

                    zatenAktarildi: false,

                    satici,

                    netTutar

                };

            }

        );


    return sonuc;

}


/*
==================================================
PARA ÇEKME TALEBİ OLUŞTUR
==================================================
*/

async function paraCekmeTalebiOlustur(
    email,
    tutar,
    iban,
    bankaAdi,
    hesapSahibi
) {

    const miktar =
        Number(tutar);

    if (
        !Number.isFinite(miktar) ||
        miktar <= 0
    ) {

        throw new Error(
            "Geçerli bir çekim tutarı giriniz."
        );

    }


    const sonuc =
        await firestore.runTransaction(

            async (transaction) => {

                const walletReference =
                    walletRef(email);

                const walletSnapshot =
                    await transaction.get(
                        walletReference
                    );

                if (!walletSnapshot.exists) {

                    throw new Error(
                        "Cüzdan bulunamadı."
                    );

                }


                const wallet =
                    walletSnapshot.data();


                const balance =
                    Number(
                        wallet.balance || 0
                    );


                if (miktar > balance) {

                    throw new Error(
                        "Kullanılabilir bakiye yetersiz."
                    );

                }


                if (!iban) {

                    throw new Error(
                        "IBAN bilgisi bulunamadı."
                    );

                }


                const withdrawalReference =
                    firestore
                        .collection("paraCekmeTalepleri")
                        .doc();


                const yeniBalance =
                    Number(
                        (
                            balance -
                            miktar
                        ).toFixed(2)
                    );


                const yeniWithdrawalPending =
                    Number(
                        (
                            Number(
                                wallet.withdrawalPending || 0
                            ) +
                            miktar
                        ).toFixed(2)
                    );


                /*
                BAKİYEYİ REZERVE ET
                */

                transaction.update(

                    walletReference,

                    {

                        balance:
                            yeniBalance,

                        withdrawalPending:
                            yeniWithdrawalPending,

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    }

                );


                /*
                ÇEKİM TALEBİ
                */

                transaction.set(

                    withdrawalReference,

                    {

                        email,

                        tutar: miktar,

                        iban,

                        bankaAdi:
                            bankaAdi || "",

                        hesapSahibi:
                            hesapSahibi || "",

                        durum: "BEKLIYOR",

                        tarih:
                            FieldValue.serverTimestamp(),

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    }

                );


                /*
                BAKİYE HAREKETİ
                */

                const hareketReference =
                    firestore
                        .collection("bakiyeHareketleri")
                        .doc();


                transaction.set(

                    hareketReference,

                    {

                        satici: email,

                        tip: "Para Çekme",

                        durum: "Bekliyor",

                        toplamTutar: miktar,

                        komisyon: 0,

                        netTutar: miktar,

                        withdrawalId:
                            withdrawalReference.id,

                        tarih:
                            FieldValue.serverTimestamp()

                    }

                );


                return {

                    id:
                        withdrawalReference.id,

                    tutar: miktar

                };

            }

        );


    return sonuc;

}


/*
==================================================
PARA ÇEKME TALEBİNİ ONAYLA
==================================================
*/

async function paraCekmeOnayla(
    withdrawalId
) {

    const sonuc =
        await firestore.runTransaction(

            async (transaction) => {

                const withdrawalReference =
                    firestore
                        .collection("paraCekmeTalepleri")
                        .doc(withdrawalId);


                const withdrawalSnapshot =
                    await transaction.get(
                        withdrawalReference
                    );

                if (
                    !withdrawalSnapshot.exists
                ) {

                    throw new Error(
                        "Para çekme talebi bulunamadı."
                    );

                }


                const withdrawal =
                    withdrawalSnapshot.data();


                if (
                    withdrawal.durum !==
                    "BEKLIYOR"
                ) {

                    return {

                        zatenIslendi: true

                    };

                }


                const walletReference =
                    walletRef(
                        withdrawal.email
                    );


                const walletSnapshot =
                    await transaction.get(
                        walletReference
                    );

                if (
                    !walletSnapshot.exists
                ) {

                    throw new Error(
                        "Cüzdan bulunamadı."
                    );

                }


                const wallet =
                    walletSnapshot.data();


                const miktar =
                    Number(
                        withdrawal.tutar || 0
                    );


                const yeniPending =
                    Number(
                        (
                            Number(
                                wallet.withdrawalPending || 0
                            ) -
                            miktar
                        ).toFixed(2)
                    );


                const yeniPaid =
                    Number(
                        (
                            Number(
                                wallet.paid || 0
                            ) +
                            miktar
                        ).toFixed(2)
                    );


                transaction.update(

                    walletReference,

                    {

                        withdrawalPending:
                            Math.max(
                                0,
                                yeniPending
                            ),

                        paid:
                            yeniPaid,

                        sonOdeme:
                            FieldValue.serverTimestamp(),

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    }

                );


                transaction.update(

                    withdrawalReference,

                    {

                        durum: "ODENDI",

                        odemeTarihi:
                            FieldValue.serverTimestamp(),

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    }

                );


                return {

                    zatenIslendi: false,

                    email:
                        withdrawal.email,

                    tutar: miktar

                };

            }

        );


    return sonuc;

}


/*
==================================================
PARA ÇEKME TALEBİNİ REDDET
==================================================
*/

async function paraCekmeReddet(
    withdrawalId,
    neden = ""
) {

    const sonuc =
        await firestore.runTransaction(

            async (transaction) => {

                const withdrawalReference =
                    firestore
                        .collection("paraCekmeTalepleri")
                        .doc(withdrawalId);


                const withdrawalSnapshot =
                    await transaction.get(
                        withdrawalReference
                    );


                if (
                    !withdrawalSnapshot.exists
                ) {

                    throw new Error(
                        "Para çekme talebi bulunamadı."
                    );

                }


                const withdrawal =
                    withdrawalSnapshot.data();


                if (
                    withdrawal.durum !==
                    "BEKLIYOR"
                ) {

                    return {

                        zatenIslendi: true

                    };

                }


                const walletReference =
                    walletRef(
                        withdrawal.email
                    );


                const walletSnapshot =
                    await transaction.get(
                        walletReference
                    );


                if (
                    !walletSnapshot.exists
                ) {

                    throw new Error(
                        "Cüzdan bulunamadı."
                    );

                }


                const wallet =
                    walletSnapshot.data();


                const miktar =
                    Number(
                        withdrawal.tutar || 0
                    );


                const yeniBalance =
                    Number(
                        (
                            Number(
                                wallet.balance || 0
                            ) +
                            miktar
                        ).toFixed(2)
                    );


                const yeniPending =
                    Number(
                        (
                            Number(
                                wallet.withdrawalPending || 0
                            ) -
                            miktar
                        ).toFixed(2)
                    );


                transaction.update(

                    walletReference,

                    {

                        balance:
                            yeniBalance,

                        withdrawalPending:
                            Math.max(
                                0,
                                yeniPending
                            ),

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    }

                );


                transaction.update(

                    withdrawalReference,

                    {

                        durum: "REDDEDILDI",

                        neden,

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    }

                );


                return {

                    zatenIslendi: false,

                    email:
                        withdrawal.email,

                    tutar: miktar

                };

            }

        );


    return sonuc;

}


/*
==================================================
PARA ÇEKME TALEPLERİNİ GETİR
==================================================
*/

async function getWithdrawals(
    email = null
) {

    let query =
        firestore
            .collection("paraCekmeTalepleri");


    if (email) {

        query =
            query.where(
                "email",
                "==",
                email
            );

    }


    const snapshot =
        await query.get();


    return snapshot.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

    }));

}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    walletRef,

    getWallet,

    createWallet,

    updateWallet,

    walletExists,

    deleteWallet,

    satisiCuzdanaEkle,

    pendingBakiyeyiAktar,

    paraCekmeTalebiOlustur,

    paraCekmeOnayla,

    paraCekmeReddet,

    getWithdrawals

};