const { firestore, FieldValue } = require("../config/firebase");
const {
    buildArchivedListingState,
    buildListingStockUpdate,
    buildPublishedListingState,
    buildUnpublishedListingState,
    isDigitalListing,
    isListingPublished
} = require("../utils/listingAvailability");
const { validatePublicContent } = require("../services/publicContentModerationService");
const { recordAdminAction } = require("../services/adminAuditService");

const ADMIN_FLAGS = new Set([
    "oneCikan",
    "trend",
    "kampanyali"
]);

async function ilanGetir(id, res) {
    const ref = firestore.collection("ilanlar").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
        res.status(404).json({
            success: false,
            message: "İlan bulunamadı."
        });
        return null;
    }

    return { ref, snap };
}

function actionError(message, status = 400, code = "INVALID_LISTING_ACTION") {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
}

function text(value, label, maxLength) {
    const normalized = String(value ?? "").trim();
    if (!normalized || normalized.length > maxLength) {
        throw actionError(`${label} geçersiz.`);
    }
    return normalized;
}

function buildAdminEditUpdate(listing, body, timestamp, adminUid) {
    if (listing?.silindi === true) throw actionError("Arşivlenmiş ilan düzenlenemez.", 409, "LISTING_ARCHIVED");
    const price = Number(body.fiyat);
    if (!Number.isFinite(price) || price <= 0) throw actionError("Fiyat sıfırdan büyük olmalıdır.");
    const images = Array.isArray(body.resimler)
        ? body.resimler.filter((item) => typeof item === "string" && item.trim()).slice(0, 10)
        : listing.resimler || [];
    return {
        baslik: text(body.baslik, "İlan başlığı", 160),
        fiyat: price,
        aciklama: validatePublicContent(body.aciklama || ""),
        kategori: text(body.kategori || listing.kategori, "Kategori", 120),
        marka: String(body.marka || "").trim().slice(0, 100),
        renk: String(body.renk || "").trim().slice(0, 100),
        resimler: images,
        resim: typeof body.resim === "string" ? body.resim.trim() : (images[0] || listing.resim || ""),
        ilanGuncellemeTarihi: timestamp,
        ilanGuncelleyenUid: adminUid
    };
}

exports.me = (_req, res) => {
    res.json({
        success: true,
        admin: true
    });
};

exports.list = async (_req, res, next) => {
    try {
        const snapshot = await firestore.collection("ilanlar").limit(200).get();
        return res.json({
            success: true,
            listings: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        });
    } catch (error) {
        next(error);
    }
};

exports.onayla = async (req, res, next) => {
    try {
        const found = await ilanGetir(req.params.id, res);
        if (!found) return;
        const { ref, snap } = found;
        const listing = snap.data();
        if (listing.silindi === true) throw actionError("Arşivlenmiş ilan onaylanamaz.", 409, "LISTING_ARCHIVED");
        if (isListingPublished(listing)) return res.json({ success: true, changed: false });
        if (isDigitalListing(listing) && listing.dijitalDosyaDurumu !== "hazir") {
            return res.status(409).json({
                success: false,
                message: "Korumalı orijinal dosyası hazır olmayan dijital ilan onaylanamaz."
            });
        }

        await ref.update(buildPublishedListingState({
            listing,
            timestamp: FieldValue.serverTimestamp(),
            adminUid: req.user.uid
        }));
        await recordAdminAction({ adminUser: req.user, action: "LISTING_APPROVED", targetType: "listing", targetId: req.params.id });
        res.json({ success: true });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
        next(error);
    }
};

exports.stokGuncelle = async (req, res, next) => {
    try {
        const found = await ilanGetir(req.params.id, res);
        if (!found) return;
        const { ref, snap } = found;
        if (snap.data().silindi === true) throw actionError("Arşivlenmiş ilanın stoğu değiştirilemez.", 409, "LISTING_ARCHIVED");
        if (Number(snap.data().stok ?? snap.data().adet ?? 0) === Number(req.body.stok)) {
            return res.json({ success: true, changed: false, stok: Number(req.body.stok) });
        }
        const update = buildListingStockUpdate({
            listing: snap.data(),
            stock: req.body.stok,
            timestamp: FieldValue.serverTimestamp(),
            adminUid: req.user.uid
        });
        await ref.update(update);
        await recordAdminAction({ adminUser: req.user, action: "LISTING_STOCK_UPDATED", targetType: "listing", targetId: req.params.id, details: { stock: update.stok } });
        return res.json({ success: true, stok: update.stok });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
        next(error);
    }
};

exports.yayinDurumuGuncelle = async (req, res, next) => {
    try {
        if (typeof req.body.published !== "boolean") {
            return res.status(400).json({ success: false, message: "Geçersiz yayın durumu." });
        }
        const found = await ilanGetir(req.params.id, res);
        if (!found) return;
        const { ref, snap } = found;
        const listing = snap.data();

        if (req.body.published && listing.onay !== true) {
            return res.status(409).json({ success: false, code: "LISTING_NOT_APPROVED", message: "Yalnız onaylı ilanlar yayınlanabilir." });
        }
        if (isListingPublished(listing) === req.body.published) {
            return res.json({ success: true, changed: false, published: req.body.published });
        }

        if (req.body.published && isDigitalListing(listing) && listing.dijitalDosyaDurumu !== "hazir") {
            return res.status(409).json({ success: false, message: "Korumalı orijinal dosyası hazır olmayan dijital ilan yayınlanamaz." });
        }

        const timestamp = FieldValue.serverTimestamp();
        const update = req.body.published
            ? buildPublishedListingState({ listing, timestamp, adminUid: req.user.uid })
            : buildUnpublishedListingState({ timestamp, adminUid: req.user.uid });
        await ref.update(update);
        await recordAdminAction({ adminUser: req.user, action: req.body.published ? "LISTING_PUBLISHED" : "LISTING_UNPUBLISHED", targetType: "listing", targetId: req.params.id });
        return res.json({ success: true, published: req.body.published });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
        next(error);
    }
};

exports.reddet = async (req, res, next) => {
    try {
        const found = await ilanGetir(req.params.id, res);
        if (!found) return;
        const { ref, snap } = found;
        if (snap.data().silindi === true) throw actionError("Arşivlenmiş ilan reddedilemez.", 409, "LISTING_ARCHIVED");

        await ref.update({
            onay: false,
            aktif: false,
            yayinda: false,
            durum: "Reddedildi",
            durumGuncellemeTarihi: FieldValue.serverTimestamp(),
            durumGuncelleyenUid: req.user.uid
        });
        await recordAdminAction({ adminUser: req.user, action: "LISTING_REJECTED", targetType: "listing", targetId: req.params.id });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

exports.ozellikDegistir = async (req, res, next) => {
    try {
        const { alan, deger } = req.body;

        if (!ADMIN_FLAGS.has(alan) || typeof deger !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Geçersiz ilan özelliği."
            });
        }

        const found = await ilanGetir(req.params.id, res);
        if (!found) return;
        const { ref, snap } = found;
        const listing = snap.data();
        if (deger && !isListingPublished(listing)) {
            return res.status(409).json({ success: false, code: "LISTING_NOT_PUBLISHED", message: "Yalnız yayındaki ilanlar öne çıkarılabilir." });
        }
        if (listing[alan] === deger) return res.json({ success: true, changed: false, alan, deger });

        await ref.update({
            [alan]: deger,
            ozellikGuncellemeTarihi: FieldValue.serverTimestamp(),
            ozellikGuncelleyenUid: req.user.uid
        });
        await recordAdminAction({ adminUser: req.user, action: "LISTING_FLAG_UPDATED", targetType: "listing", targetId: req.params.id, details: { field: alan, enabled: deger } });
        res.json({ success: true, changed: true, alan, deger });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
        next(error);
    }
};

exports.duzenle = async (req, res, next) => {
    try {
        const found = await ilanGetir(req.params.id, res);
        if (!found) return;
        const { ref, snap } = found;
        const update = buildAdminEditUpdate(snap.data(), req.body, FieldValue.serverTimestamp(), req.user.uid);
        const comparable = Object.entries(update).filter(([key]) => !["ilanGuncellemeTarihi", "ilanGuncelleyenUid"].includes(key));
        if (comparable.every(([key, value]) => JSON.stringify(snap.data()[key] ?? "") === JSON.stringify(value ?? ""))) {
            return res.json({ success: true, changed: false });
        }
        await ref.update(update);
        await recordAdminAction({ adminUser: req.user, action: "LISTING_UPDATED", targetType: "listing", targetId: req.params.id });
        return res.json({ success: true, changed: true });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, code: error.code, message: error.message });
        next(error);
    }
};

exports.sil = async (req, res, next) => {
    try {
        const found = await ilanGetir(req.params.id, res);
        if (!found) return;
        const { ref, snap } = found;
        if (snap.data().silindi === true) return res.json({ success: true, changed: false, archived: true });
        await ref.update(buildArchivedListingState({ timestamp: FieldValue.serverTimestamp(), adminUid: req.user.uid }));
        await recordAdminAction({ adminUser: req.user, action: "LISTING_ARCHIVED", targetType: "listing", targetId: req.params.id });
        res.json({ success: true, changed: true, archived: true });
    } catch (error) {
        next(error);
    }
};

exports._test = { buildAdminEditUpdate };

exports.magazaDurumuGuncelle = async (req, res, next) => {
    try {
        const storeId = String(req.params.id || "").trim();
        const { aktif } = req.body;

        if (!storeId || storeId.length > 1500 || typeof aktif !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Geçersiz mağaza veya durum bilgisi."
            });
        }

        const ref = firestore.collection("magazalar").doc(storeId);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                message: "Mağaza bulunamadı."
            });
        }

        await ref.update({
            aktif,
            durumGuncellemeTarihi: FieldValue.serverTimestamp(),
            durumGuncelleyen: req.user.email || req.user.uid
        });
        await recordAdminAction({ adminUser: req.user, action: aktif ? "STORE_ENABLED" : "STORE_DISABLED", targetType: "store", targetId: storeId });

        return res.json({
            success: true,
            storeId,
            aktif
        });
    } catch (error) {
        next(error);
    }
};
