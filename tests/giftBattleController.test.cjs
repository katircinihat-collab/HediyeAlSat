const assert = require("node:assert/strict");
const test = require("node:test");
const {
  eligibleListing,
  istanbulDate,
  selectPair
} = require("../backend/controllers/giftBattleController");

test("aynı gün aynı ürün ikilisi deterministik seçilir", () => {
  const listings = [
    { id: "urun-c", subcategory: "Çiçek" },
    { id: "urun-a", subcategory: "Kupa & Bardak" },
    { id: "urun-d", subcategory: "Çikolata & Tatlı" },
    { id: "urun-b", subcategory: "Takı & Aksesuar" }
  ];
  const first = selectPair(listings, "2026-09-02");
  const second = selectPair([...listings].reverse(), "2026-09-02");
  assert.deepEqual(first, second);
  assert.notEqual(first[0], first[1]);
});

test("farklı alt kategoriler mevcutsa farklı kategoriler eşleşir", () => {
  const listings = [
    { id: "kupa-1", subcategory: "Kupa & Bardak" },
    { id: "kupa-2", subcategory: "Kupa & Bardak" },
    { id: "cicek-1", subcategory: "Çiçek" }
  ];
  const pair = selectPair(listings, "2026-09-03");
  const selected = pair.map((id) => listings.find((listing) => listing.id === id));
  assert.notEqual(selected[0].subcategory, selected[1].subcategory);
});

test("yalnız aynı alt kategori varsa iki farklı ilanla fallback çalışır", () => {
  const listings = [
    { id: "kupa-1", subcategory: "Kupa & Bardak" },
    { id: "kupa-2", subcategory: "Kupa & Bardak" },
    { id: "kupa-3", subcategory: "Kupa & Bardak" }
  ];
  const pair = selectPair(listings, "2026-09-04");
  assert.notEqual(pair[0], pair[1]);
});

test("iki uygun üründen az olduğunda kapışma oluşturulmaz", () => {
  assert.equal(selectPair([], "2026-09-02"), null);
  assert.equal(selectPair(["tek-urun"], "2026-09-02"), null);
});

test("yalnız onaylı, aktif ve fiziksel normal ürün uygundur", () => {
  assert.equal(eligibleListing({ onay: true, kategori: "Hediyelik Ürünler" }), true);
  assert.equal(eligibleListing({ onay: false, kategori: "Hediyelik Ürünler" }), false);
  assert.equal(eligibleListing({ onay: true, aktif: false, kategori: "Hediyelik Ürünler" }), false);
  assert.equal(eligibleListing({ onay: true, kategori: "A4 Tasarım" }), false);
  assert.equal(eligibleListing({ onay: true, anaKategori: "A4 Tasarım" }), false);
  assert.equal(eligibleListing({ onay: true, urunTipi: "dijital", kategori: "Hediyelik Ürünler" }), false);
});

test("İstanbul günü doğru soru ve tarih anahtarını üretir", () => {
  assert.deepEqual(istanbulDate(new Date("2026-09-01T12:00:00Z")), {
    dateKey: "2026-09-01",
    question: "Babana hangisini hediye ederdin?"
  });
});
