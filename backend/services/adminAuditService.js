const { firestore, FieldValue } = require("../config/firebase");

function clean(value, max = 300) {
    const text = String(value || "").trim();
    return text ? text.slice(0, max) : null;
}

async function recordAdminAction({ adminUser, action, targetType, targetId, details = {} }) {
    try {
        await firestore.collection("adminAuditLogs").add({
            adminUid: clean(adminUser?.uid, 128),
            adminEmail: clean(adminUser?.email, 320),
            action: clean(action, 100),
            targetType: clean(targetType, 80),
            targetId: clean(targetId, 1500),
            details,
            createdAt: FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Admin audit kaydı oluşturulamadı:", { code: error.code || "ADMIN_AUDIT_FAILED" });
        return false;
    }
}

module.exports = { recordAdminAction };
