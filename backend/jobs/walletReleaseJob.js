const cron = require("node-cron");
const walletReleaseService = require("../services/walletReleaseService");

let running = false;

function startWalletReleaseJob() {
    cron.schedule("7 * * * *", async () => {
        if (running) return;
        running = true;

        try {
            const result = await walletReleaseService.blokajiDolanlariAktar();
            console.log("Hakediş kontrolü tamamlandı.", {
                checked: result.toplam || 0,
                released: result.basarili || 0,
                failed: result.basarisiz || 0
            });
        } catch {
            console.error("Hakediş kontrolü tamamlanamadı.");
        } finally {
            running = false;
        }
    });
}

module.exports = { startWalletReleaseJob };
