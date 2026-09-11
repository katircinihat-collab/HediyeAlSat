import config from "../../shared/listingBoostPackages.json" with { type: "json" };

export const LISTING_BOOST_PACKAGES = Object.freeze(config.packages.map((item) => Object.freeze({ ...item })));

function timestampMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isListingBoostActive(listing, now = Date.now()) {
  return listing?.boostActive === true && timestampMs(listing.boostEndAt) > now;
}

export function sortListingsByBoost(listings, now = Date.now()) {
  return [...(listings || [])].sort((left, right) => {
    const activeDifference = Number(isListingBoostActive(right, now)) - Number(isListingBoostActive(left, now));
    if (activeDifference) return activeDifference;
    return timestampMs(right.tarih) - timestampMs(left.tarih);
  });
}

export function listingBoostEndDate(listing) {
  const value = timestampMs(listing?.boostEndAt);
  return value ? new Date(value) : null;
}
