const { firestore, FieldValue } = require("../config/firebase");

const KOMISYON_ORANI = 0.08;

/*
==========================================
TESLİM EDİLEN SİPARİŞ
==========================================
*/

async function teslimEdilenSiparis(siparisId) {

    const siparisRef = firestore
        .collection("siparisler")
        .doc(siparisId);

    const siparisDoc = await siparisRef.get();

    if (!siparisDoc.exists) return;

    const siparis = siparisDoc.data();

    if (siparis.walletAktarildi) return;

    const toplam = Number(siparis.toplam || 0);

    const komisyon = toplam * KOMISYON_ORANI;

    const net = toplam - komisyon;

    const walletRef = firestore
        .collection("wallets")
        .doc(siparis.satici);

    const walletDoc = await walletRef.get();

    if (walletDoc.exists) {

        const wallet = walletDoc.data();

        await walletRef.update({

            pending:
                Math.max(
                    0,
                    Number(wallet.pending || 0) - net
                ),

            balance:
                Number(wallet.balance || 0) + net,

            guncellenmeTarihi:
                FieldValue.serverTimestamp()

        });

    }

    await firestore
        .collection("bakiyeHareketleri")
        .add({

            siparisId,

            satici: siparis.satici,

            alici: siparis.alici,

            toplamTutar: toplam,

            komisyon,

            netTutar: net,

            tip: "Teslim Sonrası Aktarım",

            durum: "Hazır",

            tarih: FieldValue.serverTimestamp()

        });

    await siparisRef.update({

        durum: "Teslim Edildi",

        walletAktarildi: true,

        teslimTarihi: FieldValue.serverTimestamp()

    });

}

/*
==========================================
TEK KARGO KONTROL
==========================================
*/

async function kargoKontrol(siparisId) {

    await teslimEdilenSiparis(siparisId);

    return true;

}

/*
==========================================
TÜM KARGOLARI KONTROL
==========================================
*/

async function kargolariKontrolEt() {

    const snap = await firestore
        .collection("siparisler")
        .where("durum", "==", "Kargoda")
        .get();

    if (snap.empty) {

        console.log("Kontrol edilecek kargo bulunamadı.");

        return;

    }

    for (const doc of snap.docs) {

        await teslimEdilenSiparis(doc.id);

    }

}

module.exports = {

    teslimEdilenSiparis,

    kargoKontrol,

    kargolariKontrolEt

};