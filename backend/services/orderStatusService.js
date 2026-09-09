const { ORDER_STATUSES, normalizeOrderStatus } = require("../constants/orderStatuses");

class OrderStatusError extends Error {
    constructor(message, status = 400, code = "ORDER_STATUS_INVALID") {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function sanitizeCargoText(value, fieldName, maxLength) {
    if (typeof value !== "string") throw new OrderStatusError(`${fieldName} gereklidir.`);
    const clean = value.trim().replace(/[<>]/g, "");
    if (!clean || clean.length > maxLength) throw new OrderStatusError(`${fieldName} geçersiz.`);
    return clean;
}

function isDigitalOrder(order, listing) {
    const source = listing || order;
    return source?.urunTipi === "dijital"
        || source?.fizikselKargo === false
        || source?.dijitalTeslimat === true
        || order?.teslimatTipi === "dijital";
}

function validateSellerTransition(order, requestedStatus, listing = null) {
    if (!order) throw new OrderStatusError("Sipariş bulunamadı.", 404, "ORDER_NOT_FOUND");
    if (order.odemeDurumu !== true) throw new OrderStatusError("Ödemesi alınmamış sipariş güncellenemez.", 409, "ORDER_NOT_PAID");
    if (isDigitalOrder(order, listing)) {
        throw new OrderStatusError("Dijital siparişler fiziksel hazırlama veya kargo durumlarına geçirilemez.", 409, "DIGITAL_SHIPPING_FORBIDDEN");
    }

    const current = normalizeOrderStatus(order.durum);
    const requested = normalizeOrderStatus(requestedStatus);
    const allowed = (current === ORDER_STATUSES.ODEME_ALINDI && requested === ORDER_STATUSES.HAZIRLANIYOR)
        || (current === ORDER_STATUSES.HAZIRLANIYOR && requested === ORDER_STATUSES.KARGODA);
    if (!allowed) throw new OrderStatusError("Bu sipariş durum geçişine izin verilmiyor.", 403, "TRANSITION_FORBIDDEN");
    return { current, requested };
}

function sellerOwnsOrder(order, user) {
    return Boolean(order && user && (
        (user.uid && order.saticiUid === user.uid)
        || (user.email && order.satici === user.email)
    ));
}

function buildSellerStatusUpdate(order, body, FieldValue, listing = null) {
    const { requested } = validateSellerTransition(order, body.durum, listing);
    const update = { durum: requested, guncellenmeTarihi: FieldValue.serverTimestamp() };
    if (requested === ORDER_STATUSES.KARGODA) {
        update.kargoFirma = sanitizeCargoText(body.kargoFirma, "Kargo firması", 80);
        update.kargoNo = sanitizeCargoText(body.kargoNo, "Takip numarası", 120);
        update.kargoTarihi = FieldValue.serverTimestamp();
    }
    return update;
}

module.exports = { OrderStatusError, sellerOwnsOrder, isDigitalOrder, validateSellerTransition, buildSellerStatusUpdate };
