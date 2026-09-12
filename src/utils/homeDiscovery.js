import { isA4Listing, isLegacySecondHandListing } from "../data/categories";
import { filterAvailableListings } from "./listingAvailability";
import { isListingBoostActive } from "./listingBoost";

export function listingDateMs(listing) {
  const value = listing?.tarih || listing?.createdAt || listing?.olusturmaTarihi;
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getNormalAvailableListings(listings) {
  return filterAvailableListings(listings)
    .filter((listing) => !isA4Listing(listing) && !isLegacySecondHandListing(listing));
}

export function getTopProducts(listings, limit = 10) {
  return getNormalAvailableListings(listings)
    .sort((left, right) => Number(right.impressionCount || 0) - Number(left.impressionCount || 0))
    .slice(0, limit);
}

export function getActiveBoostListings(listings, now = Date.now()) {
  return getNormalAvailableListings(listings)
    .filter((listing) => isListingBoostActive(listing, now))
    .sort((left, right) => listingDateMs(right) - listingDateMs(left));
}

export function getNewestProducts(listings, limit = 10) {
  return getNormalAvailableListings(listings)
    .sort((left, right) => listingDateMs(right) - listingDateMs(left))
    .slice(0, limit);
}
