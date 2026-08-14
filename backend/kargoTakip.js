const cron = require("node-cron");
const { getFirestore } = require("firebase-admin/firestore");
const cargoService = require("./services/cargoService");

async function kargolariKontrolEt() {

  const firestore = getFirestore();

  console.log("📦 Kargo kontrolü başladı...");

  const snap = await firestore
    .collection("siparisler")
    .where("durum", "==", "Kargoda")
    .get();

  if (snap.empty) {

    console.log("Kontrol edilecek kargo bulunamadı.");

    return;

  }

  for (const siparisDoc of snap.docs) {

    const siparis = siparisDoc.data();

    console.log("Kontrol:", siparisDoc.id);

    /*
    ==================================================
    BURASI DAHA SONRA
    MNG / ARAS / YURTİÇİ API
    ile değişecek.
    ==================================================
    */

    const teslimEdildi = true; // TEST

    if (!teslimEdildi) {

      continue;

    }

    /*
    Wallet aktarımı daha önce yapıldıysa geç
    */

    if (siparis.walletAktarildi) {

      console.log("⚠️ Daha önce aktarılmış.");

      continue;

    }

    /*
    Tüm işlemleri cargoService yapıyor.
    */

    await cargoService.teslimEdilenSiparis(

      siparisDoc.id

    );

    console.log("✅ Sipariş tamamlandı :", siparisDoc.id);

  }

}

/*
==================================================
HER 30 DAKİKADA ÇALIŞ
==================================================
*/

cron.schedule("*/30 * * * *", async () => {

  try {

    await kargolariKontrolEt();

  } catch (err) {

    console.log("❌ Kargo Kontrol Hatası");

    console.log(err);

  }

});

module.exports = {

  kargolariKontrolEt

};