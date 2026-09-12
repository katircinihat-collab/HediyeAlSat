const test = require("node:test");
const assert = require("node:assert/strict");
const { maintenanceAuth } = require("../backend/middleware/maintenanceAuth");
const { createMaintenanceRunner } = require("../backend/services/maintenanceService");

function authorize(secret, configuredSecret) {
    const previous = process.env.MAINTENANCE_CRON_SECRET;
    if (configuredSecret === undefined) delete process.env.MAINTENANCE_CRON_SECRET;
    else process.env.MAINTENANCE_CRON_SECRET = configuredSecret;
    let nextCalled = false;
    const response = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
    maintenanceAuth({ headers: { authorization: secret ? `Bearer ${secret}` : "" } }, response, () => { nextCalled = true; });
    if (previous === undefined) delete process.env.MAINTENANCE_CRON_SECRET;
    else process.env.MAINTENANCE_CRON_SECRET = previous;
    return { response, nextCalled };
}

test("maintenance secret yapılandırılmamışsa istek reddedilir", () => {
    const result = authorize("provided", undefined);
    assert.equal(result.response.statusCode, 401);
    assert.equal(result.nextCalled, false);
});

test("yanlış maintenance secret reddedilir", () => {
    const result = authorize("wrong", "correct-secret");
    assert.equal(result.response.statusCode, 401);
    assert.equal(result.nextCalled, false);
});

test("doğru maintenance secret isteği geçirir", () => {
    const result = authorize("correct-secret", "correct-secret");
    assert.equal(result.nextCalled, true);
});

test("maintenance stok cleanup ve wallet release işlemlerini çağırır", async () => {
    let cleanupCalls = 0;
    let releaseCalls = 0;
    const run = createMaintenanceRunner({
        cleanupExpiredReservations: async () => { cleanupCalls += 1; return { released: 2 }; },
        releaseWallets: async () => { releaseCalls += 1; return { basarili: 1 }; },
        syncAdminTasks: async () => ({ activated: 0, resolved: 0, archived: 0 }),
        recordHealth: async () => {}
    });
    const result = await run();
    assert.equal(result.success, true);
    assert.equal(cleanupCalls, 1);
    assert.equal(releaseCalls, 1);
});

test("üst üste maintenance çağrısı aynı proseste ikinci çalışmayı başlatmaz", async () => {
    let resolveCleanup;
    let cleanupCalls = 0;
    let releaseCalls = 0;
    const cleanupPromise = new Promise((resolve) => { resolveCleanup = resolve; });
    const run = createMaintenanceRunner({
        cleanupExpiredReservations: async () => { cleanupCalls += 1; return cleanupPromise; },
        releaseWallets: async () => { releaseCalls += 1; return { basarili: 0 }; },
        syncAdminTasks: async () => ({ activated: 0, resolved: 0, archived: 0 }),
        recordHealth: async () => {}
    });
    const first = run();
    const overlap = await run();
    assert.equal(overlap.alreadyRunning, true);
    assert.equal(cleanupCalls, 1);
    assert.equal(releaseCalls, 0);
    resolveCleanup({ released: 0 });
    await first;
    assert.equal(releaseCalls, 1);
});

test("bir bakım adımı hata verse de diğerleri ve heartbeat çalışır", async () => {
    const calls = [];
    const run = createMaintenanceRunner({
        cleanupExpiredReservations: async () => { calls.push("stock"); throw Object.assign(new Error("sensitive detail"), { code: "STOCK_FAILED" }); },
        releaseWallets: async () => { calls.push("wallet"); return { basarili: 1 }; },
        syncAdminTasks: async () => { calls.push("tasks"); return { activated: 1 }; },
        recordHealth: async (payload) => { calls.push("health"); assert.equal(payload.success, false); }
    });
    const result = await run();
    assert.equal(result.success, false);
    assert.deepEqual(calls, ["stock", "wallet", "tasks", "health"]);
    assert.deepEqual(result.steps[0], { name: "stockReservations", success: false, errorCode: "STOCK_FAILED" });
    assert.equal(JSON.stringify(result).includes("sensitive detail"), false);
});

test("başarılı bakım heartbeat özetini bir kez günceller", async () => {
    let healthCalls = 0;
    const run = createMaintenanceRunner({
        cleanupExpiredReservations: async () => ({ released: 0 }),
        releaseWallets: async () => ({ basarili: 0 }),
        syncAdminTasks: async () => ({ activated: 0, resolved: 0, archived: 0 }),
        recordHealth: async ({ success, summary }) => { healthCalls += 1; assert.equal(success, true); assert.equal(summary.steps.length, 3); }
    });
    const result = await run();
    assert.equal(result.success, true);
    assert.equal(healthCalls, 1);
});
