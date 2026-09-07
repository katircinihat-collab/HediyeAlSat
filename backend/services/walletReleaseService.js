const {
    firestore,
    FieldValue
} = require("../config/firebase");
const { getPayoutEligibility } = require("./deliveryConfirmationService");
const { toKurus } = require("./paymentCallbackService");


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
    hareketId,
    dependencies = {}
) {

    const activeFirestore = dependencies.firestore || firestore;
    const activeFieldValue = dependencies.FieldValue || FieldValue;
    const currentTime = dependencies.now ? dependencies.now() : new Date();

    const hareketRef =
        activeFirestore
            .collection("bakiyeHareketleri")
            .doc(hareketId);


    const sonuc =
        await activeFirestore.runTransaction(

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

                if (!hareket.siparisId) {
                    throw new Error("Hareketin sipariş bağlantısı bulunamadı; manuel inceleme gerekli.");
                }

                const orderRef = activeFirestore.collection("siparisler").doc(hareket.siparisId);
                const orderSnapshot = await transaction.get(orderRef);
                if (!orderSnapshot.exists) {
                    throw new Error("Hakedişe ait sipariş bulunamadı; manuel inceleme gerekli.");
                }
                const order = orderSnapshot.data();


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

                const blockageDate = parseBlockageDate(order.hakEdisBlokeBitis);


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
                    currentTime.getTime()
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

                const eligibility = getPayoutEligibility(order, currentTime);
                if (!eligibility.eligible) {
                    return {
                        success: false,
                        neden: eligibility.reason === "ACTIVE_CLAIM"
                            ? "Siparişte aktif iade/itiraz bulunduğu için hakediş bekletiliyor."
                            : "Sipariş hakediş aktarımına uygun değil.",
                        reason: eligibility.reason || "ORDER_NOT_ELIGIBLE",
                        hareketId
                    };
                }

                if (order.refundProviderStatus === "success" || order.refundAccountingStatus === "completed") {
                    return { success: false, neden: "İade edilmiş siparişin hakedişi aktarılamaz.", reason: "ORDER_REFUNDED", hareketId };
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
                    activeFirestore
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


                const pendingKurus = toKurus(wallet.pending || 0);
                const balanceKurus = toKurus(wallet.balance || 0);
                const netTutarKurus = toKurus(hareket.netTutar || 0);
                if (!Number.isInteger(netTutarKurus) || netTutarKurus <= 0
                    || !Number.isInteger(pendingKurus) || pendingKurus < netTutarKurus) {
                    throw new Error("Bekleyen bakiye hakediş tutarını karşılamıyor; manuel inceleme gerekli.");
                }
                const netTutar = Number((netTutarKurus / 100).toFixed(2));


                /*
                ======================================
                PENDING'DEN DÜŞ
                ======================================
                */

                const yeniPending = Number(((pendingKurus - netTutarKurus) / 100).toFixed(2));


                /*
                ======================================
                BALANCE'A EKLE
                ======================================
                */

                const yeniBalance = Number(((balanceKurus + netTutarKurus) / 100).toFixed(2));


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
                            activeFieldValue.serverTimestamp()

                    }

                );

                transaction.update(orderRef, {
                    walletAktarildi: true,
                    hakEdisOdendi: true,
                    payoutCompleted: true,
                    hakEdisDurumu: "Ödendi",
                    hakEdisOdemeTarihi: activeFieldValue.serverTimestamp(),
                    guncellenmeTarihi: activeFieldValue.serverTimestamp()
                });


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
                            activeFieldValue.serverTimestamp(),

                        guncellenmeTarihi:
                            activeFieldValue.serverTimestamp()

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

            const { recordFinancialReconciliation } = require("./financialReconciliationService");
            await recordFinancialReconciliation({ firestore, event: {
                type: "wallet_release",
                reasonCode: "WALLET_RELEASE_MANUAL_REVIEW",
                reason: error.message,
                orderId: hareket.siparisId || null,
                paymentId: hareket.paymentId || null,
                seller: hareket.satici || null,
                grossAmount: hareket.toplamTutar,
                commissionAmount: hareket.komisyon,
                sellerNetAmount: hareket.netTutar,
                sourceCollection: "bakiyeHareketleri",
                sourceId: hareket.id
            } }).catch(() => undefined);

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
