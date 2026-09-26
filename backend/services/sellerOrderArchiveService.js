const { OrderStatusError } = require("./orderStatusService");
const { RESERVATION_TTL_MS } = require("./stockReservationService");

const meaningful = (value) => value !== undefined && value !== null && value !== false && value !== "" && value !== 0;
const validId = (value) => typeof value === "string" && value.length > 0 && value.length <= 150 && !value.includes("/");

function isUnpaidAttempt(order) {
    if (!order || order.odemeDurumu !== false || !["Ödeme Bekleniyor", "Ödeme Başarısız", "FAILED", "EXPIRED"].includes(order.durum)) return false;
    // Fail closed for financial, fulfillment and legacy audit markers, even if the label says unpaid.
    return !Object.entries(order).some(([key, value]) => meaningful(value) && (
        /^(hakEdis|settlement|payout|refund|iade|itiraz|dispute|teslimatDogrul|paymentTransaction|subMerchant|netTutar|komisyon|bakiye|wallet)/i.test(key)
        || ["paymentId", "odemeTarihi", "aktifTalepId", "kargoNo", "kargoTarihi", "hazirlanmaTarihi", "teslimTarihi"].includes(key)
        || (key === "paymentStatus" && !["WAITING", "FAILED", "EXPIRED"].includes(value))
    ));
}

function owns(order, user) {
    // A canonical UID, when present, must not be bypassed by an old email field.
    return Boolean(user?.uid && (order.saticiUid ? order.saticiUid === user.uid : user.email && order.satici === user.email));
}

async function inspect({ firestore, tx, orderId, user, now }) {
    if (!validId(orderId)) throw new OrderStatusError("Sipariş kimliği geçersiz.");
    const ref = firestore.collection("siparisler").doc(orderId);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new OrderStatusError("Sipariş bulunamadı.", 404);
    const order = snapshot.data();
    if (!owns(order, user)) throw new OrderStatusError("Bu kayda erişim yetkiniz yok.", 403);
    const blocked = { eligible: false, ref, order };
    if (!isUnpaidAttempt(order)) return blocked;
    const date = order.tarih?.toDate?.() || new Date(order.tarih);
    if (!Number.isFinite(date?.getTime()) || now.getTime() - date.getTime() < RESERVATION_TTL_MS) return blocked;

    const [payments, movements, claims, refunds, delivery] = await Promise.all([
        tx.get(firestore.collection("odemeler").where("siparisIds", "array-contains", orderId).limit(21)),
        tx.get(firestore.collection("bakiyeHareketleri").where("siparisId", "==", orderId).limit(1)),
        tx.get(firestore.collection("orderClaims").where("orderId", "==", orderId).limit(1)),
        tx.get(firestore.collection("refundFinalizations").where("orderId", "==", orderId).limit(1)),
        tx.get(firestore.collection("raffleOrderDeliveries").doc(orderId)),
    ]);
    if (payments.docs.length > 20 || movements.docs.length || claims.docs.length || refunds.docs.length) return blocked;
    // Kura reservations/private destinations remain under the existing Kura lifecycle; never delete them here.
    if (delivery.exists || order.isRaffleGift === true || meaningful(order.stockReservationId)) return blocked;
    if (order.conversationId && !payments.docs.some((doc) => doc.id === order.conversationId)) return blocked;
    for (const doc of payments.docs) {
        const payment = doc.data();
        // Expired stock alone is NOT proof of failed payment. WAITING and uncertain results stay protected.
        if (payment.paymentStatus !== "FAILED" || payment.odemeDurumu !== false || payment.paymentId
            || payment.finalizationStatus || payment.settlementStatus) return blocked;
        if (payment.stockReservationId) {
            if (!validId(payment.stockReservationId)) return blocked;
            const reservation = await tx.get(firestore.collection("stockReservations").doc(payment.stockReservationId));
            if (!reservation.exists || reservation.data().status !== "RELEASED" || reservation.data().conversationId !== doc.id) return blocked;
        }
    }
    return { eligible: true, ref, order };
}

async function inspectSellerAttempt({ firestore, orderId, user, now = new Date() }) {
    return firestore.runTransaction(async (tx) => {
        const result = await inspect({ firestore, tx, orderId, user, now });
        return { eligible: result.eligible };
    });
}

async function archiveSellerAttempt({ firestore, FieldValue, orderId, user, now = new Date() }) {
    return firestore.runTransaction(async (tx) => {
        const result = await inspect({ firestore, tx, orderId, user, now });
        if (!result.eligible) throw new OrderStatusError("Bu kayıt temizlenemez. Devam eden ödeme veya ticari/finansal geçmiş korunur.", 409);
        if (result.order.sellerAttemptArchived === true) return { archived: true, idempotent: true };
        // Presentation-only tombstone: preserve orders, callbacks, reservations and every audit reference.
        tx.update(result.ref, { sellerAttemptArchived: true, sellerAttemptArchivedAt: FieldValue.serverTimestamp(), sellerAttemptArchivedBy: user.uid });
        return { archived: true, idempotent: false };
    });
}

module.exports = { isUnpaidAttempt, owns, inspectSellerAttempt, archiveSellerAttempt };
