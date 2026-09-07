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
        releaseWallets: async () => { releaseCalls += 1; return { basarili: 1 }; }
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
        releaseWallets: async () => { releaseCalls += 1; return { basarili: 0 }; }
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
