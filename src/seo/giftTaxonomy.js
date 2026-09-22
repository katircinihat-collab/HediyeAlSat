import taxonomy from '../../shared/giftTaxonomy.json' with { type: 'json' };

export { taxonomy };
export function normalizeGiftTaxonomy(listing = {}) {
  return Object.fromEntries(Object.entries(taxonomy).map(([field, options]) => [field,
    [...new Set((Array.isArray(listing[field]) ? listing[field] : [])
      .filter(value => typeof value === 'string')
      .map(value => value.trim().toLowerCase())
      .filter(value => Object.hasOwn(options, value)))]
  ]));
}
