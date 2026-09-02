const { firestore, FieldValue } = require("../config/firebase");
const { OrderStatusError, sellerOwnsOrder, buildSellerStatusUpdate } = require("../services/orderStatusService");
const { DeliveryConfirmationError, confirmDelivery } = require("../services/deliveryConfirmationService");

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

exports.confirmDeliveryAsBuyer = async (req, res) => {
    try {
        const result = await confirmDelivery({
            firestore,
            orderId: String(req.params.orderId || "").trim(),
            actor: { type: "alici", uid: req.user.uid, email: req.user.email }
        });
        return res.json({ success: true, idempotent: result.idempotent, durum: "Teslim Edildi" });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, code: error.code || "DELIVERY_CONFIRMATION_FAILED", message: error instanceof DeliveryConfirmationError ? error.message : "Teslimat doğrulanamadı." });
    }
};

exports.confirmDeliveryAsAdmin = async (req, res) => {
    try {
        const result = await confirmDelivery({
            firestore,
            orderId: String(req.params.orderId || "").trim(),
            actor: { type: "admin", uid: req.user.uid, email: req.user.email }
        });
        return res.json({ success: true, idempotent: result.idempotent, durum: "Teslim Edildi" });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, code: error.code || "DELIVERY_CONFIRMATION_FAILED", message: error instanceof DeliveryConfirmationError ? error.message : "Teslimat doğrulanamadı." });
    }
};
