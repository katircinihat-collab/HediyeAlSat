export const IMPRESSION_VISIBILITY_RATIO = 0.5;
export const IMPRESSION_DWELL_MS = 1500;

export function impressionSessionKey(listingId) {
  return `hediyealsat_impression_${listingId}`;
}

export function formatImpressionCount(value) {
  const count = Math.max(0, Number(value) || 0);
  if (count < 1000) return String(Math.floor(count));
  if (count < 100000) {
    return `${(count / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} B`;
  }
  return `${Math.round(count / 1000).toLocaleString("tr-TR")} B`;
}
