const crypto = require("node:crypto");

const TEST_MARKERS = new Set(["test", "sandbox", "development", "dev"]);

function text(value) {
    return String(value || "").trim().toLowerCase();
}

function dateMillis(value) {
    if (!value) return null;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value._seconds === "number") return value._seconds * 1000;
    const result = new Date(value).getTime();
    return Number.isFinite(result) ? result : null;
}

function isExplicitlyMarkedTest(data = {}) {
    if (data.testData === true || data.isTest === true || data.sandbox === true) return true;
    const environment = text(data.environment || data.providerEnvironment || data.iyzicoEnvironment);
    const providerUri = text(data.iyzicoUri || data.providerUri);
    const conversationId = text(data.conversationId || data.id);
    return TEST_MARKERS.has(environment)
        || providerUri.includes("sandbox-api.iyzipay.com")
        || /^(test|sandbox|dev)[_-]/.test(conversationId);
}

function matchesCleanupScope({ id, data }, scope = {}) {
    if (isExplicitlyMarkedTest(data)) return true;
    if (scope.orderIds?.has(id) || scope.paymentIds?.has(data.paymentId) || scope.conversationIds?.has(data.conversationId)) return true;

    if (!scope.before || !scope.sellers?.size) return false;
    const created = dateMillis(data.tarih || data.createdAt || data.olusturmaTarihi || data.odemeTarihi);
    const seller = text(data.satici || data.seller || data.email);
    return created !== null && created < scope.before && scope.sellers.has(seller);
}

function movementWalletEffect(movement = {}) {
    if (text(movement.tip) !== "satış" && text(movement.tip) !== "satis") return { pending: 0, balance: 0 };
    const amount = Math.round(Number(movement.netTutar || 0) * 100) / 100;
    const status = text(movement.durum);
    if (status === "bekliyor") return { pending: amount, balance: 0 };
    if (["kullanılabilir", "kullanilabilir", "tamamlandı", "tamamlandi"].includes(status)) return { pending: 0, balance: amount };
    return { pending: 0, balance: 0 };
}

function planWalletAdjustment(wallet = {}, movements = []) {
    const effect = movements.reduce((sum, movement) => {
        const item = movementWalletEffect(movement);
        return { pending: sum.pending + item.pending, balance: sum.balance + item.balance };
    }, { pending: 0, balance: 0 });
    const current = {
        pending: Math.round(Number(wallet.pending || 0) * 100) / 100,
        balance: Math.round(Number(wallet.balance || 0) * 100) / 100,
        withdrawalPending: Math.round(Number(wallet.withdrawalPending || 0) * 100) / 100,
        paid: Math.round(Number(wallet.paid || 0) * 100) / 100
    };
    const next = {
        ...current,
        pending: Math.round((current.pending - effect.pending) * 100) / 100,
        balance: Math.round((current.balance - effect.balance) * 100) / 100
    };
    const safe = next.pending >= 0 && next.balance >= 0;
    return { current, selectedEffect: effect, next, safe, reason: safe ? null : "Seçili hareketler mevcut wallet tutarını aşıyor." };
}

function planHash(plan) {
    return crypto.createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}

module.exports = { dateMillis, isExplicitlyMarkedTest, matchesCleanupScope, movementWalletEffect, planWalletAdjustment, planHash };
