const { runMaintenance } = require("../services/maintenanceService");

async function run(_req, res) {
    try {
        const result = await runMaintenance();
        return res.status(result.alreadyRunning ? 202 : 200).json(result);
    } catch {
        return res.status(500).json({
            success: false,
            code: "MAINTENANCE_FAILED",
            message: "Bakım işlemi tamamlanamadı."
        });
    }
}

module.exports = { run };
