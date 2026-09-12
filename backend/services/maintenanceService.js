const { firestore, FieldValue } = require("../config/firebase");
const walletReleaseService = require("./walletReleaseService");
const { releaseExpiredReservations } = require("./stockReservationService");
const { syncOperationalTasks, writeMaintenanceHealth } = require("./adminAutonomyService");

function createMaintenanceRunner(dependencies = {}) {
    const cleanupExpiredReservations = dependencies.cleanupExpiredReservations
        || (() => releaseExpiredReservations({ firestore, FieldValue }));
    const releaseWallets = dependencies.releaseWallets
        || (() => walletReleaseService.blokajiDolanlariAktar());
    const syncAdminTasks = dependencies.syncAdminTasks
        || (() => syncOperationalTasks({ firestore, FieldValue }));
    const recordHealth = dependencies.recordHealth
        || ((payload) => writeMaintenanceHealth({ firestore, FieldValue, ...payload }));
    let running = false;

    async function runStep(name, task) {
        try {
            return { name, success: true, result: await task() };
        } catch (error) {
            return { name, success: false, errorCode: String(error?.code || `${name.toUpperCase()}_FAILED`).slice(0, 100) };
        }
    }

    return async function runMaintenance() {
        if (running) {
            return { success: true, alreadyRunning: true };
        }

        running = true;
        const startedAt = new Date();
        try {
            const steps = [];
            steps.push(await runStep("stockReservations", cleanupExpiredReservations));
            steps.push(await runStep("walletReleases", releaseWallets));
            steps.push(await runStep("adminTasks", syncAdminTasks));
            const byName = Object.fromEntries(steps.map((step) => [step.name, step]));
            const success = steps.every((step) => step.success);
            const result = {
                success,
                alreadyRunning: false,
                stockReservations: byName.stockReservations.result || null,
                walletReleases: byName.walletReleases.result || null,
                adminTasks: byName.adminTasks.result || null,
                steps: steps.map(({ name, success: stepSuccess, errorCode = null }) => ({ name, success: stepSuccess, errorCode }))
            };
            const healthStep = await runStep("healthHeartbeat", () => recordHealth({ success, startedAt, summary: result, errorCode: success ? null : "MAINTENANCE_PARTIAL_FAILURE" }));
            result.steps.push({ name: healthStep.name, success: healthStep.success, errorCode: healthStep.errorCode || null });
            if (!healthStep.success) result.success = false;
            return result;
        } finally {
            running = false;
        }
    };
}

const runMaintenance = createMaintenanceRunner();

module.exports = { createMaintenanceRunner, runMaintenance };
