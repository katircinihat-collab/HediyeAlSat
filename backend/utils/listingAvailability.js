const { inactiveStatuses } = require("../../shared/listingAvailability.json");

const INACTIVE_STATUSES = new Set(inactiveStatuses);

function normalizedStatus(value) {
    return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

function isDigitalListing(listing) {
    return listing?.urunTipi === "dijital"
        || listing?.fizikselKargo === false
        || listing?.dijitalTeslimat === true;
}

function hasAvailableStock(listing) {
    if (isDigitalListing(listing)) return true;

    const rawStock = listing?.stok ?? listing?.adet;
    if (rawStock === undefined || rawStock === null || rawStock === "") return true;

    const stock = Number(rawStock);
    return Number.isFinite(stock) && stock > 0;
}

function isListingPublished(listing) {
    if (!listing || listing.onay !== true) return false;
    if (listing.aktif === false || listing.yayinda === false) return false;
    if (INACTIVE_STATUSES.has(normalizedStatus(listing.durum))) return false;
    return hasAvailableStock(listing);
}

function buildApprovedListingState({ timestamp, adminUid }) {
    return {
        onay: true,
        aktif: true,
        yayinda: true,
        durum: "Yayında",
        onayTarihi: timestamp,
        onaylayanUid: adminUid
    };
}

function listingStockValue(value) {
    const stock = Number(value);
    if (!Number.isInteger(stock) || stock < 0) {
        const error = new Error("Stok sıfır veya pozitif bir tam sayı olmalıdır.");
        error.status = 400;
        error.code = "INVALID_LISTING_STOCK";
        throw error;
    }
    return stock;
}

function buildListingStockUpdate({ listing, stock, timestamp, adminUid }) {
    const normalizedStock = listingStockValue(stock);
    const update = {
        stok: normalizedStock,
        stokGuncellemeTarihi: timestamp,
        stokGuncelleyenUid: adminUid
    };

    if (!isDigitalListing(listing) && normalizedStock === 0) {
        Object.assign(update, {
            aktif: false,
            yayinda: false,
            durum: "Stok Tükendi"
        });
    }

    return update;
}

function buildPublishedListingState({ listing, timestamp, adminUid }) {
    if (!isDigitalListing(listing) && !hasAvailableStock(listing)) {
        const error = new Error("İlanı yayınlamadan önce fiziksel ürün stoğunu girin.");
        error.status = 409;
        error.code = "LISTING_OUT_OF_STOCK";
        throw error;
    }
    return buildApprovedListingState({ timestamp, adminUid });
}

function buildUnpublishedListingState({ timestamp, adminUid }) {
    return {
        aktif: false,
        yayinda: false,
        durum: "Yayından Kaldırıldı",
        durumGuncellemeTarihi: timestamp,
        durumGuncelleyenUid: adminUid
    };
}

module.exports = {
    buildApprovedListingState,
    buildListingStockUpdate,
    buildPublishedListingState,
    buildUnpublishedListingState,
    hasAvailableStock,
    isDigitalListing,
    isListingPublished
};
