const cron = require("node-cron");
const { runMaintenance } = require("../services/maintenanceService");

let running = false;

function startWalletReleaseJob() {
    cron.schedule("7 * * * *", async () => {
        if (running) return;
        running = true;

        try {
            const result = await runMaintenance();
            console.log("Yedek bakım kontrolü tamamlandı.", {
                alreadyRunning: result.alreadyRunning,
                reservationsReleased: result.stockReservations?.released || 0,
                payoutsReleased: result.walletReleases?.basarili || 0
            });
        } catch {
            console.error("Yedek bakım kontrolü tamamlanamadı.");
        } finally {
            running = false;
        }
    });
}

module.exports = { startWalletReleaseJob };
