import { normalizeGiftTaxonomy, taxonomy } from './giftTaxonomy.js';
import { isListingPublished, isDigitalListing } from '../utils/listingAvailability.js';
import { isLegacySecondHandListing } from '../data/categories.js';

const normalize = value => String(value || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, ' ').trim();
const contains = (haystack, needle) => (' ' + haystack + ' ').includes(' ' + normalize(needle) + ' ');
export function listingGiftAttributes(listing) {
  const attributes = normalizeGiftTaxonomy(listing);
  // Explicit fields (including []) win. Legacy inference uses only public title/category/tags,
  // never description, private profile data or a product-specific exception.
  const words = normalize([listing.baslik, listing.kategori, listing.altKategori, ...(Array.isArray(listing.tags) ? listing.tags.filter(x => typeof x === 'string') : [])].join(' '));
  for (const [field, values] of Object.entries(taxonomy)) {
    if (Object.hasOwn(listing, field)) continue;
    attributes[field] = Object.entries(values).filter(([id, label]) => contains(words, label) || contains(words, id)).map(([id]) => id);
  }
  if (!Object.hasOwn(listing, 'giftStyles') && isDigitalListing(listing)) attributes.giftStyles.push('dijital');
  if (!Object.hasOwn(listing, 'ozelGunler') && typeof listing.ozelGun === 'string') {
    attributes.ozelGunler = normalizeGiftTaxonomy({ ozelGunler: [listing.ozelGun] }).ozelGunler;
  }
  return attributes;
}
export function matchesListingToSeoPage(listing, page) {
  if (!page?.enabled || !page.indexable || !page.showcaseEnabled || !isListingPublished(listing)
    || listing.silindi === true || listing.deleted === true || listing.yasakli === true || isLegacySecondHandListing(listing)) return false;
  const price = Number(listing.fiyat ?? listing.price);
  if (!Number.isFinite(price) || price <= 0 || (page.maxPrice && price > page.maxPrice)) return false;
  const attributes = listingGiftAttributes(listing);
  return [['recipients', 'hedefKisiler'], ['occasions', 'ozelGunler'], ['styles', 'giftStyles']]
    .every(([criterion, field]) => !page[criterion]?.length || page[criterion].some(value => attributes[field].includes(value)));
}
export function uniqueShowcaseListings(listings, page) {
  const seen = new Set();
  return listings.filter(listing => {
    if (!listing.id || seen.has(listing.id) || !matchesListingToSeoPage(listing, page)) return false;
    seen.add(listing.id);
    return true;
  });
}
