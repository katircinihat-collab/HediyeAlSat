import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { isListingPublished as frontendRule } from "../src/utils/listingAvailability.js";

const require = createRequire(import.meta.url);
const {
  buildApprovedListingState,
  isListingPublished: backendRule
} = require("../backend/utils/listingAvailability.js");

const cases = [
  ["onaylı yeni ilan", { onay: true, aktif: true }, true],
  ["aktif alanı olmayan onaylı legacy ilan", { onay: true }, true],
  ["stok alanı olmayan onaylı legacy ilan", { onay: true, aktif: true }, true],
  ["yayında durumlu onaylı ilan", { onay: true, durum: "Yayında" }, true],
  ["onaysız ilan", { onay: false, aktif: true }, false],
  ["aktif false ilan", { onay: true, aktif: false, stok: 5 }, false],
  ["yayında false ilan", { onay: true, yayinda: false }, false],
  ["pasif durumlu ilan", { onay: true, durum: "Pasif" }, false],
  ["stok bitmiş fiziksel ilan", { onay: true, aktif: true, stok: 0 }, false],
  ["adet alanıyla stoğu bitmiş legacy fiziksel ilan", { onay: true, adet: 0 }, false],
  ["stok sıfır dijital A4 ilan", { onay: true, aktif: true, stok: 0, urunTipi: "dijital" }, true],
  ["kapalı dijital A4 ilan", { onay: true, aktif: false, urunTipi: "dijital" }, false],
  ["aktif dijital A4 ilan", { onay: true, urunTipi: "dijital", fizikselKargo: false }, true]
];

for (const [name, listing, expected] of cases) {
  test(`frontend/backend aktif ilan kuralı eşleşir: ${name}`, () => {
    assert.equal(frontendRule(listing), expected);
    assert.equal(backendRule(listing), expected);
  });
}

test("admin onayı canonical yayın alanlarını birlikte yazar", () => {
  assert.deepEqual(buildApprovedListingState({ timestamp: "server-time", adminUid: "admin-1" }), {
    onay: true,
    aktif: true,
    yayinda: true,
    durum: "Yayında",
    onayTarihi: "server-time",
    onaylayanUid: "admin-1"
  });
});

test("filtre sonrası kalan ilanlar boş slotsuz ardışık kalır", async () => {
  const { filterAvailableListings } = await import("../src/utils/listingAvailability.js");
  const listings = [
    { id: "one", onay: true, stok: 2 },
    { id: "closed", onay: true, aktif: false, stok: 2 },
    { id: "two", onay: true, stok: 1 },
    { id: "draft", onay: false, stok: 3 },
    { id: "three", onay: true, urunTipi: "dijital", stok: 0 }
  ];
  assert.deepEqual(filterAvailableListings(listings).map((listing) => listing.id), ["one", "two", "three"]);
});
