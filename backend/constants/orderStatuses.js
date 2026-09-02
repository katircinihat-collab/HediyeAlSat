const ORDER_STATUSES = Object.freeze({
    ODEME_BEKLENIYOR: "Ödeme Bekleniyor",
    ODEME_ALINDI: "Ödendi",
    HAZIRLANIYOR: "Hazırlanıyor",
    KARGODA: "Kargoda",
    TESLIM_EDILDI: "Teslim Edildi",
    IPTAL: "İptal",
    IADE: "İade"
});

const LEGACY_STATUS_MAP = Object.freeze({
    Bekliyor: ORDER_STATUSES.ODEME_ALINDI,
    "Kargoya Verildi": ORDER_STATUSES.KARGODA,
    Teslim: ORDER_STATUSES.TESLIM_EDILDI
});

function normalizeOrderStatus(status) {
    return LEGACY_STATUS_MAP[status] || status;
}

module.exports = { ORDER_STATUSES, normalizeOrderStatus };
