import availability from "../../shared/listingAvailability.json" with { type: "json" };

const INACTIVE_STATUSES = new Set(availability.inactiveStatuses);

function normalizedStatus(value) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR");
}

export function isDigitalListing(listing) {
  return listing?.urunTipi === "dijital"
    || listing?.fizikselKargo === false
    || listing?.dijitalTeslimat === true;
}

export function hasAvailableStock(listing) {
  if (isDigitalListing(listing)) return true;

  const rawStock = listing?.stok ?? listing?.adet;
  if (rawStock === undefined || rawStock === null || rawStock === "") return true;

  const stock = Number(rawStock);
  return Number.isFinite(stock) && stock > 0;
}

export function isListingPublished(listing) {
  if (!listing || listing.onay !== true) return false;
  if (listing.aktif === false || listing.yayinda === false) return false;
  if (INACTIVE_STATUSES.has(normalizedStatus(listing.durum))) return false;
  return hasAvailableStock(listing);
}

export function filterAvailableListings(listings) {
  return (listings || []).filter(isListingPublished);
}
