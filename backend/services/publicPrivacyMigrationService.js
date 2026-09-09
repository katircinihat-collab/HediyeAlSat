const TARGETS = [
    { collection: "ilanlar", emailField: "sahip", uidField: "sahipUid", owner: true },
    { collection: "magazalar", emailField: "sahip", uidField: "sahipUid", owner: true },
    { collection: "yorumlar", emailField: "kullanici", uidField: "kullaniciUid" },
    { collection: "magazaYorumlari", emailField: "kullanici", uidField: "kullaniciUid" },
    { collection: "magazaPuanlari", emailField: "kullanici", uidField: "kullaniciUid" }
];

async function planPublicPrivacyMigration({ firestore, resolveUidByEmail }) {
    const changes = [];
    const unresolved = [];
    for (const target of TARGETS) {
        const snapshot = await firestore.collection(target.collection).get();
        for (const document of snapshot.docs) {
            const data = document.data();
            const email = typeof data[target.emailField] === "string" ? data[target.emailField].trim() : "";
            if (!email) continue;
            let uid = typeof data[target.uidField] === "string" ? data[target.uidField].trim() : "";
            if (!uid && resolveUidByEmail) uid = await resolveUidByEmail(email) || "";
            const item = { collection: target.collection, id: document.id, emailField: target.emailField, uidField: target.uidField, uid: uid || null };
            changes.push(item);
            if (!uid) unresolved.push({ collection: target.collection, id: document.id, reason: "UID_UNRESOLVED" });
        }
    }
    return { scannedCollections: TARGETS.length, changeCount: changes.length, unresolvedCount: unresolved.length, changes, unresolved };
}

async function runPublicPrivacyMigration({ firestore, FieldValue, resolveUidByEmail, dryRun = true }) {
    const plan = await planPublicPrivacyMigration({ firestore, resolveUidByEmail });
    if (dryRun) return { ...plan, dryRun: true, appliedCount: 0 };
    let appliedCount = 0;
    for (const change of plan.changes) {
        const update = { [change.emailField]: FieldValue.delete() };
        if (change.uid) update[change.uidField] = change.uid;
        await firestore.collection(change.collection).doc(change.id).update(update);
        appliedCount += 1;
    }
    return { ...plan, dryRun: false, appliedCount };
}

module.exports = { TARGETS, planPublicPrivacyMigration, runPublicPrivacyMigration };
