const crypto = require("crypto");

function safeEqual(left, right) {
    const leftBuffer = Buffer.from(String(left || ""));
    const rightBuffer = Buffer.from(String(right || ""));
    return leftBuffer.length === rightBuffer.length
        && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function maintenanceAuth(req, res, next) {
    const configuredSecret = process.env.MAINTENANCE_CRON_SECRET;
    const authorization = String(req.headers.authorization || "");
    const providedSecret = authorization.startsWith("Bearer ")
        ? authorization.slice(7).trim()
        : "";

    if (!configuredSecret || !providedSecret || !safeEqual(configuredSecret, providedSecret)) {
        return res.status(401).json({
            success: false,
            code: "MAINTENANCE_UNAUTHORIZED",
            message: "Bakım isteği yetkilendirilemedi."
        });
    }

    return next();
}

module.exports = { maintenanceAuth, safeEqual };
