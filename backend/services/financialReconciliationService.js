const crypto = require("crypto");

const RECONCILIATION_STATUSES = Object.freeze({
    REVIEWING: "incelemede",
    RESOLVED_MANUALLY: "manuel_cozuldu"
});

class FinancialReconciliationError extends Error {
    constructor(message, status = 400, code = "FINANCIAL_RECONCILIATION_FAILED") {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function clean(value, max = 500) {
    return String(value ?? "").trim().slice(0, max);
}

function finiteMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Number(number.toFixed(2)) : null;
}

function reconciliationId({ type, sourceCollection, sourceId, reasonCode }) {
    const identity = [type, sourceCollection, sourceId, reasonCode].map((value) => clean(value, 200)).join("|");
    return crypto.createHash("sha256").update(identity).digest("hex").slice(0, 40);
}

function reconciliationData(event, timestamp) {
    const data = {
        type: clean(event.type, 80) || "financial_manual_review",
        status: RECONCILIATION_STATUSES.REVIEWING,
        reasonCode: clean(event.reasonCode, 120) || "MANUAL_REVIEW_REQUIRED",
        reason: clean(event.reason, 1000) || "Finansal işlem manuel inceleme gerektiriyor.",
        orderId: clean(event.orderId, 200) || null,
        claimId: clean(event.claimId, 200) || null,
        paymentId: clean(event.paymentId, 200) || null,
        paymentTransactionId: clean(event.paymentTransactionId, 200) || null,
        seller: clean(event.seller, 320) || null,
        buyer: clean(event.buyer, 320) || null,
        grossAmount: finiteMoney(event.grossAmount),
        commissionAmount: finiteMoney(event.commissionAmount),
        sellerNetAmount: finiteMoney(event.sellerNetAmount),
        providerStatus: clean(event.providerStatus, 120) || null,
        sourceCollection: clean(event.sourceCollection, 120),
        sourceId: clean(event.sourceId, 200),
        currentNote: "",
        createdAt: timestamp,
        updatedAt: timestamp,
        lastSeenAt: timestamp,
        occurrenceCount: 1
    };
    if (!data.sourceCollection || !data.sourceId) {
        throw new FinancialReconciliationError("Mutabakat kaynağı belirtilmelidir.", 400, "RECONCILIATION_SOURCE_REQUIRED");
    }
    return data;
}

async function recordFinancialReconciliation({ firestore, event, now = () => new Date() }) {
    const id = reconciliationId(event);
    const ref = firestore.collection("financialReconciliations").doc(id);
    return firestore.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        const timestamp = now();
        if (snapshot.exists) {
            tx.update(ref, { lastSeenAt: timestamp, updatedAt: timestamp, occurrenceCount: Number(snapshot.data().occurrenceCount || 1) + 1 });
            return { id, created: false };
        }
        tx.create(ref, reconciliationData(event, timestamp));
        return { id, created: true };
    });
}

async function listFinancialReconciliations({ firestore, filters = {} }) {
    const snapshot = await firestore.collection("financialReconciliations").limit(300).get();
    const wanted = {
        status: clean(filters.status, 40), type: clean(filters.type, 80),
        orderId: clean(filters.orderId, 200), seller: clean(filters.seller, 320).toLocaleLowerCase("tr-TR"),
        paymentId: clean(filters.paymentId, 200)
    };
    const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((row) =>
        (!wanted.status || row.status === wanted.status)
        && (!wanted.type || row.type === wanted.type)
        && (!wanted.orderId || row.orderId === wanted.orderId)
        && (!wanted.paymentId || row.paymentId === wanted.paymentId)
        && (!wanted.seller || clean(row.seller, 320).toLocaleLowerCase("tr-TR").includes(wanted.seller))
    );
    return rows.sort((a, b) => {
        const time = (value) => value?.toMillis?.() ?? value?.toDate?.().getTime?.() ?? new Date(value || 0).getTime();
        return time(b.updatedAt) - time(a.updatedAt);
    });
}

async function getFinancialReconciliation({ firestore, id }) {
    const ref = firestore.collection("financialReconciliations").doc(clean(id, 200));
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new FinancialReconciliationError("Finansal inceleme kaydı bulunamadı.", 404, "RECONCILIATION_NOT_FOUND");
    const auditSnapshot = await firestore.collection("financialReconciliationAudits").where("reconciliationId", "==", ref.id).get();
    const audit = auditSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
        const time = (value) => value?.toMillis?.() ?? value?.toDate?.().getTime?.() ?? new Date(value || 0).getTime();
        return time(b.timestamp) - time(a.timestamp);
    });
    return { id: snapshot.id, ...snapshot.data(), audit };
}

async function updateFinancialReconciliation({ firestore, id, body = {}, admin, now = () => new Date() }) {
    const allowedKeys = new Set(["status", "note"]);
    if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
        throw new FinancialReconciliationError("Yalnız durum ve not güncellenebilir.", 400, "RECONCILIATION_FIELDS_FORBIDDEN");
    }
    const status = clean(body.status, 40);
    const note = clean(body.note, 2000);
    if (!Object.values(RECONCILIATION_STATUSES).includes(status)) {
        throw new FinancialReconciliationError("Geçersiz finansal inceleme durumu.", 400, "RECONCILIATION_STATUS_INVALID");
    }
    if (!admin?.uid && !admin?.email) throw new FinancialReconciliationError("Admin kimliği doğrulanamadı.", 403, "ADMIN_REQUIRED");
    const ref = firestore.collection("financialReconciliations").doc(clean(id, 200));
    return firestore.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) throw new FinancialReconciliationError("Finansal inceleme kaydı bulunamadı.", 404, "RECONCILIATION_NOT_FOUND");
        const previous = snapshot.data();
        const timestamp = now();
        const auditRef = firestore.collection("financialReconciliationAudits").doc();
        tx.update(ref, {
            status, currentNote: note, updatedAt: timestamp,
            ...(status === RECONCILIATION_STATUSES.RESOLVED_MANUALLY
                ? { resolvedAt: timestamp, resolvedBy: admin.uid || admin.email }
                : { resolvedAt: null, resolvedBy: null })
        });
        tx.create(auditRef, {
            reconciliationId: ref.id, adminUid: admin.uid || null, adminEmail: clean(admin.email, 320) || null,
            previousStatus: previous.status || null, newStatus: status,
            previousNote: previous.currentNote || "", newNote: note, timestamp
        });
        return { id: ref.id, status, note, auditId: auditRef.id };
    });
}

module.exports = {
    RECONCILIATION_STATUSES, FinancialReconciliationError, reconciliationId,
    recordFinancialReconciliation, listFinancialReconciliations,
    getFinancialReconciliation, updateFinancialReconciliation
};
