require("dotenv").config();
const { admin, firestore, FieldValue } = require("../config/firebase");
const { matchesCleanupScope, planWalletAdjustment, planHash } = require("../services/testDataCleanupService");
const { syncUserLevel } = require("../services/userLevelService");

function option(name) {
    const prefix = `--${name}=`;
    return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || "";
}

function csvSet(value, normalize = false) {
    return new Set(String(value || "").split(",").map((item) => normalize ? item.trim().toLowerCase() : item.trim()).filter(Boolean));
}

async function readCollection(name) {
    const snapshot = await firestore.collection(name).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ref: doc.ref, data: doc.data() }));
}

function related(doc, links) {
    const data = doc.data;
    return links.orderIds.has(data.orderId || data.siparisId)
        || links.paymentIds.has(data.paymentId)
        || links.conversationIds.has(data.conversationId)
        || links.claimIds.has(data.claimId)
        || links.withdrawalIds.has(data.withdrawalId)
        || (Array.isArray(data.siparisIds) && data.siparisIds.some((id) => links.orderIds.has(id)));
}

async function main() {
    const apply = process.argv.includes("--apply");
    const beforeText = option("before");
    const before = beforeText ? new Date(beforeText).getTime() : null;
    if (beforeText && !Number.isFinite(before)) throw new Error("--before geçerli ISO tarih olmalıdır.");

    const scope = {
        before,
        sellers: csvSet(option("sellers"), true),
        orderIds: csvSet(option("order-ids")),
        paymentIds: csvSet(option("payment-ids")),
        conversationIds: csvSet(option("conversation-ids"))
    };
    if (apply && option("confirm") !== "DELETE_TEST_DATA") throw new Error("Apply için --confirm=DELETE_TEST_DATA zorunludur.");
    if (apply && !before && !scope.orderIds.size && !scope.paymentIds.size && !scope.conversationIds.size) {
        throw new Error("Apply yalnız açık --before veya ID allowlist ile kullanılabilir.");
    }
    if (before && !scope.sellers.size && !scope.orderIds.size) throw new Error("--before kullanırken --sellers veya --order-ids zorunludur.");

    const names = [
        "siparisler", "odemeler", "bakiyeHareketleri", "paymentFinalizations",
        "stockReservations", "orderClaims", "refundFinalizations", "financialReconciliations",
        "userPointEvents", "paraCekmeTalepleri", "withdrawalFinalizations"
    ];
    const collections = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await readCollection(name)])));

    const selectedOrders = collections.siparisler.filter((doc) => matchesCleanupScope(doc, scope));
    const links = {
        orderIds: new Set(selectedOrders.map((doc) => doc.id)),
        paymentIds: new Set(selectedOrders.map((doc) => doc.data.paymentId).filter(Boolean)),
        conversationIds: new Set(selectedOrders.map((doc) => doc.data.conversationId).filter(Boolean)),
        claimIds: new Set(), withdrawalIds: new Set()
    };
    const selectedPayments = collections.odemeler.filter((doc) => matchesCleanupScope(doc, scope) || related(doc, links));
    selectedPayments.forEach((doc) => { if (doc.data.paymentId) links.paymentIds.add(doc.data.paymentId); links.conversationIds.add(doc.id); });
    const selectedClaims = collections.orderClaims.filter((doc) => related(doc, links));
    selectedClaims.forEach((doc) => links.claimIds.add(doc.id));

    const selected = {
        siparisler: selectedOrders,
        odemeler: selectedPayments,
        bakiyeHareketleri: collections.bakiyeHareketleri.filter((doc) => related(doc, links)),
        paymentFinalizations: collections.paymentFinalizations.filter((doc) => links.paymentIds.has(doc.id) || related(doc, links)),
        stockReservations: collections.stockReservations.filter((doc) => related(doc, links)),
        orderClaims: selectedClaims,
        refundFinalizations: collections.refundFinalizations.filter((doc) => links.claimIds.has(doc.id) || related(doc, links)),
        financialReconciliations: collections.financialReconciliations.filter((doc) => related(doc, links)),
        userPointEvents: collections.userPointEvents.filter((doc) => links.orderIds.has(doc.data.referenceId) || [...links.orderIds].some((id) => doc.id.includes(id))),
        paraCekmeTalepleri: [],
        withdrawalFinalizations: []
    };

    const movementsBySeller = new Map();
    selected.bakiyeHareketleri.forEach((doc) => {
        const seller = String(doc.data.satici || "").toLowerCase();
        if (!seller) return;
        movementsBySeller.set(seller, [...(movementsBySeller.get(seller) || []), doc.data]);
    });
    const walletPlans = [];
    for (const [seller, movements] of movementsBySeller) {
        const walletRef = firestore.collection("wallets").doc(seller);
        const walletSnap = await walletRef.get();
        if (!walletSnap.exists) continue;
        walletPlans.push({ seller, ref: walletRef, ...planWalletAdjustment(walletSnap.data(), movements) });
    }
    const affectedLevelUids = [...new Set(selected.userPointEvents.map((doc) => doc.data.userUid).filter(Boolean))];

    const planBasis = {
        selection: { before: beforeText || null, sellers: [...scope.sellers], explicitOrderIds: [...scope.orderIds], markerOnly: !before && !scope.orderIds.size && !scope.paymentIds.size && !scope.conversationIds.size },
        counts: Object.fromEntries(Object.entries(selected).map(([name, docs]) => [name, docs.length])),
        orderGrossTotal: selectedOrders.reduce((sum, doc) => sum + Number(doc.data.toplam || 0), 0),
        walletPlans: walletPlans.map(({ ref: _ref, ...item }) => item),
        affectedLevelUids
    };
    const report = { mode: apply ? "apply" : "dry-run", ...planBasis, planHash: planHash(planBasis) };
    console.log(JSON.stringify(report, null, 2));

    if (!apply) return;
    if (walletPlans.some((item) => !item.safe)) throw new Error("Wallet planı güvenli değil; hiçbir değişiklik uygulanmadı.");

    const auditRef = firestore.collection("testDataCleanupRuns").doc(report.planHash);
    const existing = await auditRef.get();
    if (existing.exists) throw new Error("Bu temizlik planı daha önce uygulanmış.");

    const batch = firestore.batch();
    let operations = 1;
    batch.set(auditRef, { status: "APPLYING", planHash: report.planHash, counts: report.counts, createdAt: FieldValue.serverTimestamp() });
    for (const docs of Object.values(selected)) for (const doc of docs) { batch.delete(doc.ref); operations += 1; }
    for (const item of walletPlans) {
        batch.set(item.ref, { pending: item.next.pending, balance: item.next.balance, guncellenmeTarihi: FieldValue.serverTimestamp() }, { merge: true });
        operations += 1;
    }
    if (operations > 450) throw new Error("Plan 450 işlem sınırını aşıyor; parçalı ve denetimli temizlik gerekir.");
    await batch.commit();
    try {
        for (const uid of affectedLevelUids) {
            const user = await admin.auth().getUser(uid);
            if (user.email) await syncUserLevel({ firestore, uid, email: user.email });
        }
        await auditRef.set({ status: "COMPLETED", completedAt: FieldValue.serverTimestamp() }, { merge: true });
    } catch (error) {
        await auditRef.set({ status: "RECONCILIATION_REQUIRED", levelRebuildError: String(error.message || "Level rebuild failed").slice(0, 300), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        throw error;
    }
    console.log(JSON.stringify({ applied: true, planHash: report.planHash, operations, rebuiltLevelUsers: affectedLevelUids.length }, null, 2));
}

main().catch((error) => {
    console.error("Test verisi temizleme hazırlanamadı:", error.message);
    process.exitCode = 1;
});
