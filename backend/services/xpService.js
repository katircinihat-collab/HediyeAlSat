const crypto = require("crypto");
const config = require("../../shared/xpConfig.json");

class XpError extends Error {
    constructor(message, status = 400, code = "XP_ERROR") { super(message); this.status = status; this.code = code; }
}

function safeBalance(data = {}) {
    return { lifetimeXP: Math.max(0, Number(data.lifetimeXP) || 0), availableXP: Math.max(0, Number(data.availableXP) || 0) };
}

function levelForXP(value) {
    const lifetimeXP = Math.max(0, Number(value) || 0);
    return [...config.levels].reverse().find((level) => lifetimeXP >= level.minXP) || config.levels[0];
}

function progressForXP(value) {
    const lifetimeXP = Math.max(0, Number(value) || 0);
    const current = levelForXP(lifetimeXP);
    const next = config.levels.find((level) => level.level === current.level + 1) || null;
    if (!next) return { percent: 100, remaining: 0, next: null };
    const span = next.minXP - current.minXP;
    return { percent: Math.min(100, Math.max(0, ((lifetimeXP - current.minXP) / span) * 100)), remaining: Math.max(0, next.minXP - lifetimeXP), next };
}

function istanbulDateKey(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function eventId(uid, reason, sourceId) {
    if (!uid || !reason || !sourceId) throw new XpError("XP işlem kimliği eksik.", 400, "XP_EVENT_ID_REQUIRED");
    return crypto.createHash("sha256").update(`${uid}:${reason}:${sourceId}`).digest("hex");
}

async function applyXpEventInTransaction({ firestore, transaction, FieldValue, uid, reason, sourceId, now = new Date() }) {
    const rule = config.events[reason];
    if (!rule) throw new XpError("Desteklenmeyen XP işlemi.", 400, "XP_REASON_INVALID");
    const id = eventId(uid, reason, sourceId);
    const balanceRef = firestore.collection("userXpBalances").doc(uid);
    const eventRef = firestore.collection("userXpTransactions").doc(id);
    const dateKey = istanbulDateKey(now);
    const dailyRef = rule.dailyCap ? firestore.collection("userXpDaily").doc(`${uid}_${dateKey}_${reason}`) : null;
    const originalRef = rule.refundOf ? firestore.collection("userXpTransactions").doc(eventId(uid, rule.refundOf, sourceId)) : null;

    const refs = [balanceRef, eventRef, ...(dailyRef ? [dailyRef] : []), ...(originalRef ? [originalRef] : [])];
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const balance = safeBalance(snapshots[0].exists ? snapshots[0].data() : {});
    if (snapshots[1].exists) return { applied: false, duplicate: true, amount: 0, ...balance };

    let amount = rule.amount;
    let dailyEarned = 0;
    if (dailyRef) {
        dailyEarned = Math.max(0, Number(snapshots[2].exists ? snapshots[2].data().earned : 0) || 0);
        amount = Math.max(0, Math.min(rule.amount, rule.dailyCap - dailyEarned));
    }
    if (originalRef) {
        const original = snapshots[snapshots.length - 1];
        if (!original.exists || original.data().type !== "spend") throw new XpError("İade edilecek XP işlemi bulunamadı.", 409, "XP_REFUND_SOURCE_MISSING");
    }
    if (rule.type === "spend" && balance.availableXP < amount) throw new XpError("Bu işlem için yeterli kullanılabilir XP yok.", 409, "XP_INSUFFICIENT");

    const next = {
        lifetimeXP: balance.lifetimeXP + (rule.type === "earn" ? amount : 0),
        availableXP: balance.availableXP + (rule.type === "earn" || rule.type === "refund" ? amount : -amount)
    };
    if (next.availableXP < 0) throw new XpError("Kullanılabilir XP negatif olamaz.", 409, "XP_NEGATIVE");

    transaction.set(balanceRef, { uid, ...next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.create(eventRef, { userUid: uid, type: rule.type, reason, amount, sourceId: String(sourceId), availableXPAfter: next.availableXP, lifetimeXPAfter: next.lifetimeXP, dateKey, createdAt: FieldValue.serverTimestamp() });
    if (dailyRef) transaction.set(dailyRef, { userUid: uid, reason, dateKey, earned: dailyEarned + amount, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { applied: true, duplicate: false, amount, ...next, capped: rule.type === "earn" && amount === 0 };
}

async function applyXpEvent(options) {
    return options.firestore.runTransaction((transaction) => applyXpEventInTransaction({ ...options, transaction }));
}

async function applyTypedXpEvent(expectedType, options) {
    const rule = config.events[options?.reason];
    if (!rule || rule.type !== expectedType) throw new XpError("XP işlem türü ve nedeni uyumsuz.", 400, "XP_TYPE_MISMATCH");
    return applyXpEvent(options);
}

const awardXP = (options) => applyTypedXpEvent("earn", options);
const spendXP = (options) => applyTypedXpEvent("spend", options);
const refundXP = (options) => applyTypedXpEvent("refund", options);

async function getXpProfile({ firestore, uid, limit = 10 }) {
    const [balanceSnapshot, historySnapshot] = await Promise.all([
        firestore.collection("userXpBalances").doc(uid).get(),
        firestore.collection("userXpTransactions").where("userUid", "==", uid).orderBy("createdAt", "desc").limit(Math.min(25, Math.max(1, Number(limit) || 10))).get()
    ]);
    const balance = safeBalance(balanceSnapshot.exists ? balanceSnapshot.data() : {});
    const level = levelForXP(balance.lifetimeXP);
    return {
        ...balance,
        level,
        progress: progressForXP(balance.lifetimeXP),
        history: historySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: typeof data.createdAt?.toDate === "function"
                    ? data.createdAt.toDate().toISOString()
                    : data.createdAt || null
            };
        })
    };
}

module.exports = { config, XpError, safeBalance, levelForXP, progressForXP, istanbulDateKey, eventId, applyXpEventInTransaction, applyXpEvent, awardXP, spendXP, refundXP, getXpProfile };
