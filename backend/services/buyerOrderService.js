const { firestore } = require("../config/firebase");

function buyerOwnsOrder(order, user) {
    return Boolean((order.aliciUid && order.aliciUid === user.uid)
        || (user.email && (order.alici === user.email || order.kullanici === user.email)));
}

function safeBuyerOrder(id, order) {
    const safe = { id, ...order };
    ["paymentId", "paymentTransactionId", "conversationId", "subMerchantKey", "receiverUid", "recipientUid", "deliveryAddressId", "addressId"]
        .forEach((field) => delete safe[field]);
    if (safe.isRaffleGift === true) {
        ["adres", "telefon", "il", "ilce", "shippingAddress", "deliveryAddress"].forEach((field) => delete safe[field]);
    }
    return safe;
}

function timestamp(order) {
    const value = order.tarih || order.olusturmaTarihi;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    const parsed = new Date(value || 0).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

async function listBuyerOrders(user, db = firestore) {
    if (!user?.uid || !user?.email) return [];
    const snapshots = await Promise.all([
        db.collection("siparisler").where("aliciUid", "==", user.uid).get(),
        db.collection("siparisler").where("alici", "==", user.email).get(),
        db.collection("siparisler").where("kullanici", "==", user.email).get()
    ]);
    const unique = new Map();
    snapshots.forEach((snapshot) => snapshot.docs.forEach((document) => {
        const order = document.data();
        if (buyerOwnsOrder(order, user)) unique.set(document.id, safeBuyerOrder(document.id, order));
    }));
    return [...unique.values()].sort((left, right) => timestamp(right) - timestamp(left));
}

module.exports = { buyerOwnsOrder, safeBuyerOrder, listBuyerOrders };
