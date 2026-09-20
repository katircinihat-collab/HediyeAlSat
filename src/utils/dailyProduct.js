import { isListingPublished } from "./listingAvailability.js";

export function istanbulDayKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectDailyProduct(listings, now = new Date()) {
  const eligible = (listings || [])
    .filter((listing) => listing?.id && isListingPublished(listing))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (!eligible.length) return null;
  const dayKey = istanbulDayKey(now);
  return eligible[stableHash(dayKey) % eligible.length];
}
