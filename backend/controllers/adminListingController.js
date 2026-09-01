const { firestore, FieldValue } = require("../config/firebase");

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

    return ref;
}

exports.me = (_req, res) => {
    res.json({
        success: true,
        admin: true
    });
};

exports.onayla = async (req, res, next) => {
    try {
        const ref = await ilanGetir(req.params.id, res);
        if (!ref) return;

        const snap = await ref.get();
        const listing = snap.data();
        if (listing.urunTipi === "dijital" && listing.dijitalDosyaDurumu !== "hazir") {
            return res.status(409).json({
                success: false,
                message: "Korumalı orijinal dosyası hazır olmayan dijital ilan onaylanamaz."
            });
        }

        await ref.update({ onay: true });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

exports.reddet = async (req, res, next) => {
    try {
        const ref = await ilanGetir(req.params.id, res);
        if (!ref) return;

        await ref.update({ onay: false });
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

        const ref = await ilanGetir(req.params.id, res);
        if (!ref) return;

        await ref.update({ [alan]: deger });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

exports.sil = async (req, res, next) => {
    try {
        const ref = await ilanGetir(req.params.id, res);
        if (!ref) return;

        await ref.delete();
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

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

        return res.json({
            success: true,
            storeId,
            aktif
        });
    } catch (error) {
        next(error);
    }
};
