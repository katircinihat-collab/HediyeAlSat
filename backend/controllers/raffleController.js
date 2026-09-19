const { firestore, FieldValue } = require("../config/firebase");
const xpConfig = require("../../shared/xpConfig.json");
const {
    raffleConfig, RaffleError, toDate, publicEvent, validatePublicText,
    joinRaffle, cancelParticipation, drawRaffle
} = require("../services/raffleService");

function respondError(res, error) {
    return res.status(error.status || 500).json({
        success: false,
        code: error.code || "RAFFLE_FAILED",
        message: error.status ? error.message : "Kura işlemi şu anda tamamlanamıyor."
    });
}

function serializeTimestamp(value) {
    return toDate(value)?.toISOString() || null;
}

exports.active = async (_req, res) => {
    try {
        const snapshot = await firestore.collection("raffleEvents").orderBy("createdAt", "desc").limit(20).get();
        const priority = { OPEN: 0, UPCOMING: 1, MATCHED: 2 };
        const events = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((event) => Object.hasOwn(priority, event.status))
            .sort((a, b) => (priority[a.status] - priority[b.status]) || ((toDate(a.drawAt)?.getTime() || 0) - (toDate(b.drawAt)?.getTime() || 0)));
        return res.json({ success: true, event: events[0] ? publicEvent(events[0].id, events[0]) : null });
    } catch (error) {
        console.error("Kura aktif etkinlik okuma hatası:", { code: error.code || "RAFFLE_ACTIVE_FAILED" });
        return respondError(res, error);
    }
};

exports.me = async (req, res) => {
    try {
        const [participant, balance] = await Promise.all([
            firestore.collection("raffleParticipants").doc(`${req.params.eventId}_${req.user.uid}`).get(),
            firestore.collection("userXpBalances").doc(req.user.uid).get()
        ]);
        const balanceData = balance.exists ? balance.data() : {};
        return res.json({
            success: true,
            joined: participant.exists && participant.data().status === "ACTIVE",
            participation: participant.exists ? {
                status: participant.data().status,
                giftHint: participant.data().giftHint || ""
            } : null,
            availableXP: Math.max(0, Number(balanceData.availableXP) || 0)
        });
    } catch (error) { return respondError(res, error); }
};

exports.join = async (req, res) => {
    try {
        const result = await joinRaffle({
            firestore, FieldValue, eventId: req.params.eventId,
            user: { uid: req.user.uid, name: req.user.name }, giftHint: req.body?.giftHint
        });
        return res.status(result.duplicate ? 200 : 201).json({ success: true, ...result });
    } catch (error) { return respondError(res, error); }
};

exports.cancel = async (req, res) => {
    try {
        const result = await cancelParticipation({ firestore, FieldValue, eventId: req.params.eventId, uid: req.user.uid });
        return res.json({ success: true, ...result });
    } catch (error) { return respondError(res, error); }
};

exports.updateHint = async (req, res) => {
    try {
        const reference = firestore.collection("raffleParticipants").doc(`${req.params.eventId}_${req.user.uid}`);
        const giftHint = validatePublicText(req.body?.giftHint, raffleConfig.giftHintMaxLength);
        await firestore.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(reference);
            if (!snapshot.exists || snapshot.data().status !== "ACTIVE") {
                throw new RaffleError("Hediye ipucu için aktif Kura katılımı gereklidir.", 403, "RAFFLE_PARTICIPANT_REQUIRED");
            }
            transaction.update(reference, { giftHint, updatedAt: FieldValue.serverTimestamp() });
        });
        return res.json({ success: true, giftHint });
    } catch (error) { return respondError(res, error); }
};

exports.result = async (req, res) => {
    try {
        const match = await firestore.collection("raffleMatches").doc(`${req.params.eventId}_${req.user.uid}`).get();
        if (!match.exists) throw new RaffleError("Kura eşleşmeniz henüz hazır değil.", 404, "RAFFLE_RESULT_NOT_READY");
        const matchData = match.data();
        if (matchData.giverUid !== req.user.uid) throw new RaffleError("Bu eşleşmeye erişemezsiniz.", 403, "RAFFLE_RESULT_FORBIDDEN");
        const recipient = await firestore.collection("raffleParticipants").doc(`${req.params.eventId}_${matchData.recipientUid}`).get();
        if (!recipient.exists) throw new RaffleError("Eşleşme profili bulunamadı.", 404, "RAFFLE_RECIPIENT_NOT_FOUND");
        const data = recipient.data();
        return res.json({ success: true, recipient: { displayName: data.displayName || "HediyeAlSat Üyesi", giftHint: data.giftHint || "" } });
    } catch (error) { return respondError(res, error); }
};

exports.messages = async (req, res) => {
    try {
        const snapshot = await firestore.collection("raffleMessages")
            .where("eventId", "==", req.params.eventId).orderBy("createdAt", "desc").limit(50).get();
        const messages = snapshot.docs.map((doc) => {
            const data = doc.data();
            return { id: doc.id, senderName: data.senderName || "Üye", message: data.message, createdAt: serializeTimestamp(data.createdAt) };
        }).reverse();
        return res.json({ success: true, messages });
    } catch (error) { return respondError(res, error); }
};

exports.sendMessage = async (req, res) => {
    try {
        const participant = await firestore.collection("raffleParticipants").doc(`${req.params.eventId}_${req.user.uid}`).get();
        if (!participant.exists || participant.data().status !== "ACTIVE") throw new RaffleError("Sohbete yazmak için Kuraya katılmalısınız.", 403, "RAFFLE_CHAT_PARTICIPANT_REQUIRED");
        const event = await firestore.collection("raffleEvents").doc(req.params.eventId).get();
        if (!event.exists || event.data().status === "CANCELLED") throw new RaffleError("Bu Kura sohbeti kapalı.", 409, "RAFFLE_CHAT_CLOSED");
        const message = validatePublicText(req.body?.message, raffleConfig.messageMaxLength);
        if (!message) throw new RaffleError("Mesaj boş olamaz.", 400, "RAFFLE_MESSAGE_REQUIRED");
        const reference = await firestore.collection("raffleMessages").add({
            eventId: req.params.eventId,
            senderUid: req.user.uid,
            senderName: participant.data().displayName || "HediyeAlSat Üyesi",
            message,
            createdAt: FieldValue.serverTimestamp()
        });
        return res.status(201).json({ success: true, id: reference.id });
    } catch (error) { return respondError(res, error); }
};

function validateEventInput(body, partial = false) {
    const data = {};
    if (!partial || body.title !== undefined) {
        data.title = String(body.title || "").trim().slice(0, 120);
        if (!data.title) throw new RaffleError("Kura başlığı zorunludur.");
    }
    if (!partial || body.description !== undefined) data.description = String(body.description || "").trim().slice(0, 1200);
    for (const field of ["joinStartAt", "joinEndAt", "drawAt"]) {
        if (!partial || body[field] !== undefined) {
            const date = toDate(body[field]);
            if (!date) throw new RaffleError(`${field} geçerli bir tarih olmalıdır.`);
            data[field] = date;
        }
    }
    if (data.joinStartAt && data.joinEndAt && data.joinStartAt >= data.joinEndAt) throw new RaffleError("Katılım bitişi başlangıçtan sonra olmalıdır.");
    if (data.joinEndAt && data.drawAt && data.joinEndAt > data.drawAt) throw new RaffleError("Kura zamanı katılım bitişinden önce olamaz.");
    if (!partial || body.status !== undefined) {
        if (!["UPCOMING", "OPEN"].includes(body.status)) throw new RaffleError("Kura başlangıç durumu geçersiz.");
        data.status = body.status;
    }
    if (!partial || body.suggestedGiftBudget !== undefined) {
        if (body.suggestedGiftBudget === "" || body.suggestedGiftBudget === null || body.suggestedGiftBudget === undefined) {
            data.suggestedGiftBudget = null;
        } else {
            const suggestedGiftBudget = Number(body.suggestedGiftBudget);
            if (!Number.isFinite(suggestedGiftBudget) || suggestedGiftBudget <= 0 || suggestedGiftBudget > 1000000) {
                throw new RaffleError("Önerilen hediye bütçesi geçerli pozitif bir tutar olmalıdır.", 400, "RAFFLE_INVALID_SUGGESTED_BUDGET");
            }
            data.suggestedGiftBudget = suggestedGiftBudget;
        }
    }
    return data;
}

exports.adminList = async (_req, res) => {
    try {
        const snapshot = await firestore.collection("raffleEvents").orderBy("createdAt", "desc").limit(50).get();
        return res.json({ success: true, events: snapshot.docs.map((doc) => publicEvent(doc.id, doc.data())) });
    } catch (error) { return respondError(res, error); }
};

exports.adminCreate = async (req, res) => {
    try {
        const input = validateEventInput(req.body || {});
        const reference = firestore.collection("raffleEvents").doc();
        await reference.create({ ...input, participantCount: 0, xpCost: xpConfig.events.RAFFLE_JOIN.amount, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        return res.status(201).json({ success: true, event: { id: reference.id, ...publicEvent(reference.id, input) } });
    } catch (error) { return respondError(res, error); }
};

exports.adminUpdate = async (req, res) => {
    try {
        const reference = firestore.collection("raffleEvents").doc(req.params.eventId);
        await firestore.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(reference);
            if (!snapshot.exists) throw new RaffleError("Kura bulunamadı.", 404, "RAFFLE_NOT_FOUND");
            if (["MATCHED", "COMPLETED", "CANCELLED"].includes(snapshot.data().status)) throw new RaffleError("Tamamlanmış Kura değiştirilemez.", 409, "RAFFLE_IMMUTABLE");
            const input = validateEventInput({ ...snapshot.data(), ...(req.body || {}) });
            transaction.update(reference, { ...input, updatedAt: FieldValue.serverTimestamp() });
        });
        return res.json({ success: true });
    } catch (error) { return respondError(res, error); }
};

exports.adminDraw = async (req, res) => {
    try {
        return res.json({ success: true, ...(await drawRaffle({ firestore, FieldValue, eventId: req.params.eventId, adminUid: req.user.uid })) });
    } catch (error) { return respondError(res, error); }
};

exports.adminCancel = async (req, res) => {
    try {
        const eventRef = firestore.collection("raffleEvents").doc(req.params.eventId);
        await firestore.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(eventRef);
            if (!snapshot.exists) throw new RaffleError("Kura bulunamadı.", 404, "RAFFLE_NOT_FOUND");
            if (["DRAWING", "MATCHED", "COMPLETED"].includes(snapshot.data().status)) throw new RaffleError("Çekilmiş Kura bu akışla iptal edilemez.", 409, "RAFFLE_ALREADY_DRAWN");
            if (snapshot.data().status !== "CANCELLED") transaction.update(eventRef, { status: "CANCELLED", cancelledAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        });
        const participants = await firestore.collection("raffleParticipants").where("eventId", "==", req.params.eventId).where("status", "==", "ACTIVE").limit(raffleConfig.maxParticipants).get();
        const results = [];
        for (const participant of participants.docs) {
            try {
                results.push(await cancelParticipation({ firestore, FieldValue, eventId: req.params.eventId, uid: participant.data().userUid }));
            } catch (refundError) {
                console.error("Kura iptal XP iadesi tamamlanamadı:", {
                    eventId: req.params.eventId,
                    code: refundError.code || "RAFFLE_REFUND_FAILED"
                });
                results.push({ failed: true });
            }
        }
        const failedRefunds = results.filter((result) => result.failed).length;
        return res.status(failedRefunds ? 409 : 200).json({
            success: failedRefunds === 0,
            refundedParticipants: results.filter((result) => !result.duplicate && !result.failed).length,
            failedRefunds,
            message: failedRefunds ? "Kura iptal edildi; bazı XP iadeleri için işlem yeniden denenmelidir." : undefined
        });
    } catch (error) { return respondError(res, error); }
};

exports.validateEventInput = validateEventInput;
