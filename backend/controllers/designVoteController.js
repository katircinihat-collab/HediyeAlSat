const { firestore, FieldValue } = require("../config/firebase");

function currentWeekKey(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function validDesign(listing) {
    return listing.urunTipi === "dijital"
        && listing.kategori === "A4 Tasarım"
        && listing.onay === true
        && listing.aktif === true;
}

function voteId(periodKey, listingId, uid) {
    return `${periodKey}_${listingId}_${uid}`;
}

exports.top = async (req, res, next) => {
    try {
        const requestedLimit = Number(req.query.limit || 10);
        const limit = Math.min(10, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 10));
        const periodKey = currentWeekKey();
        const [votes, eligibleListings] = await Promise.all([
            firestore.collection("tasarimOylari")
                .where("periodKey", "==", periodKey)
                .get(),
            firestore.collection("ilanlar")
                .where("urunTipi", "==", "dijital")
                .where("kategori", "==", "A4 Tasarım")
                .where("onay", "==", true)
                .where("aktif", "==", true)
                .get()
        ]);
        const counts = new Map();

        votes.forEach((vote) => {
            const listingId = vote.data().listingId;
            if (typeof listingId === "string") counts.set(listingId, (counts.get(listingId) || 0) + 1);
        });

        const ranked = eligibleListings.docs
            .map((snap) => ({
                listingId: snap.id,
                listing: snap.data(),
                oySayisi: counts.get(snap.id) || 0
            }))
            .filter(({ listing }) => validDesign(listing))
            .sort((a, b) => b.oySayisi - a.oySayisi || a.listingId.localeCompare(b.listingId));
        const designs = ranked
            .slice(0, limit)
            .map(({ listingId, listing, oySayisi }, index) => {
                return {
                    id: listingId,
                    sira: index + 1,
                    baslik: listing.baslik || "İsimsiz tasarım",
                    resim: listing.resim || listing.resimler?.[0] || "",
                    fiyat: Number(listing.fiyat || 0),
                    magazaAdi: listing.magazaAdi || "",
                    oySayisi
                };
            });

        res.json({ success: true, periodKey, designs });
    } catch (error) {
        next(error);
    }
};

exports.mine = async (req, res, next) => {
    try {
        const periodKey = currentWeekKey();
        const votes = await firestore.collection("tasarimOylari")
            .where("voterUid", "==", req.user.uid)
            .get();
        res.json({
            success: true,
            periodKey,
            listingIds: votes.docs
                .filter((doc) => doc.data().periodKey === periodKey)
                .map((doc) => doc.data().listingId)
        });
    } catch (error) {
        next(error);
    }
};

exports.summary = async (req, res, next) => {
    try {
        const listingIds = Array.isArray(req.body?.listingIds)
            ? [...new Set(req.body.listingIds.filter((id) => typeof id === "string" && id.length > 0 && id.length <= 1500))]
            : [];
        if (listingIds.length > 200) {
            return res.status(400).json({ success: false, message: "Tek istekte en fazla 200 tasarım sorgulanabilir." });
        }

        const periodKey = currentWeekKey();
        const requested = new Set(listingIds);
        const counts = Object.fromEntries(listingIds.map((id) => [id, 0]));
        if (listingIds.length) {
            const votes = await firestore.collection("tasarimOylari")
                .where("periodKey", "==", periodKey)
                .get();
            votes.forEach((vote) => {
                const listingId = vote.data().listingId;
                if (requested.has(listingId)) counts[listingId] += 1;
            });
        }

        return res.json({ success: true, periodKey, counts });
    } catch (error) {
        next(error);
    }
};

exports.create = async (req, res, next) => {
    try {
        const listingId = String(req.params.listingId || "").trim();
        if (!listingId || listingId.length > 1500) return res.status(400).json({ success: false, message: "Geçersiz tasarım." });
        const periodKey = currentWeekKey();
        const listingRef = firestore.collection("ilanlar").doc(listingId);
        const ref = firestore.collection("tasarimOylari").doc(voteId(periodKey, listingId, req.user.uid));

        await firestore.runTransaction(async (transaction) => {
            const [listingSnap, voteSnap] = await Promise.all([transaction.get(listingRef), transaction.get(ref)]);
            if (!listingSnap.exists || !validDesign(listingSnap.data())) throw Object.assign(new Error("Bu tasarım oylamaya uygun değil."), { status: 409 });
            const listing = listingSnap.data();
            if (listing.sahipUid === req.user.uid || (req.user.email && listing.sahip === req.user.email)) {
                throw Object.assign(new Error("Kendi tasarımınıza oy veremezsiniz."), { status: 403 });
            }
            if (voteSnap.exists) throw Object.assign(new Error("Bu tasarıma bu hafta zaten oy verdiniz."), { status: 409 });
            transaction.create(ref, { listingId, voterUid: req.user.uid, periodKey, createdAt: FieldValue.serverTimestamp() });
        });

        res.status(201).json({ success: true, listingId, periodKey });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

exports.remove = async (req, res, next) => {
    try {
        const listingId = String(req.params.listingId || "").trim();
        const periodKey = currentWeekKey();
        const ref = firestore.collection("tasarimOylari").doc(voteId(periodKey, listingId, req.user.uid));
        await firestore.runTransaction(async (transaction) => {
            const snap = await transaction.get(ref);
            if (!snap.exists) throw Object.assign(new Error("Geri alınacak oy bulunamadı."), { status: 404 });
            if (snap.data().voterUid !== req.user.uid) throw Object.assign(new Error("Bu oyu geri alamazsınız."), { status: 403 });
            transaction.delete(ref);
        });
        res.json({ success: true, listingId, periodKey });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

exports.currentWeekKey = currentWeekKey;
