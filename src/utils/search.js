const TURKISH_CHARACTERS = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u"
};

export function normalizeSearchText(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[çğıöşü]/g, (character) => TURKISH_CHARACTERS[character]);
}

function flattenSearchValue(value) {
  if (Array.isArray(value)) return value.flatMap(flattenSearchValue);
  if (value && typeof value === "object") return Object.values(value).flatMap(flattenSearchValue);
  return value === null || value === undefined ? [] : [value];
}

export function listingMatchesSearch(listing, query, extraValues = []) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const searchableValues = [
    listing?.baslik,
    listing?.urunAdi,
    listing?.ilanAdi,
    listing?.ad,
    listing?.aciklama,
    listing?.kategori,
    listing?.altKategori,
    listing?.marka,
    listing?.magazaAdi,
    listing?.saticiAdi,
    listing?.sahipAdi,
    listing?.kullaniciAdi,
    listing?.etiket,
    listing?.etiketler,
    listing?.tags,
    listing?.anahtarKelimeler,
    listing?.ozelGun,
    listing?.ozelGunler,
    extraValues
  ];

  return normalizeSearchText(flattenSearchValue(searchableValues).join(" "))
    .includes(normalizedQuery);
}
