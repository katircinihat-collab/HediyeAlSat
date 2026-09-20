const crypto = require("crypto");
const raffleConfig = require("../../shared/raffleConfig.json");
const xpConfig = require("../../shared/xpConfig.json");
const { applyXpEventInTransaction } = require("./xpService");
const PRIVATE_DATA_PATTERN = /(?:https?:\/\/|www\.|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+?90\s*)?0?5\d{2}[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}|(?:^|\s)@[a-z0-9_.]{2,})/i;

class RaffleError extends Error {
    constructor(message, status = 400, code = "RAFFLE_ERROR") {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function toDate(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function publicEvent(id, data = {}) {
    const serialize = (value) => toDate(value)?.toISOString() || null;
    const suggestedGiftBudget = [data.suggestedGiftBudget, data.giftBudgetMin, data.minGiftBudget]
        .map(Number)
        .find((value) => Number.isFinite(value) && value > 0) || null;
    return {
        id,
        title: data.title || "Kura",
        description: data.description || "",
        status: data.status || "UPCOMING",
        joinStartAt: serialize(data.joinStartAt),
        joinEndAt: serialize(data.joinEndAt),
        drawAt: serialize(data.drawAt),
        createdAt: serialize(data.createdAt),
        participantCount: Math.max(0, Number(data.participantCount) || 0),
        minimumParticipantCount: Math.max(2, Number(data.minimumParticipantCount) || 2),
        xpCost: xpConfig.events.RAFFLE_JOIN.amount,
        suggestedGiftBudget
    };
}

function normalizeDeliveryAddress(value = {}) {
    const delivery = {
        fullName: String(value.fullName || "").trim().replace(/\s+/g, " ").slice(0, 100),
        phone: String(value.phone || "").replace(/\D/g, "").slice(0, 11),
        address: String(value.address || "").trim().replace(/\s+/g, " ").slice(0, 500),
        city: String(value.city || "").trim().replace(/\s+/g, " ").slice(0, 80),
        district: String(value.district || "").trim().replace(/\s+/g, " ").slice(0, 80)
    };
    if (delivery.fullName.length < 3 || !/^05\d{9}$/.test(delivery.phone)
        || delivery.address.length < 10 || !delivery.city || !delivery.district) {
        throw new RaffleError("Kura'ya katılmak için geçerli teslimat adresini seçmelisin.", 400, "RAFFLE_DELIVERY_REQUIRED");
    }
    return delivery;
}

function validatePublicText(value, maxLength) {
    const text = String(value || "").trim().replace(/\s+/g, " ");
    if (text.length > maxLength) throw new RaffleError(`Metin en fazla ${maxLength} karakter olabilir.`, 400, "RAFFLE_TEXT_TOO_LONG");
    if (PRIVATE_DATA_PATTERN.test(text)) {
        throw new RaffleError("Telefon, e-posta veya bağlantı paylaşmayın.", 400, "RAFFLE_PRIVATE_DATA");
    }
    return text;
}

function safeDisplayName(value) {
    const name = String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
    return !name || PRIVATE_DATA_PATTERN.test(name) ? "HediyeAlSat Üyesi" : name;
}

function assertJoinWindow(event, now = new Date()) {
    if (event.status !== "OPEN") throw new RaffleError("Bu Kura katılıma açık değil.", 409, "RAFFLE_NOT_OPEN");
    const start = toDate(event.joinStartAt);
    const end = toDate(event.joinEndAt || event.drawAt);
    if (start && now < start) throw new RaffleError("Kura katılımı henüz başlamadı.", 409, "RAFFLE_NOT_STARTED");
    if (end && now >= end) throw new RaffleError("Kura katılım süresi sona erdi.", 409, "RAFFLE_JOIN_CLOSED");
}

async function joinRaffle({ firestore, FieldValue, eventId, user, giftHint = "", deliveryAddress, now = new Date() }) {
    const eventRef = firestore.collection("raffleEvents").doc(eventId);
    const participantRef = firestore.collection("raffleParticipants").doc(`${eventId}_${user.uid}`);
    return firestore.runTransaction(async (transaction) => {
        const [eventSnapshot, participantSnapshot] = await Promise.all([
            transaction.get(eventRef), transaction.get(participantRef)
        ]);
        if (!eventSnapshot.exists) throw new RaffleError("Kura bulunamadı.", 404, "RAFFLE_NOT_FOUND");
        const event = eventSnapshot.data();
        assertJoinWindow(event, now);
        if (participantSnapshot.exists) {
            if (participantSnapshot.data().status === "ACTIVE") return { joined: true, duplicate: true };
            throw new RaffleError("İptal edilmiş katılım aynı etkinlik için yeniden açılamaz.", 409, "RAFFLE_REJOIN_BLOCKED");
        }
        if (Math.max(0, Number(event.participantCount) || 0) >= raffleConfig.maxParticipants) {
            throw new RaffleError("Kura katılımcı kapasitesi doldu.", 409, "RAFFLE_FULL");
        }
        const normalizedDelivery = normalizeDeliveryAddress(deliveryAddress);
        const xp = await applyXpEventInTransaction({
            firestore, transaction, FieldValue, uid: user.uid,
            reason: raffleConfig.xpReason, sourceId: eventId, now
        });
        transaction.create(participantRef, {
            eventId,
            userUid: user.uid,
            displayName: safeDisplayName(user.name || user.displayName),
            giftHint: validatePublicText(giftHint, raffleConfig.giftHintMaxLength),
            deliveryAddress: normalizedDelivery,
            deliveryReady: true,
            status: "ACTIVE",
            joinedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });
        transaction.update(eventRef, {
            participantCount: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp()
        });
        return { joined: true, duplicate: false, xp };
    });
}

async function cancelParticipation({ firestore, FieldValue, eventId, uid, now = new Date() }) {
    const eventRef = firestore.collection("raffleEvents").doc(eventId);
    const participantRef = firestore.collection("raffleParticipants").doc(`${eventId}_${uid}`);
    return firestore.runTransaction(async (transaction) => {
        const [eventSnapshot, participantSnapshot] = await Promise.all([
            transaction.get(eventRef), transaction.get(participantRef)
        ]);
        if (!eventSnapshot.exists) throw new RaffleError("Kura bulunamadı.", 404, "RAFFLE_NOT_FOUND");
        const event = eventSnapshot.data();
        if (["DRAWING", "MATCHED", "COMPLETED"].includes(event.status)) {
            throw new RaffleError("Kura çekildikten sonra katılım iptal edilemez.", 409, "RAFFLE_ALREADY_DRAWN");
        }
        if (!participantSnapshot.exists) throw new RaffleError("Aktif katılım bulunamadı.", 404, "RAFFLE_PARTICIPATION_NOT_FOUND");
        if (participantSnapshot.data().status === "CANCELLED") return { cancelled: true, duplicate: true };
        const xp = await applyXpEventInTransaction({
            firestore, transaction, FieldValue, uid,
            reason: raffleConfig.refundReason, sourceId: eventId, now
        });
        transaction.update(participantRef, {
            status: "CANCELLED",
            deliveryAddress: null,
            deliveryReady: false,
            cancelledAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });
        transaction.update(eventRef, {
            participantCount: FieldValue.increment(-1),
            updatedAt: FieldValue.serverTimestamp()
        });
        return { cancelled: true, duplicate: false, xp };
    });
}

function deterministicOrder(participants, eventId, seed) {
    return [...participants].sort((left, right) => {
        const hash = (uid) => crypto.createHash("sha256").update(`${eventId}:${seed}:${uid}`).digest("hex");
        return hash(left.userUid).localeCompare(hash(right.userUid));
    });
}

async function drawRaffle({ firestore, FieldValue, eventId, adminUid, now = new Date(), seed = crypto.randomBytes(24).toString("hex") }) {
    const eventRef = firestore.collection("raffleEvents").doc(eventId);
    const participantsQuery = firestore.collection("raffleParticipants")
        .where("eventId", "==", eventId).where("status", "==", "ACTIVE").limit(raffleConfig.maxParticipants + 1);
    return firestore.runTransaction(async (transaction) => {
        const [eventSnapshot, participantSnapshot] = await Promise.all([
            transaction.get(eventRef), transaction.get(participantsQuery)
        ]);
        if (!eventSnapshot.exists) throw new RaffleError("Kura bulunamadı.", 404, "RAFFLE_NOT_FOUND");
        const event = eventSnapshot.data();
        if (event.status === "MATCHED" || event.status === "COMPLETED") return { matched: true, duplicate: true, count: Number(event.matchedCount || event.participantCount || 0) };
        if (event.status === "CANCELLED") throw new RaffleError("İptal edilmiş Kura çekilemez.", 409, "RAFFLE_CANCELLED");
        const drawAt = toDate(event.drawAt);
        if (!drawAt || now < drawAt) throw new RaffleError("Kura çekim zamanı henüz gelmedi.", 409, "RAFFLE_DRAW_TOO_EARLY");
        const participants = participantSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const minimumParticipantCount = Math.max(2, Number(event.minimumParticipantCount) || 2);
        if (participants.length < minimumParticipantCount) throw new RaffleError("Minimum katılımcı sayısına henüz ulaşılamadı.", 409, "RAFFLE_MINIMUM_NOT_REACHED");
        if (participants.length > raffleConfig.maxParticipants) throw new RaffleError("Kura güvenli katılımcı limitini aşıyor.", 409, "RAFFLE_TOO_MANY_PARTICIPANTS");
        const ordered = deterministicOrder(participants, eventId, seed);
        ordered.forEach((giver, index) => {
            const recipient = ordered[(index + 1) % ordered.length];
            transaction.create(firestore.collection("raffleMatches").doc(`${eventId}_${giver.userUid}`), {
                eventId,
                giverUid: giver.userUid,
                recipientUid: recipient.userUid,
                createdAt: FieldValue.serverTimestamp()
            });
        });
        transaction.update(eventRef, {
            status: "MATCHED",
            drawSeedHash: crypto.createHash("sha256").update(seed).digest("hex"),
            matchedCount: ordered.length,
            drawnAt: FieldValue.serverTimestamp(),
            drawnBy: adminUid,
            updatedAt: FieldValue.serverTimestamp()
        });
        return { matched: true, duplicate: false, count: ordered.length };
    });
}

module.exports = {
    raffleConfig, RaffleError, toDate, publicEvent, validatePublicText, safeDisplayName, assertJoinWindow,
    joinRaffle, cancelParticipation, deterministicOrder, drawRaffle, normalizeDeliveryAddress
};
