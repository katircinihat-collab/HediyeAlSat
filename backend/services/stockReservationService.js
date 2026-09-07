const crypto = require("crypto");

const RESERVATION_TTL_MS = 15 * 60 * 1000;

class StockReservationError extends Error {
    constructor(message, code = "STOCK_RESERVATION_FAILED", status = 409) {
        super(message);
        this.name = "StockReservationError";
        this.code = code;
        this.status = status;
    }
}

function reservationId(conversationId) {
    return `payment_${crypto.createHash("sha256").update(String(conversationId)).digest("hex").slice(0, 40)}`;
}

async function reserveStock({ firestore, FieldValue, conversationId, verifiedItems, now = new Date() }) {
    const physicalItems = verifiedItems.filter((item) => !item.isDigital);
    if (physicalItems.length === 0) return null;

    const id = reservationId(conversationId);
    const ref = firestore.collection("stockReservations").doc(id);
    const expiresAt = new Date(now.getTime() + RESERVATION_TTL_MS);

    return firestore.runTransaction(async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists) return { id, ...existing.data(), idempotent: true };

        const grouped = new Map();
        physicalItems.forEach((item) => grouped.set(item.listingId, (grouped.get(item.listingId) || 0) + item.quantity));
        const listingRefs = [...grouped.keys()].map((listingId) => firestore.collection("ilanlar").doc(listingId));
        const snapshots = await Promise.all(listingRefs.map((listingRef) => tx.get(listingRef)));
        const items = [];

        snapshots.forEach((snapshot, index) => {
            const listingId = listingRefs[index].id;
            const quantity = grouped.get(listingId);
            if (!snapshot.exists) throw new StockReservationError("İlan bulunamadı.", "LISTING_NOT_FOUND", 404);
            const listing = snapshot.data();
            const stock = Number(listing.stok ?? listing.adet);
            if (listing.urunTipi === "dijital" || listing.fizikselKargo === false) {
                throw new StockReservationError("Dijital ürün için stok rezervasyonu oluşturulamaz.", "DIGITAL_RESERVATION_FORBIDDEN");
            }
            if (!Number.isInteger(stock) || stock < quantity) {
                throw new StockReservationError("Ürün için yeterli stok bulunmuyor.", "INSUFFICIENT_STOCK");
            }
            const remaining = stock - quantity;
            tx.update(listingRefs[index], { stok: remaining, ...(remaining <= 0 ? { aktif: false } : {}) });
            items.push({ listingId, quantity });
        });

        tx.set(ref, {
            conversationId,
            status: "ACTIVE",
            items,
            expiresAt,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });
        return { id, status: "ACTIVE", items, expiresAt, idempotent: false };
    });
}

async function releaseReservation({ firestore, FieldValue, reservationId: id, reason = "PAYMENT_FAILED", now = new Date() }) {
    if (!id) return { released: false, reason: "NO_RESERVATION" };
    return firestore.runTransaction(async (tx) => {
        const ref = firestore.collection("stockReservations").doc(id);
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) return { released: false, reason: "NOT_FOUND" };
        const reservation = snapshot.data();
        if (reservation.status !== "ACTIVE") return { released: false, reason: reservation.status };
        const listingRefs = reservation.items.map((item) => firestore.collection("ilanlar").doc(item.listingId));
        const listings = await Promise.all(listingRefs.map((listingRef) => tx.get(listingRef)));
        listings.forEach((listing, index) => {
            if (!listing.exists) throw new StockReservationError("Rezerve ilan bulunamadı; manuel inceleme gerekli.", "RESERVATION_LISTING_MISSING");
            const current = Number(listing.data().stok ?? listing.data().adet);
            if (!Number.isInteger(current)) throw new StockReservationError("Stok değeri geçersiz; manuel inceleme gerekli.", "INVALID_STOCK");
            tx.update(listingRefs[index], { stok: current + Number(reservation.items[index].quantity), aktif: true });
        });
        tx.update(ref, { status: "RELEASED", releaseReason: reason, releasedAt: now, updatedAt: FieldValue.serverTimestamp() });
        return { released: true };
    });
}

async function releaseExpiredReservations({ firestore, FieldValue, now = new Date() }) {
    const snapshot = await firestore.collection("stockReservations")
        .where("expiresAt", "<=", now).limit(100).get();
    const results = [];
    for (const document of snapshot.docs) {
        results.push(await releaseReservation({ firestore, FieldValue, reservationId: document.id, reason: "EXPIRED", now }));
    }
    return { checked: snapshot.size, released: results.filter((result) => result.released).length };
}

module.exports = { RESERVATION_TTL_MS, StockReservationError, reservationId, reserveStock, releaseReservation, releaseExpiredReservations };
