export const categoryDefinitions = [
  {
    id: "hediyelik-urunler",
    name: "Hediyelik Ürünler",
    icon: "🎁",
    subcategories: [
      "Kupa & Bardak", "Çiçek", "Takı & Aksesuar", "Çikolata & Tatlı",
      "Kişiye Özel Hediyeler", "Dekoratif Ürünler", "Diğer Hediyelik Ürünler"
    ]
  },
  {
    id: "organizasyon-hizmet",
    name: "Organizasyon & Hizmet",
    icon: "🎉",
    subcategories: [
      "Doğum Günü", "Nişan", "Düğün", "Söz", "Baby Shower",
      "Özel Gün Organizasyonu", "Diğer Organizasyon Hizmetleri"
    ]
  },
  {
    id: "a4-tasarim",
    name: "A4 Tasarım",
    icon: "🎨",
    subcategories: [
      "Poster", "Davetiye", "Menü", "Afiş", "Sosyal Medya Tasarımı",
      "Diğer A4 Tasarımlar"
    ]
  },
  {
    id: "kiralik-urunler",
    name: "Kiralık Ürünler",
    icon: "🪑",
    subcategories: [
      "Masa & Sandalye", "Süsleme Ekipmanları", "Fon & Arka Plan",
      "Organizasyon Ekipmanları", "Diğer Kiralık Ürünler"
    ]
  }
];

const legacyMainCategoryMap = {
  "Çiçek": "Hediyelik Ürünler",
  "Takı & Aksesuar": "Hediyelik Ürünler",
  "El Yapımı": "Hediyelik Ürünler",
  "Kişiye Özel": "Hediyelik Ürünler",
  "Ev Dekorasyonu": "Hediyelik Ürünler",
  "Oyuncak": "Hediyelik Ürünler",
  "Hediye Kutuları": "Hediyelik Ürünler",
  "Organizasyon": "Organizasyon & Hizmet"
};

const legacySlugMap = {
  cicek: { mainCategory: "Hediyelik Ürünler", subcategory: "Çiçek" },
  "taki-aksesuar": { mainCategory: "Hediyelik Ürünler", subcategory: "Takı & Aksesuar" },
  "el-yapimi": { mainCategory: "Hediyelik Ürünler", subcategory: "" },
  "kisiye-ozel": { mainCategory: "Hediyelik Ürünler", subcategory: "Kişiye Özel Hediyeler" },
  "ev-dekorasyonu": { mainCategory: "Hediyelik Ürünler", subcategory: "Dekoratif Ürünler" },
  oyuncak: { mainCategory: "Hediyelik Ürünler", subcategory: "" },
  "hediye-kutulari": { mainCategory: "Hediyelik Ürünler", subcategory: "" },
  organizasyon: { mainCategory: "Organizasyon & Hizmet", subcategory: "" }
};

const legacySubcategoryMap = {
  "Çiçek": "Çiçek",
  "Takı & Aksesuar": "Takı & Aksesuar",
  "Kişiye Özel": "Kişiye Özel Hediyeler",
  "Ev Dekorasyonu": "Dekoratif Ürünler"
};

const categories = Object.fromEntries(
  categoryDefinitions.map((category) => [category.name, category.subcategories])
);

export function getCategoryBySlug(slug) {
  const direct = categoryDefinitions.find((category) => category.id === slug);
  if (direct) return direct;

  const legacyRoute = legacySlugMap[slug];
  return categoryDefinitions.find(
    (category) => category.name === legacyRoute?.mainCategory
  );
}

export function getDefaultSubcategoryForSlug(slug) {
  return legacySlugMap[slug]?.subcategory || "";
}

export function getListingMainCategory(listing = {}) {
  const rawCategory = listing.anaKategori || listing.kategori || "";
  return legacyMainCategoryMap[rawCategory] || rawCategory;
}

export function getListingSubcategory(listing = {}) {
  if (listing.anaKategori) return listing.altKategori || "";

  const legacyCategory = listing.kategori || "";
  if (legacyMainCategoryMap[legacyCategory]) {
    return legacySubcategoryMap[legacyCategory] || "";
  }

  return listing.altKategori || "";
}

export function matchesMainCategory(listing, mainCategory) {
  return !mainCategory || getListingMainCategory(listing) === mainCategory;
}

export function isA4Listing(listing) {
  return getListingMainCategory(listing) === "A4 Tasarım";
}

export function isDigitalA4Listing(listing = {}) {
  return listing.urunTipi === "dijital" && listing.kategori === "A4 Tasarım";
}

export function isLegacySecondHandListing(listing = {}) {
  const values = [
    listing.anaKategori, listing.kategori, listing.altKategori,
    listing.urunDurumu, listing.durum, listing.kondisyon
  ];

  return values.some((value) =>
    /(?:^|\s)(?:2\.?\s*el|ikinci\s*el|kullanılmış|kullanilmis|second\s*hand|used)(?:\s|$)/i
      .test(String(value || ""))
  );
}

export function formatListingCategory(listing = {}) {
  const mainCategory = getListingMainCategory(listing);
  const subcategory = getListingSubcategory(listing);
  return [mainCategory, subcategory].filter(Boolean).join(" > ");
}

export default categories;
