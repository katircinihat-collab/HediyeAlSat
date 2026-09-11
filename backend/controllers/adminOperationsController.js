const { admin, firestore } = require("../config/firebase");
const { isListingPublished } = require("../utils/listingAvailability");
const { recordAdminAction } = require("../services/adminAuditService");

const MAX_USERS = 50;

async function count(query) {
    const snapshot = await query.count().get();
    return snapshot.data().count;
}

async function sum(query, field) {
    const snapshot = await query.aggregate({
        total: admin.firestore.AggregateField.sum(field)
    }).get();
    return Number(snapshot.data().total || 0);
}

exports.overview = async (_req, res, next) => {
    try {
        const [listingSnapshot, totalUsers, totalOrders, paidOrders, totalStores,
            openClaims, pendingSponsors, activeBoosts, waitingPayments,
            reconciliationCount, salesVolume, commissionRevenue,
            platformServiceRevenue, pendingSellerAmount] = await Promise.all([
            firestore.collection("ilanlar").select("onay", "aktif", "yayinda", "durum", "stok", "adet", "urunTipi", "fizikselKargo", "dijitalTeslimat").get(),
            count(firestore.collection("users")),
            count(firestore.collection("siparisler")),
            count(firestore.collection("siparisler").where("odemeDurumu", "==", true)),
            count(firestore.collection("magazalar")),
            count(firestore.collection("orderClaims").where("durum", "in", ["acik", "inceleniyor", "kabul_edildi"])),
            count(firestore.collection("sponsorBasvurular").where("status", "==", "REVIEW_PENDING")),
            count(firestore.collection("listingPromotions").where("endAt", ">", admin.firestore.Timestamp.now())),
            count(firestore.collection("odemeler").where("paymentStatus", "==", "WAITING")),
            count(firestore.collection("financialReconciliations").where("status", "==", "incelemede")),
            sum(firestore.collection("siparisler").where("odemeDurumu", "==", true), "toplam"),
            sum(firestore.collection("bakiyeHareketleri"), "komisyon"),
            sum(firestore.collection("platformRevenueEvents"), "amount"),
            sum(firestore.collection("wallets"), "pending")
        ]);

        const listings = listingSnapshot.docs.map((doc) => doc.data());
        const activeListings = listings.filter(isListingPublished).length;
        const pendingListings = listings.filter((item) => item.onay !== true && !["Reddedildi", "Taslak"].includes(item.durum)).length;

        return res.json({
            success: true,
            metrics: {
                totalUsers, totalOrders, paidOrders, totalStores,
                activeListings, pendingListings, openClaims, pendingSponsors,
                activeBoosts, waitingPayments, reconciliationCount,
                actionRequiredCount: waitingPayments + openClaims + reconciliationCount,
                salesVolume, commissionRevenue, platformServiceRevenue,
                pendingSellerAmount
            }
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
