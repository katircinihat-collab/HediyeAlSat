const cron = require("node-cron");

const {
    kargolariKontrolEt
} = require("../services/cargoService");

/*
==================================================
HER 30 DAKİKADA KARGO KONTROLÜ
==================================================
*/

function startCargoJob() {

    cron.schedule("*/30 * * * *", async () => {

        console.log("📦 Kargo kontrolü başladı...");

        try {

            await kargolariKontrolEt();

            console.log("✅ Kargo kontrolü tamamlandı.");

        } catch (err) {

            console.log("❌ Kargo kontrol hatası");

            console.log(err);

        }

    });

}

module.exports = {

    startCargoJob

};