import { isA4Listing } from "../data/categories";
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

export function getActiveBoostListings(listings, now = Date.now()) {
  return filterAvailableListings(listings)
    .filter((listing) => isListingBoostActive(listing, now))
    .sort((left, right) => listingDateMs(right) - listingDateMs(left));
}

export function getNewestDesigns(listings, limit = 10) {
  return filterAvailableListings(listings)
    .filter(isA4Listing)
    .sort((left, right) => listingDateMs(right) - listingDateMs(left))
    .slice(0, limit);
}

export function getAvailableRankedDesigns(rankedDesigns, listings, limit = 10) {
  const availableById = new Map(filterAvailableListings(listings).map((listing) => [listing.id, listing]));
  return (rankedDesigns || [])
    .filter((design) => availableById.has(design.id) && isA4Listing(availableById.get(design.id)))
    .slice(0, limit);
}
