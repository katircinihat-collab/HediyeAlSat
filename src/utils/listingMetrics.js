export function getListingImpressionCount(listing = {}) {
  const candidates = [listing.impressionCount, listing.goruntulenme, listing.views];
  for (const value of candidates) {
    const count = Number(value);
    if (Number.isFinite(count) && count >= 0) return count;
  }
  return 0;
}
