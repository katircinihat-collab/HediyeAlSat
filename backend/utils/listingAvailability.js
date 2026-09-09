const { inactiveStatuses } = require("../../shared/listingAvailability.json");

const INACTIVE_STATUSES = new Set(inactiveStatuses);

function normalizedStatus(value) {
    return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

function isListingPublished(listing) {
    if (!listing || listing.onay !== true) return false;
    if (listing.aktif === false || listing.yayinda === false) return false;
    return !INACTIVE_STATUSES.has(normalizedStatus(listing.durum));
}

module.exports = { isListingPublished };
