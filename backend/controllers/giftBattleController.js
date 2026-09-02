const { firestore, FieldValue } = require("../config/firebase");

const QUESTIONS = [
    "Sen hangisini hediye ederdin?",
    "Sevgiline hangisini hediye ederdin?",
    "Babana hangisini hediye ederdin?",
    "Annene hangisini hediye ederdin?",
    "Arkadaşına hangisini hediye ederdin?",
    "Eşine hangisini hediye ederdin?",
    "Doğum gününde hangisini hediye ederdin?"
];

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
        const current = await createOrGetTodayBattle();
        if (!current) {
            return res.json({ success: true, battle: null, message: "Kapışma için yeterli uygun ürün bulunmuyor." });
        }
        return res.json({
            success: true,
            battle: resultPayload(current.battle, current.leftSnapshot, current.rightSnapshot)
        });
    } catch (error) {
        next(error);
    }
};

exports.mine = async (req, res, next) => {
    try {
        const { dateKey } = istanbulDate();
        const [battleSnapshot, voteSnapshot] = await Promise.all([
            firestore.collection("giftBattles").doc(dateKey).get(),
            firestore.collection("giftBattleVotes").doc(voteDocumentId(dateKey, req.user.uid)).get()
        ]);
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

        await firestore.runTransaction(async (transaction) => {
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
        });

        const current = await createOrGetTodayBattle();
        return res.status(201).json({
            success: true,
            selectedListingId,
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
