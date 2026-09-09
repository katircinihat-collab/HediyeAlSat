import { isListingPublished, isDigitalListing } from "./listingAvailability.js";

export const SPONSOR_PLACEMENTS = Object.freeze([
  "middle_banner",
  "sponsored_product",
  "sponsored_store",
  "lower_banner"
]);

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function isSponsorActive(item, now = Date.now()) {
  if (!item || item.active !== true || !SPONSOR_PLACEMENTS.includes(item.placement)) {
    return false;
  }

  const startAt = toMillis(item.startAt);
  const endAt = toMillis(item.endAt);
  return (startAt === null || startAt <= now) && (endAt === null || endAt >= now);
}

export function selectSponsoredContent(items, now = Date.now(), limit = 4) {
  const selectedPlacements = new Set();

  return [...(items || [])]
    .filter((item) => isSponsorActive(item, now))
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))
    .filter((item) => {
      if (selectedPlacements.has(item.placement)) return false;
      selectedPlacements.add(item.placement);
      return true;
    })
    .slice(0, Math.min(4, Math.max(0, limit)));
}

export function mapSponsorsByPlacement(items) {
  return Object.fromEntries((items || []).map((item) => [item.placement, item]));
}

export function isEligibleSponsoredProduct(product) {
  if (!isListingPublished(product)) return false;
  return isDigitalListing(product) || Number(product.stok ?? product.adet ?? 1) > 0;
}

export function isEligibleSponsoredStore(store) {
  return Boolean(store) && store.aktif !== false;
}
