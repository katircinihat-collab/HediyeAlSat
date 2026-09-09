import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { isListingPublished as frontendRule } from "../src/utils/listingAvailability.js";

const require = createRequire(import.meta.url);
const { isListingPublished: backendRule } = require("../backend/utils/listingAvailability.js");

const cases = [
  ["onaylı yeni ilan", { onay: true, aktif: true }, true],
  ["aktif alanı olmayan onaylı legacy ilan", { onay: true }, true],
  ["yayında durumlu onaylı ilan", { onay: true, durum: "Yayında" }, true],
  ["onaysız ilan", { onay: false, aktif: true }, false],
  ["aktif false ilan", { onay: true, aktif: false, stok: 5 }, false],
  ["yayında false ilan", { onay: true, yayinda: false }, false],
  ["pasif durumlu ilan", { onay: true, durum: "Pasif" }, false],
  ["kapalı dijital A4 ilan", { onay: true, aktif: false, urunTipi: "dijital" }, false],
  ["aktif dijital A4 ilan", { onay: true, urunTipi: "dijital", fizikselKargo: false }, true]
];

for (const [name, listing, expected] of cases) {
  test(`frontend/backend aktif ilan kuralı eşleşir: ${name}`, () => {
    assert.equal(frontendRule(listing), expected);
    assert.equal(backendRule(listing), expected);
  });
}
