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

export const SPONSOR_TIER_PRIORITY = Object.freeze({ bronze: 1, gold: 2, diamond: 3 });

export function activeStoreSponsorMap(items, now = Date.now()) {
  return new Map((items || [])
    .filter((item) => item.placement === "sponsored_store" && item.storeId && isSponsorActive(item, now))
    .map((item) => [item.storeId, { ...item, priority: SPONSOR_TIER_PRIORITY[item.tier] || Number(item.priority || 0) }]));
}

export function sortStoresBySponsor(stores, sponsorMap) {
  return (stores || []).map((store, index) => ({ store, index }))
    .sort((a, b) => Number(sponsorMap.get(b.store.id)?.priority || 0) - Number(sponsorMap.get(a.store.id)?.priority || 0) || a.index - b.index)
    .map(({ store }) => store);
}

export function sponsorTierLabel(tier) {
  return tier === "diamond" ? "💎 Elmas Sponsor" : tier === "gold" ? "Altın Sponsor" : tier === "bronze" ? "Bronz Sponsor" : "Sponsorlu";
}
