const {
    firestore,
    FieldValue
} = require("../config/firebase");


/*
==================================================
BEKLEYEN PARA ÇEKME TALEPLERİ
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

        id: doc.id,

        ...doc.data()

    }));

}


/*
==================================================
PARA ÇEKME TALEBİNİ ÖDENDİ YAP
==================================================

ÖNEMLİ:

Para çekme talebi oluşturulduğunda
satıcının balance değeri zaten düşürülür.

Örneğin:

Balance: 138 TL

46 TL çekim talebi oluşturuldu:

Balance: 92 TL

Admin parayı gerçekten gönderdiğinde:

Balance: 92 TL
Paid: 46 TL

Yani burada balance tekrar düşürülmez.

Sadece:

paid += miktar

yapılır.
==================================================
*/

async function odendiYap(talepId) {

    if (!talepId) {

        throw new Error(
            "Para çekme talep ID bulunamadı."
        );

    }


    const talepRef =
        firestore
            .collection("geriCekmeTalepleri")
            .doc(talepId);


    const sonuc =
        await firestore.runTransaction(
            async (transaction) => {

                /*
                ==================================
                TALEBİ OKU
                ==================================
                */

                const talepSnapshot =
                    await transaction.get(
                        talepRef
                    );


                if (!talepSnapshot.exists) {

                    throw new Error(
                        "Para çekme talebi bulunamadı."
                    );

                }


                const talep =
                    talepSnapshot.data();


                /*
                ==================================
                SADECE BEKLEYEN TALEP ÖDENEBİLİR
                ==================================
                */

                if (
                    talep.durum !==
                    "Bekliyor"
                ) {

                    throw new Error(
                        `Bu talep zaten işlendi. Durum: ${talep.durum}`
                    );

                }


                /*
                ==================================
                SATIŞÇI EMAIL
                ==================================
                */

                const email =
                    talep.email;


                if (!email) {

                    throw new Error(
                        "Talepte satıcı e-posta adresi bulunamadı."
                    );

                }


                /*
                ==================================
                ÇEKİM MİKTARI
                ==================================
                */

                const miktar =
                    Number(
                        talep.miktar || 0
                    );


                if (
                    !miktar ||
                    miktar <= 0
                ) {

                    throw new Error(
                        "Geçersiz çekim miktarı."
                    );

                }


                /*
                ==================================
                CÜZDANI OKU
                ==================================
                */

                const walletRef =
                    firestore
                        .collection("wallets")
                        .doc(email);


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


                /*
                ==================================
                MEVCUT DEĞERLER
                ==================================
                */

                const mevcutBalance =
                    Number(
                        wallet.balance || 0
                    );


                const mevcutPaid =
                    Number(
                        wallet.paid || 0
                    );


                /*
                ==================================
                YENİ PAID
                ==================================
                */

                const yeniPaid =
                    Number(
                        (
                            mevcutPaid +
                            miktar
                        ).toFixed(2)
                    );


                /*
                ==================================
                CÜZDANI GÜNCELLE
                ==================================

                BALANCE DEĞİŞMEZ.

                Çünkü para çekme talebi
                oluşturulduğunda balance zaten
                düşürülmüş durumda.
                ==================================
                */

                transaction.update(

                    walletRef,

                    {

                        balance:
                            mevcutBalance,

                        paid:
                            yeniPaid,

                        sonOdeme:
                            FieldValue.serverTimestamp(),

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    }

                );


                /*
                ==================================
                TALEBİ ÖDENDİ YAP
                ==================================
                */

                transaction.update(

                    talepRef,

                    {

                        durum:
                            "Ödendi",

                        islemTarihi:
                            FieldValue.serverTimestamp(),

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp(),

                        odemeTutari:
                            miktar,

                        eskiPaid:
                            mevcutPaid,

                        yeniPaid:
                            yeniPaid

                    }

                );


                /*
                ==================================
                BAKİYE HAREKETİ
                ==================================
                */

                const hareketRef =
                    firestore
                        .collection(
                            "bakiyeHareketleri"
                        )
                        .doc();


                transaction.set(

                    hareketRef,

                    {

                        satici:
                            email,

                        tip:
                            "Para Çekme",

                        tutar:
                            miktar,

                        oncekiBakiye:
                            mevcutBalance,

                        yeniBakiye:
                            mevcutBalance,

                        oncekiPaid:
                            mevcutPaid,

                        yeniPaid:
                            yeniPaid,

                        talepId,

                        durum:
                            "Ödendi",

                        iban:
                            talep.iban || "",

                        bankaAdi:
                            talep.bankaAdi || "",

                        hesapSahibi:
                            talep.hesapSahibi || "",

                        aciklama:
                            "Para çekme talebi ödendi.",

                        tarih:
                            FieldValue.serverTimestamp()

                    }

                );


                /*
                ==================================
                SONUÇ
                ==================================
                */

                return {

                    talepId,

                    email,

                    miktar,

                    eskiBakiye:
                        mevcutBalance,

                    yeniBakiye:
                        mevcutBalance,

                    eskiPaid:
                        mevcutPaid,

                    yeniPaid,

                    durum:
                        "Ödendi"

                };

            }

        );


    console.log(
        "Para çekme talebi ödendi:",
        sonuc
    );


    return {

        success: true,

        ...sonuc

    };

}


/*
==================================================
PARA ÇEKME TALEBİNİ REDDET
==================================================

Reddedilen para satıcının balance hesabına
geri iade edilir.

Örnek:

Talep öncesi:

Balance: 92 TL

46 TL çekim talebi:

Balance: 46 TL

Talep reddedilirse:

Balance: 92 TL

Paid değişmez.

Pending değişmez.
==================================================
*/

async function reddet(
    talepId,
    aciklama = ""
) {

    if (!talepId) {

        throw new Error(
            "Para çekme talep ID bulunamadı."
        );

    }


    const talepRef =
        firestore
            .collection("geriCekmeTalepleri")
            .doc(talepId);


    const sonuc =
        await firestore.runTransaction(
            async (transaction) => {

                /*
                ==================================
                TALEBİ OKU
                ==================================
                */

                const talepSnapshot =
                    await transaction.get(
                        talepRef
                    );


                if (!talepSnapshot.exists) {

                    throw new Error(
                        "Para çekme talebi bulunamadı."
                    );

                }


                const talep =
                    talepSnapshot.data();


                /*
                ==================================
                SADECE BEKLEYEN TALEP REDDEDİLEBİLİR
                ==================================
                */

                if (
                    talep.durum !==
                    "Bekliyor"
                ) {

                    throw new Error(
                        `Bu talep zaten işlendi. Durum: ${talep.durum}`
                    );

                }


                /*
                ==================================
                EMAIL
                ==================================
                */

                const email =
                    talep.email;


                if (!email) {

                    throw new Error(
                        "Talepte satıcı e-posta adresi bulunamadı."
                    );

                }


                /*
                ==================================
                MİKTAR
                ==================================
                */

                const miktar =
                    Number(
                        talep.miktar || 0
                    );


                if (
                    !miktar ||
                    miktar <= 0
                ) {

                    throw new Error(
                        "Geçersiz çekim miktarı."
                    );

                }


                /*
                ==================================
                CÜZDANI OKU
                ==================================
                */

                const walletRef =
                    firestore
                        .collection("wallets")
                        .doc(email);


                const walletSnapshot =
                    await transaction.get(
                        walletRef
                    );


                if (
                    !walletSnapshot.exists
                ) {

                    throw new Error(
                        "Satıcı cüzdanı bulunamadı."
                    );

                }


                const wallet =
                    walletSnapshot.data();


                const mevcutBalance =
                    Number(
                        wallet.balance || 0
                    );


                /*
                ==================================
                PARAYI GERİ EKLE
                ==================================
                */

                const yeniBalance =
                    Number(
                        (
                            mevcutBalance +
                            miktar
                        ).toFixed(2)
                    );


                /*
                ==================================
                CÜZDANI GÜNCELLE
                ==================================
                */

                transaction.update(

                    walletRef,

                    {

                        balance:
                            yeniBalance,

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp()

                    }

                );


                /*
                ==================================
                TALEBİ REDDEDİLDİ YAP
                ==================================
                */

                transaction.update(

                    talepRef,

                    {

                        durum:
                            "Reddedildi",

                        aciklama:
                            aciklama ||
                            "Talep reddedildi.",

                        islemTarihi:
                            FieldValue.serverTimestamp(),

                        guncellenmeTarihi:
                            FieldValue.serverTimestamp(),

                        iadeEdilenTutar:
                            miktar

                    }

                );


                /*
                ==================================
                BAKİYE HAREKETİ
                ==================================
                */

                const hareketRef =
                    firestore
                        .collection(
                            "bakiyeHareketleri"
                        )
                        .doc();


                transaction.set(

                    hareketRef,

                    {

                        satici:
                            email,

                        tip:
                            "Para Çekme İadesi",

                        tutar:
                            miktar,

                        oncekiBakiye:
                            mevcutBalance,

                        yeniBakiye:
                            yeniBalance,

                        talepId,

                        durum:
                            "Reddedildi",

                        aciklama:
                            aciklama ||
                            "Para çekme talebi reddedildi.",

                        tarih:
                            FieldValue.serverTimestamp()

                    }

                );


                /*
                ==================================
                SONUÇ
                ==================================
                */

                return {

    talepId,

    email,

    miktar,

    eskiBakiye:
        mevcutBalance,

    yeniBakiye:
        yeniBalance,

    durum:
        "Reddedildi"

};

            }

        );


    console.log(
        "Para çekme talebi reddedildi:",
        sonuc
    );


    return {

        success: true,

        ...sonuc

    };

}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    bekleyenTalepleriGetir,

    odendiYap,

    reddet

};