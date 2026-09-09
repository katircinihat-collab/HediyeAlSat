const walletModel =
    require("../models/walletModel");

const commission =
    require("../utils/commission");
const { normalizeTurkishIban, isValidTurkishIban } = require("../utils/iban");

const MINIMUM_WITHDRAWAL_AMOUNT = 50;


/*
==================================================
WALLET GÜNCELLE
==================================================
*/

async function walletGuncelle(
    siparis,
    paymentId,
    conversationId,
    blockageResolvedDate = null
) {

    console.log(
        "Cüzdan güncelleme başladı:",
        siparis.id
    );


    const urunFiyati =
        Number(siparis.fiyat || 0);


    if (
        !Number.isFinite(urunFiyati) ||
        urunFiyati <= 0
    ) {

        throw new Error(
            "Geçersiz ürün fiyatı."
        );

    }


    const hesap =
        commission.hesapla(
            urunFiyati
        );


    console.log(
        "Ürün fiyatı:",
        hesap.toplamTutar
    );

    console.log(
        "Komisyon:",
        hesap.komisyon
    );

    console.log(
        "Satıcı net:",
        hesap.netTutar
    );


    const sonuc =
        await walletModel.satisiCuzdanaEkle(

            siparis,

            hesap,

            paymentId,

            conversationId,

            blockageResolvedDate

        );


    if (sonuc.zatenIslendi) {

        console.log(
            "Satış zaten cüzdana işlendi:",
            siparis.id
        );

    } else {

        console.log(
            "Satış pending bakiyeye eklendi:",
            siparis.satici
        );

    }


    return {

        success: true,

        zatenIslendi:
            sonuc.zatenIslendi,

        toplamTutar:
            hesap.toplamTutar,

        komisyon:
            hesap.komisyon,

        netTutar:
            hesap.netTutar

    };

}


/*
==================================================
PENDING → BALANCE
==================================================
*/

async function bakiyeyiKullanilabilirYap(
    hareketId
) {

    if (!hareketId) {

        throw new Error(
            "Hareket ID gerekli."
        );

    }


    return await walletModel
        .pendingBakiyeyiAktar(
            hareketId
        );

}


/*
==================================================
WALLET BİLGİSİ
==================================================
*/

async function getWallet(email, ownerUid = null) {

    if (!email) {

        throw new Error(
            "Email gerekli."
        );

    }


    let wallet =
        await walletModel.getWallet(
            email
        );


    if (!wallet) {

        console.log(
            "Cüzdan bulunamadı, oluşturuluyor:",
            email
        );


        await walletModel.createWallet(
            email,
            ownerUid
        );


        wallet =
            await walletModel.getWallet(
                email
            );

    }

    if (ownerUid && wallet && wallet.ownerUid !== ownerUid) {
        await walletModel.updateWallet(email, { ownerUid });
        wallet.ownerUid = ownerUid;
    }


    if (wallet) {

        wallet.balance =
            Number(wallet.balance || 0);

        wallet.pending =
            Number(wallet.pending || 0);

        wallet.paid =
            Number(wallet.paid || 0);

        wallet.withdrawalPending =
            Number(
                wallet.withdrawalPending || 0
            );

    }


    return wallet;

}


/*
==================================================
IBAN KAYDET
==================================================
*/

async function ibanKaydet(
    email,
    data,
    ownerUid = null
) {

    if (!email) {

        throw new Error(
            "Kullanıcı bulunamadı."
        );

    }


    if (!data) {

        throw new Error(
            "Banka bilgileri bulunamadı."
        );

    }


    if (!data.iban) {

        throw new Error(
            "IBAN boş bırakılamaz."
        );

    }


    const iban = normalizeTurkishIban(data.iban);


    if (
        !isValidTurkishIban(iban)
    ) {

        throw new Error(
            "Geçerli bir Türkiye IBAN'ı giriniz."
        );

    }


    const hesapSahibi = String(data.hesapSahibi || "").trim();
    const bankaAdi = String(data.bankaAdi || "").trim();
    if (hesapSahibi.length < 3 || hesapSahibi.length > 120) {
        throw new Error("Hesap sahibi adı geçersiz.");
    }

    if (bankaAdi.length < 2 || bankaAdi.length > 100) {
        throw new Error("Banka adı geçersiz.");
    }

    await walletModel.updateWallet(

        email,

        {

            iban,

            bankaAdi,
            hesapSahibi,
            ...(ownerUid ? { ownerUid } : {})

        }

    );


    return await getWallet(
        email
    );

}


/*
==================================================
PARA ÇEKME TALEBİ
==================================================
*/

async function paraCek(
    email,
    tutar,
    options = {}
) {

    console.log(
        "Para çekme başladı:",
        {
            email,
            tutar
        }
    );


    if (!email) {

        throw new Error(
            "Kullanıcı email bilgisi bulunamadı."
        );

    }


    const miktar =
        Number(tutar);

    const miktarKurus = Math.round(miktar * 100);


    console.log(
        "Para çekme miktarı:",
        miktar
    );


    if (
        !Number.isFinite(miktar) ||
        miktar <= 0 ||
        Math.abs(miktar * 100 - miktarKurus) > 0.000001
    ) {

        throw new Error(
            "Geçerli bir tutar giriniz."
        );

    }


    if (miktar < MINIMUM_WITHDRAWAL_AMOUNT) {

        throw new Error(
            "Minimum para çekme tutarı 50 TL'dir."
        );

    }


    const wallet =
        await getWallet(
            email
        );


    if (!wallet) {

        throw new Error(
            "Cüzdan bulunamadı."
        );

    }


    const balance =
        Number(
            wallet.balance || 0
        );


    console.log(
        "Mevcut bakiye:",
        balance
    );


    if (miktar > balance) {

        throw new Error(
            "Kullanılabilir bakiye yetersiz. Mevcut bakiye: " +
            balance.toFixed(2) +
            " TL"
        );

    }


    if (!wallet.iban) {

        throw new Error(
            "Önce IBAN bilgilerinizi kaydedin."
        );

    }


    const sonuc =
        await walletModel
            .paraCekmeTalebiOlustur(

                email,

                miktar,

                wallet.iban,

                wallet.bankaAdi || "",

                wallet.hesapSahibi || "",
                {
                    ownerUid: options.ownerUid || null,
                    idempotencyKey: options.idempotencyKey || null
                }

            );


    console.log(
        "Para çekme talebi oluşturuldu:",
        sonuc
    );


    return sonuc;

}


/*
==================================================
PARA ÇEKME TALEPLERİ
==================================================
*/

async function paraCekmeTaleplerim(
    email
) {

    if (!email) {

        throw new Error(
            "Email gerekli."
        );

    }


    return await walletModel
        .getWithdrawals(
            email
        );

}


/*
==================================================
ADMIN - PARA ÇEKME ONAY
==================================================
*/

async function paraCekmeOnayla(
    withdrawalId
) {

    if (!withdrawalId) {

        throw new Error(
            "Para çekme talebi ID gerekli."
        );

    }


    return await walletModel
        .paraCekmeOnayla(
            withdrawalId
        );

}


/*
==================================================
ADMIN - PARA ÇEKME RED
==================================================
*/

async function paraCekmeReddet(
    withdrawalId,
    neden
) {

    if (!withdrawalId) {

        throw new Error(
            "Para çekme talebi ID gerekli."
        );

    }


    return await walletModel
        .paraCekmeReddet(

            withdrawalId,

            neden ||
            "Belirtilmedi"

        );

}


/*
==================================================
ADMIN / TÜM TALEPLER
==================================================
*/

async function tumParaCekmeTalepleri() {

    return await walletModel
        .getWithdrawals();

}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    walletGuncelle,

    bakiyeyiKullanilabilirYap,

    getWallet,

    ibanKaydet,

    paraCek,

    paraCekmeTaleplerim,

    paraCekmeOnayla,

    paraCekmeReddet,

    tumParaCekmeTalepleri,

    MINIMUM_WITHDRAWAL_AMOUNT

};
