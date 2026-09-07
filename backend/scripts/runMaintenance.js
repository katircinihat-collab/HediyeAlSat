require("dotenv").config();

async function main() {
    const baseUrl = String(process.env.MAINTENANCE_BASE_URL || "").replace(/\/$/, "");
    const secret = process.env.MAINTENANCE_CRON_SECRET;
    if (!baseUrl || !secret) {
        throw new Error("MAINTENANCE_BASE_URL ve MAINTENANCE_CRON_SECRET zorunludur.");
    }
    const url = new URL(`${baseUrl}/api/internal/maintenance`);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        throw new Error("Maintenance endpoint production ortamında HTTPS kullanmalıdır.");
    }

    const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(120000)
    });
    if (!response.ok) {
        throw new Error(`Maintenance isteği başarısız (${response.status}).`);
    }
    const result = await response.json();
    console.log("Maintenance tamamlandı.", {
        alreadyRunning: Boolean(result.alreadyRunning),
        reservationsReleased: result.stockReservations?.released || 0,
        payoutsReleased: result.walletReleases?.basarili || 0
    });
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
