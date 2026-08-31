const { firestore } = require("../config/firebase");

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
