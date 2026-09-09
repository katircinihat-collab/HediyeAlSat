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

module.exports = {
    buildApprovedListingState,
    hasAvailableStock,
    isDigitalListing,
    isListingPublished
};
