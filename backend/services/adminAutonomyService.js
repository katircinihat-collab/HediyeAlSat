const crypto = require("crypto");
const { actionReasons } = require("./orderLifecycleService");

const TASK_STATUS = Object.freeze({ ACTIVE: "ACTIVE", RESOLVED: "RESOLVED", ARCHIVED: "ARCHIVED" });
const OPEN_CLAIMS = new Set(["acik", "inceleniyor", "kabul_edildi"]);
const ARCHIVE_AFTER_MS = 24 * 60 * 60 * 1000;
const SCAN_LIMIT = 250;
const WAITING_PAYMENT_GRACE_MS = 30 * 60 * 1000;

function asDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value.toDate === "function") return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function taskId(sourceKey, reason) {
    return crypto.createHash("sha256").update(`${sourceKey}|${reason}`).digest("hex").slice(0, 40);
}

function issue(sourceType, sourceId, reason, title, data = {}) {
    const sourceKey = `${sourceType}:${sourceId}`;
    return { id: taskId(sourceKey, reason), sourceKey, sourceType, sourceId, reason, title, ...data };
}

async function collectOperationalIssues({ firestore, now = new Date() }) {
    const [payments, claims, reconciliations, orders] = await Promise.all([
        firestore.collection("odemeler").limit(SCAN_LIMIT).get(),
        firestore.collection("orderClaims").limit(SCAN_LIMIT).get(),
        firestore.collection("financialReconciliations").limit(SCAN_LIMIT).get(),
        firestore.collection("siparisler").orderBy("tarih", "desc").limit(SCAN_LIMIT).get()
    ]);
    const issues = [];
    const checkedSourceKeys = new Set();
    payments.forEach((doc) => {
        const key = `payment:${doc.id}`; checkedSourceKeys.add(key);
        const data = doc.data();
        const paymentCreatedAt = asDate(data.createdAt || data.tarih);
        const waitingIsStale = paymentCreatedAt && now.getTime() - paymentCreatedAt.getTime() >= WAITING_PAYMENT_GRACE_MS;
        if (data.paymentStatus === "WAITING" && waitingIsStale) issues.push(issue("payment", doc.id, "WAITING_PAYMENT", "Ödeme sonucu bekleniyor", { createdAt: data.createdAt || data.tarih || null }));
        if (["MANUAL_REVIEW", "FAILED_FINALIZATION", "AMOUNT_MISMATCH"].includes(data.paymentStatus) || data.finalizationStatus === "FAILED") {
            issues.push(issue("payment", doc.id, "PAYMENT_FINALIZATION", "Ödeme/finalizasyon incelemesi gerekli", { createdAt: data.updatedAt || data.createdAt || null }));
        }
    });
    claims.forEach((doc) => {
        const key = `claim:${doc.id}`; checkedSourceKeys.add(key);
        const data = doc.data();
        if (OPEN_CLAIMS.has(data.durum)) issues.push(issue("claim", doc.id, "OPEN_CLAIM_OR_DISPUTE", "Açık iade veya itiraz", { orderId: data.orderId || null, createdAt: data.createdAt || null }));
    });
    reconciliations.forEach((doc) => {
        const key = `reconciliation:${doc.id}`; checkedSourceKeys.add(key);
        const data = doc.data();
        if (data.status === "incelemede") issues.push(issue("reconciliation", doc.id, data.reasonCode || "RECONCILIATION", "Finansal mutabakat gerekli", { orderId: data.orderId || null, createdAt: data.createdAt || null }));
    });
    orders.forEach((doc) => {
        const key = `order:${doc.id}`; checkedSourceKeys.add(key);
        actionReasons(doc.data(), now).forEach((reason) => issues.push(issue("order", doc.id, reason, "Sipariş yaşam döngüsü anomalisi", { orderId: doc.id, createdAt: doc.get("tarih") || null })));
    });
    return { issues, checkedSourceKeys, scanned: { payments: payments.size, claims: claims.size, reconciliations: reconciliations.size, orders: orders.size } };
}

async function syncOperationalTasks({ firestore, FieldValue, now = new Date() }) {
    const collected = await collectOperationalIssues({ firestore, now });
    const activeSnapshot = await firestore.collection("adminOperationTasks").where("status", "==", TASK_STATUS.ACTIVE).limit(400).get();
    const resolvedSnapshot = await firestore.collection("adminOperationTasks").where("status", "==", TASK_STATUS.RESOLVED).limit(400).get();
    const activeIds = new Set(collected.issues.map((item) => item.id));
    const timestamp = FieldValue?.serverTimestamp ? FieldValue.serverTimestamp() : now;
    let activated = 0; let resolved = 0; let archived = 0;
    const writes = [];

    collected.issues.forEach((item) => {
        writes.push({ ref: firestore.collection("adminOperationTasks").doc(item.id), data: {
            ...item, status: TASK_STATUS.ACTIVE, lastSeenAt: timestamp, updatedAt: timestamp,
            resolvedAt: null, archivedAt: null, autoManaged: true
        } });
        activated += 1;
    });
    activeSnapshot.forEach((doc) => {
        const data = doc.data();
        if (!activeIds.has(doc.id) && collected.checkedSourceKeys.has(data.sourceKey)) {
            writes.push({ ref: doc.ref, data: { status: TASK_STATUS.RESOLVED, resolvedAt: timestamp, updatedAt: timestamp } });
            resolved += 1;
        }
    });
    resolvedSnapshot.forEach((doc) => {
        const data = doc.data();
        const resolvedAt = data.resolvedAt?.toDate?.() || (data.resolvedAt ? new Date(data.resolvedAt) : null);
        if (resolvedAt && now.getTime() - resolvedAt.getTime() >= ARCHIVE_AFTER_MS) {
            writes.push({ ref: doc.ref, data: { status: TASK_STATUS.ARCHIVED, archivedAt: timestamp, updatedAt: timestamp } });
            archived += 1;
        }
    });
    for (let offset = 0; offset < writes.length; offset += 400) {
        const batch = firestore.batch();
        writes.slice(offset, offset + 400).forEach((write) => batch.set(write.ref, write.data, { merge: true }));
        await batch.commit();
    }
    return { activated, resolved, archived, ...collected.scanned };
}

async function writeMaintenanceHealth({ firestore, FieldValue, success, startedAt, summary = {}, errorCode = null }) {
    const timestamp = FieldValue?.serverTimestamp ? FieldValue.serverTimestamp() : new Date();
    await firestore.collection("systemMaintenance").doc("latest").set({
        status: success ? "HEALTHY" : "CRITICAL", success, startedAt,
        completedAt: timestamp, updatedAt: timestamp, summary,
        errorCode: errorCode || null
    }, { merge: true });
}

module.exports = { TASK_STATUS, ARCHIVE_AFTER_MS, WAITING_PAYMENT_GRACE_MS, taskId, collectOperationalIssues, syncOperationalTasks, writeMaintenanceHealth };
