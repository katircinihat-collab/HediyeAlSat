import availability from "../../shared/listingAvailability.json" with { type: "json" };

const INACTIVE_STATUSES = new Set(availability.inactiveStatuses);

function normalizedStatus(value) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

export function isListingPublished(listing) {
  if (!listing || listing.onay !== true) return false;
  if (listing.aktif === false || listing.yayinda === false) return false;
  return !INACTIVE_STATUSES.has(normalizedStatus(listing.durum));
}
