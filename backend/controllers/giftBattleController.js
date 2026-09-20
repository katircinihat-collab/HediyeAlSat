const { firestore, FieldValue } = require("../config/firebase");
const communityService = require("../services/communityGiftBattleService");

const QUESTIONS = [
    "Sen hangisini hediye ederdin?",
    "Sevgiline hangisini hediye ederdin?",
    "Babana hangisini hediye ederdin?",
    "Annene hangisini hediye ederdin?",
    "Arkadaşına hangisini hediye ederdin?",
    "Eşine hangisini hediye ederdin?",
    "Doğum gününde hangisini hediye ederdin?"
];

const GIFT_BATTLE_TIMEOUT_MS = 7000;
const GIFT_BATTLE_CANDIDATE_LIMIT = 100;

function withTimeout(promise, timeoutMs = GIFT_BATTLE_TIMEOUT_MS) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const error = new Error("Gift Battle veri kaynağı zaman aşımına uğradı.");
            error.code = "GIFT_BATTLE_TIMEOUT";
            reject(error);
        }, timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function istanbulDate(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const dateKey = `${values.year}-${values.month}-${values.day}`;
    const weekday = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day))).getUTCDay();
    return { dateKey, question: QUESTIONS[weekday] };
}

function eligibleListing(listing = {}) {
    return listing.onay === true
        && listing.aktif !== false
        && listing.kategori !== "A4 Tasarım"
        && listing.anaKategori !== "A4 Tasarım"
        && listing.urunTipi !== "dijital";
}

function stringHash(value) {
    let hash = 2166136261;
    for (const character of value) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function selectPair(candidates, dateKey) {
    const listings = candidates
        .map((candidate) => typeof candidate === "string"
            ? { id: candidate, subcategory: "" }
            : candidate)
        .filter((candidate) => candidate?.id)
        .sort((a, b) => a.id.localeCompare(b.id));
    if (listings.length < 2) return null;

    const left = listings[stringHash(dateKey) % listings.length];
    const differentSubcategory = listings.filter((candidate) =>
        candidate.id !== left.id
        && candidate.subcategory
        && left.subcategory
        && candidate.subcategory !== left.subcategory
    );
    const alternatives = differentSubcategory.length
        ? differentSubcategory
        : listings.filter((candidate) => candidate.id !== left.id);
    const right = alternatives[stringHash(`${dateKey}:right`) % alternatives.length];
    return [left.id, right.id];
}

function voteDocumentId(dateKey, uid) {
    return `${dateKey}_${uid}`;
}

function listingPayload(snapshot) {
    const listing = snapshot.data();
    return {
        id: snapshot.id,
        baslik: listing.baslik || "İsimsiz ürün",
        resim: listing.resim || listing.resimler?.[0] || "",
        fiyat: Number(listing.fiyat || 0),
        magazaAdi: listing.magazaAdi || "",
        puan: Number(listing.puan || 0) > 0 ? Number(listing.puan) : null
    };
}

function resultPayload(battle, leftSnapshot, rightSnapshot) {
    const leftVotes = Math.max(0, Number(battle.leftVotes || 0));
    const rightVotes = Math.max(0, Number(battle.rightVotes || 0));
    const totalVotes = leftVotes + rightVotes;
    return {
        dateKey: battle.dateKey,
        question: battle.question,
        left: { ...listingPayload(leftSnapshot), oySayisi: leftVotes },
        right: { ...listingPayload(rightSnapshot), oySayisi: rightVotes },
        leftPercentage: totalVotes ? Math.round((leftVotes / totalVotes) * 100) : 0,
        rightPercentage: totalVotes ? 100 - Math.round((leftVotes / totalVotes) * 100) : 0,
        totalVotes
    };
}

async function createOrGetTodayBattle() {
    const { dateKey, question } = istanbulDate();
    const battleRef = firestore.collection("giftBattles").doc(dateKey);
    let battleSnapshot = await battleRef.get();

    if (!battleSnapshot.exists) {
        const eligibleSnapshot = await firestore.collection("ilanlar")
            .where("onay", "==", true)
            .limit(GIFT_BATTLE_CANDIDATE_LIMIT)
            .get();
        const candidates = eligibleSnapshot.docs
            .filter((snapshot) => eligibleListing(snapshot.data()))
            .map((snapshot) => {
                const listing = snapshot.data();
                return {
                    id: snapshot.id,
                    subcategory: String(listing.altKategori || listing.kategori || "").trim()
                };
            });
        const pair = selectPair(candidates, dateKey);
        if (!pair) return null;

        await firestore.runTransaction(async (transaction) => {
            const current = await transaction.get(battleRef);
            if (!current.exists) {
                transaction.create(battleRef, {
                    dateKey,
                    leftListingId: pair[0],
                    rightListingId: pair[1],
                    question,
                    leftVotes: 0,
                    rightVotes: 0,
                    createdAt: FieldValue.serverTimestamp()
                });
            }
        });
        battleSnapshot = await battleRef.get();
    }

    const battle = battleSnapshot.data();
    const [leftSnapshot, rightSnapshot] = await Promise.all([
        firestore.collection("ilanlar").doc(battle.leftListingId).get(),
        firestore.collection("ilanlar").doc(battle.rightListingId).get()
    ]);

    if (!leftSnapshot.exists || !rightSnapshot.exists
        || !eligibleListing(leftSnapshot.data()) || !eligibleListing(rightSnapshot.data())) {
        return null;
    }

    return { battleRef, battle, leftSnapshot, rightSnapshot };
}

exports.today = async (_req, res, next) => {
    try {
        const current = await withTimeout(createOrGetTodayBattle());
        if (!current) {
            return res.json({ success: true, battle: null, message: "Kapışma için yeterli uygun ürün bulunmuyor." });
        }
        return res.json({
            success: true,
            battle: resultPayload(current.battle, current.leftSnapshot, current.rightSnapshot)
        });
    } catch (error) {
        if (error.code === "GIFT_BATTLE_TIMEOUT") {
            console.error("Gift Battle today timeout", { code: error.code });
            return res.status(503).json({
                success: false,
                battle: null,
                code: "GIFT_BATTLE_TEMPORARILY_UNAVAILABLE",
                message: "Hediye Kapışması şu anda hazırlanıyor. Lütfen biraz sonra tekrar deneyin."
            });
        }
        next(error);
    }
};

exports.mine = async (req, res, next) => {
    try {
        const { dateKey } = istanbulDate();
        const [battleSnapshot, voteSnapshot] = await withTimeout(Promise.all([
            firestore.collection("giftBattles").doc(dateKey).get(),
            firestore.collection("giftBattleVotes").doc(voteDocumentId(dateKey, req.user.uid)).get()
        ]));
        const ownListingIds = [];
        if (battleSnapshot.exists) {
            const battle = battleSnapshot.data();
            const listingSnapshots = await Promise.all([
                firestore.collection("ilanlar").doc(battle.leftListingId).get(),
                firestore.collection("ilanlar").doc(battle.rightListingId).get()
            ]);
            listingSnapshots.forEach((snapshot) => {
                if (!snapshot.exists) return;
                const listing = snapshot.data();
                if (listing.sahipUid === req.user.uid || (req.user.email && listing.sahip === req.user.email)) {
                    ownListingIds.push(snapshot.id);
                }
            });
        }
        return res.json({
            success: true,
            dateKey,
            selectedListingId: voteSnapshot.exists ? voteSnapshot.data().selectedListingId : null,
            ownListingIds
        });
    } catch (error) {
        next(error);
    }
};

exports.vote = async (req, res, next) => {
    try {
        const selectedListingId = String(req.body?.selectedListingId || "").trim();
        if (!selectedListingId || selectedListingId.length > 1500) {
            return res.status(400).json({ success: false, message: "Geçersiz ürün seçimi." });
        }

        const { dateKey } = istanbulDate();
        const battleRef = firestore.collection("giftBattles").doc(dateKey);
        const voteRef = firestore.collection("giftBattleVotes").doc(voteDocumentId(dateKey, req.user.uid));

        await withTimeout(firestore.runTransaction(async (transaction) => {
            const battleSnapshot = await transaction.get(battleRef);
            if (!battleSnapshot.exists) throw Object.assign(new Error("Bugünün kapışması bulunamadı."), { status: 404 });
            const battle = battleSnapshot.data();
            if (![battle.leftListingId, battle.rightListingId].includes(selectedListingId)) {
                throw Object.assign(new Error("Seçilen ürün bugünün kapışmasında değil."), { status: 409 });
            }

            const listingRef = firestore.collection("ilanlar").doc(selectedListingId);
            const [listingSnapshot, voteSnapshot] = await Promise.all([
                transaction.get(listingRef),
                transaction.get(voteRef)
            ]);
            if (!listingSnapshot.exists || !eligibleListing(listingSnapshot.data())) {
                throw Object.assign(new Error("Bu ürün artık oylamaya uygun değil."), { status: 409 });
            }
            const listing = listingSnapshot.data();
            if (listing.sahipUid === req.user.uid || (req.user.email && listing.sahip === req.user.email)) {
                throw Object.assign(new Error("Kendi ürününüze oy veremezsiniz."), { status: 403 });
            }
            if (voteSnapshot.exists) {
                throw Object.assign(new Error("Bugünkü kapışmada oyunuzu zaten kullandınız."), { status: 409 });
            }

            transaction.create(voteRef, {
                dateKey,
                voterUid: req.user.uid,
                selectedListingId,
                createdAt: FieldValue.serverTimestamp()
            });
            transaction.update(battleRef, {
                [selectedListingId === battle.leftListingId ? "leftVotes" : "rightVotes"]: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp()
            });
        }));

        const current = await withTimeout(createOrGetTodayBattle());
        return res.status(201).json({
            success: true,
            selectedListingId,
            xp: null,
            battle: resultPayload(current.battle, current.leftSnapshot, current.rightSnapshot)
        });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

exports.istanbulDate = istanbulDate;
exports.eligibleListing = eligibleListing;
exports.selectPair = selectPair;
exports.withTimeout = withTimeout;
exports.GIFT_BATTLE_CANDIDATE_LIMIT = GIFT_BATTLE_CANDIDATE_LIMIT;

function communityError(error, res, next) {
    if (error?.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    return next(error);
}

exports.createCommunityBattle = async (req, res, next) => {
    try {
        const battle = await communityService.createBattle({ firestore, FieldValue, user: req.user, productIds: req.body?.productIds, question: req.body?.question });
        return res.status(201).json({ success: true, battle });
    } catch (error) { return communityError(error, res, next); }
};

exports.getCommunityBattle = async (req, res, next) => {
    try {
        const context = await communityService.loadBattleContext({ firestore, battleId: req.params.battleId, user: req.user || null });
        return res.json({ success: true, battle: context.battle });
    } catch (error) { return communityError(error, res, next); }
};

exports.feedCommunityBattles = async (req, res, next) => {
    try {
        const snapshot = await withTimeout(firestore.collection("communityGiftBattles").where("status", "==", communityService.STATUS.ACTIVE).limit(30).get());
        const now = Date.now();
        const battles = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }))
            .filter(({ data }) => data.expiresAt?.toDate?.().getTime() > now)
            .sort((a, b) => (Number(a.data.votesA || 0) + Number(a.data.votesB || 0)) - (Number(b.data.votesA || 0) + Number(b.data.votesB || 0)) || Math.random() - .5)
            .slice(0, Math.min(12, Math.max(1, Number(req.query.limit) || 8)))
            .map(({ id, data }) => communityService.publicBattle(id, data));
        return res.json({ success: true, battles });
    } catch (error) { return communityError(error, res, next); }
};

exports.voteCommunityBattle = async (req, res, next) => {
    try {
        const result = await communityService.voteBattle({ firestore, FieldValue, user: req.user, battleId: req.params.battleId, choice: String(req.body?.choice || "").toUpperCase() });
        return res.status(201).json({ success: true, ...result });
    } catch (error) { return communityError(error, res, next); }
};

exports.endCommunityBattle = async (req, res, next) => {
    try {
        const ref = firestore.collection("communityGiftBattles").doc(req.params.battleId);
        await firestore.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) throw new communityService.GiftBattleError("Kapışma bulunamadı.", 404, "NOT_FOUND");
            if (snap.data().ownerUid !== req.user.uid) throw new communityService.GiftBattleError("Bu kapışmayı bitirme yetkiniz yok.", 403, "FORBIDDEN");
            if (snap.data().status !== communityService.STATUS.ACTIVE) throw new communityService.GiftBattleError("Kapışma zaten sona ermiş.", 409, "NOT_ACTIVE");
            const guardRef = firestore.collection("communityGiftBattleOwnerGuards").doc(req.user.uid);
            const guardSnap = await tx.get(guardRef);
            tx.update(ref, { status: communityService.STATUS.ENDED, endedAt: FieldValue.serverTimestamp(), endReason: "OWNER_ENDED", updatedAt: FieldValue.serverTimestamp() });
            if (guardSnap.exists) tx.update(guardRef, { [`active.${req.params.battleId}`]: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
        });
        const context = await communityService.loadBattleContext({ firestore, battleId: req.params.battleId, user: req.user });
        return res.json({ success: true, battle: context.battle });
    } catch (error) { return communityError(error, res, next); }
};

exports.adminListCommunityBattles = async (_req, res, next) => {
    try {
        const snap = await firestore.collection("communityGiftBattles").limit(100).get();
        const battles = snap.docs.map((doc) => communityService.publicBattle(doc.id, doc.data(), { reveal: true }));
        return res.json({ success: true, battles });
    } catch (error) { return next(error); }
};

exports.adminRemoveCommunityBattle = async (req, res, next) => {
    try {
        const ref = firestore.collection("communityGiftBattles").doc(req.params.battleId);
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ success: false, message: "Kapışma bulunamadı." });
        await ref.update({ status: communityService.STATUS.REMOVED, endedAt: FieldValue.serverTimestamp(), endReason: "ADMIN_REMOVED", updatedAt: FieldValue.serverTimestamp() });
        if (snap.data().ownerUid) {
            const guardRef = firestore.collection("communityGiftBattleOwnerGuards").doc(snap.data().ownerUid);
            if ((await guardRef.get()).exists) await guardRef.update({ [`active.${req.params.battleId}`]: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
        }
        return res.json({ success: true });
    } catch (error) { return next(error); }
};
