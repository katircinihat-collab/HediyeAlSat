const levels = require("../../shared/userLevels.json");
const { FieldValue } = require("../config/firebase");
const { normalizeOrderStatus, ORDER_STATUSES } = require("../constants/orderStatuses");

function levelForPoints(points) {
    const safePoints = Math.max(0, Number(points) || 0);
    return [...levels].reverse().find((item) => safePoints >= item.minPoints) || levels[0];
}

function orderCountsForPoints(order) {
    const status = normalizeOrderStatus(order?.durum);
    return order?.odemeDurumu === true
        && status === ORDER_STATUSES.TESLIM_EDILDI
        && order?.teslimatDogrulandi === true
        && order?.refundCompleted !== true
        && order?.refundProviderStatus !== "success"
        && order?.hakEdisBlokeli !== true;
}

function publicSummary(summary = {}) {
    const level = levelForPoints(summary.points);
    return {
        level: level.level,
        title: level.title,
        icon: level.icon,
        points: Math.max(0, Number(summary.points) || 0),
        verifiedSeller: summary.verifiedSeller === true,
        team: summary.team === true,
        completedSales: Math.max(0, Number(summary.completedSales) || 0)
    };
}

function buildPointEvents({ uid, profileComplete, purchases = [], sales = [], reviews = [] }) {
    const events = [];
    if (profileComplete) events.push({ id: `profile_${uid}`, reason: "PROFILE_COMPLETED", points: 5, referenceId: uid });
    purchases.forEach((doc) => events.push({ id: `purchase_${doc.id}`, reason: "COMPLETED_PURCHASE", points: 10, referenceId: doc.id }));
    sales.forEach((doc) => events.push({ id: `sale_${doc.id}_${uid}`, reason: "COMPLETED_SALE", points: 15, referenceId: doc.id }));
    if (sales.length) events.push({ id: `first_sale_${uid}`, reason: "FIRST_COMPLETED_SALE", points: 10, referenceId: sales[0].id });
    reviews.forEach((doc) => events.push({ id: `review_${doc.id}`, reason: "VERIFIED_REVIEW", points: 3, referenceId: doc.id }));
    return events;
}

async function syncUserLevel({ firestore, uid, email }) {
    if (!uid || !email) throw new Error("Kullanıcı kimliği eksik.");
    const [profileSnap, purchasesSnap, salesSnap, reviewsSnap, storesSnap, adminSnap] = await Promise.all([
        firestore.collection("profiller").doc(uid).get(),
        firestore.collection("siparisler").where("alici", "==", email).get(),
        firestore.collection("siparisler").where("satici", "==", email).get(),
        firestore.collection("yorumlar").where("kullaniciUid", "==", uid).get(),
        firestore.collection("magazalar").where("sahipUid", "==", uid).get(),
        firestore.collection("admins").doc(email).get()
    ]);

    const profile = profileSnap.exists ? profileSnap.data() : {};
    const profileComplete = [profile.ad, profile.telefon, profile.sehir, profile.hakkinda]
        .every((value) => String(value || "").trim());
    const purchases = purchasesSnap.docs.filter((doc) => orderCountsForPoints(doc.data()));
    const sales = salesSnap.docs.filter((doc) => orderCountsForPoints(doc.data()));
    const purchasedListings = new Set(purchases.map((doc) => doc.data().ilanId).filter(Boolean));
    const verifiedReviews = reviewsSnap.docs.filter((doc) => purchasedListings.has(doc.data().ilanId));

    const events = buildPointEvents({ uid, profileComplete, purchases, sales, reviews: verifiedReviews });

    const points = events.reduce((sum, event) => sum + event.points, 0);
    const level = levelForPoints(points);
    const summary = {
        uid, points, level: level.level, title: level.title, icon: level.icon,
        completedPurchases: purchases.length, completedSales: sales.length,
        verifiedSeller: !storesSnap.empty,
        team: adminSnap.exists && adminSnap.data().aktif !== false,
        updatedAt: FieldValue.serverTimestamp()
    };

    const previousEvents = await firestore.collection("userPointEvents").where("userUid", "==", uid).get();
    const previousIds = new Set(previousEvents.docs.map((doc) => doc.id));
    const activeIds = new Set(events.map((event) => event.id));
    const batch = firestore.batch();
    previousEvents.docs.forEach((doc) => {
        if (!activeIds.has(doc.id)) batch.set(doc.ref, { active: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
    events.forEach((event) => batch.set(firestore.collection("userPointEvents").doc(event.id), {
        ...event, userUid: uid, active: true, updatedAt: FieldValue.serverTimestamp(),
        ...(!previousIds.has(event.id) ? { createdAt: FieldValue.serverTimestamp() } : {})
    }, { merge: true }));
    batch.set(firestore.collection("userLevelSummaries").doc(uid), summary, { merge: true });
    await batch.commit();
    return { ...publicSummary(summary), completedPurchases: purchases.length };
}

async function getPublicSummaries(firestore, uids) {
    const unique = [...new Set((uids || []).filter((uid) => typeof uid === "string" && uid).slice(0, 50))];
    const snapshots = await Promise.all(unique.map((uid) => firestore.collection("userLevelSummaries").doc(uid).get()));
    return Object.fromEntries(snapshots.filter((snap) => snap.exists).map((snap) => [snap.id, publicSummary(snap.data())]));
}

async function getVerifiedReviewIds(firestore, reviewIds) {
    const unique = [...new Set((reviewIds || []).filter((id) => typeof id === "string" && id).slice(0, 50))];
    if (!unique.length) return [];
    const snapshots = await firestore.getAll(...unique.map((id) => firestore.collection("userPointEvents").doc(`review_${id}`)));
    return snapshots.filter((snap) => snap.exists && snap.data().active === true && snap.data().reason === "VERIFIED_REVIEW")
        .map((snap) => snap.id.replace(/^review_/, ""));
}

async function createVerifiedProductReview({ firestore, user, listingId, rating, comment }) {
    const numericRating = Number(rating);
    const text = String(comment || "").trim();
    if (!listingId || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5 || text.length < 3 || text.length > 2000) {
        const error = new Error("Yorum bilgileri geçersiz."); error.status = 400; throw error;
    }
    const orders = await firestore.collection("siparisler").where("alici", "==", user.email).get();
    const verifiedBuyer = orders.docs.some((doc) => doc.data().ilanId === listingId && orderCountsForPoints(doc.data()));
    if (!verifiedBuyer) { const error = new Error("Yalnız tamamlanmış alışverişe yorum yapılabilir."); error.status = 403; throw error; }
    const reviewRef = firestore.collection("yorumlar").doc(`${listingId}_${user.uid}`);
    await firestore.runTransaction(async (tx) => {
        const current = await tx.get(reviewRef);
        if (current.exists) { const error = new Error("Bu ürünü daha önce değerlendirdiniz."); error.status = 409; throw error; }
        tx.set(reviewRef, { ilanId: listingId, kullanici: user.email, kullaniciUid: user.uid, puan: numericRating, yorum: text, dogrulanmisAlici: true, tarih: FieldValue.serverTimestamp() });
    });
    await syncUserLevel({ firestore, uid: user.uid, email: user.email });
    return { id: reviewRef.id, verifiedBuyer: true };
}

module.exports = { levels, levelForPoints, orderCountsForPoints, publicSummary, buildPointEvents, syncUserLevel, getPublicSummaries, getVerifiedReviewIds, createVerifiedProductReview };
