const { firestore, FieldValue } = require("../config/firebase");
const { OrderStatusError } = require("../services/orderStatusService");
const { inspectSellerAttempt, archiveSellerAttempt } = require("../services/sellerOrderArchiveService");

function fail(res, error) {
    return res.status(error instanceof OrderStatusError ? error.status : 500).json({ success: false, message: error instanceof OrderStatusError ? error.message : "Kayıt temizleme işlemi şu anda tamamlanamıyor." });
}

exports.preview = async (req, res) => {
    try {
        const ids = req.body?.orderIds;
        if (!Array.isArray(ids) || ids.length > 40 || ids.some((id) => typeof id !== "string" || !id || id.length > 150 || id.includes("/"))) throw new OrderStatusError("En fazla 40 geçerli sipariş seçilebilir.");
        const pending = [...new Set(ids)];
        const eligibility = {};
        await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
            while (pending.length) {
                const orderId = pending.shift();
                try { eligibility[orderId] = (await inspectSellerAttempt({ firestore, orderId, user: req.user })).eligible; }
                catch (error) { if (![403, 404].includes(error.status)) throw error; eligibility[orderId] = false; }
            }
        }));
        return res.json({ success: true, eligibility });
    } catch (error) { return fail(res, error); }
};

exports.archive = async (req, res) => {
    try {
        const result = await archiveSellerAttempt({ firestore, FieldValue, orderId: req.params.orderId, user: req.user });
        return res.json({ success: true, ...result });
    } catch (error) { return fail(res, error); }
};
