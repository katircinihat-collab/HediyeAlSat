const { admin, firestore } = require("../config/firebase");
const { recordAdminAction } = require("../services/adminAuditService");

const MAX_USERS = 50;

async function count(query) {
    const snapshot = await query.count().get();
    return snapshot.data().count;
}

exports.overview = async (_req, res, next) => {
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayTimestamp = admin.firestore.Timestamp.fromDate(today);
        const [tasksResult, claimsResult, ordersResult, maintenanceResult] = await Promise.allSettled([
            firestore.collection("adminOperationTasks").where("status", "==", "ACTIVE").limit(400).get(),
            count(firestore.collection("orderClaims").where("durum", "in", ["acik", "inceleniyor", "kabul_edildi"])),
            firestore.collection("siparisler").where("tarih", ">=", todayTimestamp)
                .select("odemeDurumu", "toplam", "genelToplam", "durum", "teslimatDogrulandi").limit(1000).get(),
            firestore.collection("systemMaintenance").doc("latest").get()
        ]);

        const activeTaskSnapshot = tasksResult.status === "fulfilled" ? tasksResult.value : null;
        const openClaims = claimsResult.status === "fulfilled" ? claimsResult.value : 0;
        const todaySnapshot = ordersResult.status === "fulfilled" ? ordersResult.value : null;
        const maintenanceDoc = maintenanceResult.status === "fulfilled" ? maintenanceResult.value : null;
        const degraded = [tasksResult, claimsResult, ordersResult, maintenanceResult].some((result) => result.status === "rejected");
        const paidToday = todaySnapshot?.docs.filter((doc) => doc.get("odemeDurumu") === true) || [];
        const todayOrders = paidToday.length;
        const todaySalesAmount = paidToday.reduce((total, doc) => total + Number(doc.get("toplam") ?? doc.get("genelToplam") ?? 0), 0);
        const deliveredOrders = paidToday.filter((doc) => doc.get("teslimatDogrulandi") === true || doc.get("durum") === "Teslim Edildi").length;

        const maintenance = maintenanceDoc?.exists ? maintenanceDoc.data() : null;
        const lastRun = maintenance?.completedAt?.toDate?.() || null;
        const schedulerHealthy = Boolean(maintenance?.success && lastRun && Date.now() - lastRun.getTime() < 2 * 60 * 60 * 1000);
        const activeTasks = activeTaskSnapshot?.size || 0;
        const activeTaskTypes = new Set(activeTaskSnapshot?.docs.map((doc) => doc.get("sourceType")) || []);
        const health = {
            payment: activeTaskTypes.has("payment") || activeTaskTypes.has("reconciliation") ? "WARNING" : "HEALTHY",
            orderFlow: activeTaskTypes.has("order") || activeTaskTypes.has("claim") ? "WARNING" : "HEALTHY",
            earnings48h: maintenance?.success === false ? "CRITICAL" : schedulerHealthy ? "HEALTHY" : "WARNING",
            marketplaceSettlement: activeTaskTypes.has("marketplace_settlement") ? "CRITICAL" : "HEALTHY",
            scheduledMaintenance: schedulerHealthy ? "HEALTHY" : "WARNING",
            backendErrors: maintenance?.success === false ? "CRITICAL" : degraded ? "WARNING" : "HEALTHY",
            lastMaintenanceAt: maintenance?.completedAt || null
        };
        return res.json({
            success: true,
            overall: { status: activeTasks === 0 ? "HEALTHY" : "ATTENTION", actionRequiredCount: activeTasks },
            health,
            today: { orders: todayOrders, salesAmount: Number(todaySalesAmount.toFixed(2)), deliveredOrders },
            metrics: { openClaims, actionRequiredCount: activeTasks },
            degraded
        });
    } catch (error) {
        next(error);
    }
};

exports.listUsers = async (req, res, next) => {
    try {
        const pageToken = typeof req.query.pageToken === "string" ? req.query.pageToken : undefined;
        const result = await admin.auth().listUsers(MAX_USERS, pageToken);
        const users = result.users.map((user) => ({
            uid: user.uid,
            email: user.email || null,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            emailVerified: user.emailVerified,
            disabled: user.disabled,
            providers: user.providerData.map((provider) => provider.providerId),
            createdAt: user.metadata.creationTime || null,
            lastSignInAt: user.metadata.lastSignInTime || null
        }));
        return res.json({ success: true, users, nextPageToken: result.pageToken || null });
    } catch (error) {
        next(error);
    }
};

exports.updateUserStatus = async (req, res, next) => {
    try {
        const uid = String(req.params.uid || "").trim();
        const { disabled } = req.body;
        if (!uid || typeof disabled !== "boolean") {
            return res.status(400).json({ success: false, message: "Geçersiz kullanıcı durumu." });
        }
        if (uid === req.user.uid) {
            return res.status(409).json({ success: false, message: "Kendi admin hesabınızı pasifleştiremezsiniz." });
        }
        const targetUser = await admin.auth().getUser(uid);
        if (targetUser.email) {
            const targetAdmin = await firestore.collection("admins").doc(targetUser.email).get();
            if (targetAdmin.exists) {
                return res.status(409).json({ success: false, message: "Admin hesap durumu bu ekrandan değiştirilemez." });
            }
        }
        await admin.auth().updateUser(uid, { disabled });
        if (disabled) await admin.auth().revokeRefreshTokens(uid);
        await recordAdminAction({
            adminUser: req.user,
            action: disabled ? "USER_DISABLED" : "USER_ENABLED",
            targetType: "user",
            targetId: uid
        });
        return res.json({ success: true, uid, disabled });
    } catch (error) {
        next(error);
    }
};

exports.auditLogs = async (_req, res, next) => {
    try {
        const snapshot = await firestore.collection("adminAuditLogs")
            .orderBy("createdAt", "desc").limit(50).get();
        return res.json({
            success: true,
            logs: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        });
    } catch (error) {
        next(error);
    }
};
