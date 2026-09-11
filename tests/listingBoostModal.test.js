import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/ListingBoostButton.jsx", import.meta.url), "utf8");

test("boost modal kart hover ağacından document.body portalına taşınır", () => {
  assert.match(source, /createPortal\s*\(/);
  assert.match(source, /document\.body/);
  assert.doesNotMatch(source, /onMouseEnter|onMouseLeave|onMouseOver|onMouseOut/);
});

test("modal yalnız gerçek backdrop, X ve Vazgeç aksiyonlarıyla kapanır", () => {
  assert.match(source, /event\.target === event\.currentTarget && closeModal\(\)/);
  assert.match(source, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(source, /aria-label="Pencereyi kapat"[^>]+onClick=\{closeModal\}/);
  assert.match(source, />Vazgeç<\/button>/);
});

test("üç paket radio seçimi yalnız selected stateini günceller", () => {
  assert.match(source, /LISTING_BOOST_PACKAGES\.map/);
  assert.match(source, /type="radio"/);
  assert.match(source, /onChange=\{\(\) => setSelected\(item\.id\)\}/);
});

test("ödeme yalnız buton clickiyle başlar ve loading çift gönderimi engeller", () => {
  assert.match(source, /if \(!auth\.currentUser \|\| loading\) return/);
  assert.match(source, /onClick=\{startPayment\}/);
  assert.match(source, /disabled=\{loading\}/);
});
