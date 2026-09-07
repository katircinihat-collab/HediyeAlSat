const { firestore, FieldValue } = require("../config/firebase");
const walletReleaseService = require("./walletReleaseService");
const { releaseExpiredReservations } = require("./stockReservationService");

function createMaintenanceRunner(dependencies = {}) {
    const cleanupExpiredReservations = dependencies.cleanupExpiredReservations
        || (() => releaseExpiredReservations({ firestore, FieldValue }));
    const releaseWallets = dependencies.releaseWallets
        || (() => walletReleaseService.blokajiDolanlariAktar());
    let running = false;

    return async function runMaintenance() {
        if (running) {
            return { success: true, alreadyRunning: true };
        }

        running = true;
        try {
            const stockReservations = await cleanupExpiredReservations();
            const walletReleases = await releaseWallets();
            return {
                success: true,
                alreadyRunning: false,
                stockReservations,
                walletReleases
            };
        } finally {
            running = false;
        }
    };
}

const runMaintenance = createMaintenanceRunner();

module.exports = { createMaintenanceRunner, runMaintenance };
