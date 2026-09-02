const { firestore, FieldValue } = require("../config/firebase");
const { OrderStatusError, sellerOwnsOrder, buildSellerStatusUpdate } = require("../services/orderStatusService");

exports.updateSellerStatus = async (req, res) => {
    try {
        const orderId = String(req.params.orderId || "").trim();
        if (!orderId) throw new OrderStatusError("Sipariş kimliği geçersiz.");
        const result = await firestore.runTransaction(async (transaction) => {
            const ref = firestore.collection("siparisler").doc(orderId);
            const snapshot = await transaction.get(ref);
            if (!snapshot.exists) throw new OrderStatusError("Sipariş bulunamadı.", 404, "ORDER_NOT_FOUND");
            const order = snapshot.data();
            if (!sellerOwnsOrder(order, req.user)) throw new OrderStatusError("Bu siparişi güncelleme yetkiniz yok.", 403, "ORDER_FORBIDDEN");
            const update = buildSellerStatusUpdate(order, req.body || {}, FieldValue);
            transaction.update(ref, update);
            return update;
        });
        return res.json({ success: true, durum: result.durum });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            code: error.code || "ORDER_STATUS_UPDATE_FAILED",
            message: error instanceof OrderStatusError ? error.message : "Sipariş durumu güncellenemedi."
        });
    }
};
