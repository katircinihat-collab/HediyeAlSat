import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/pages/SponsorStorePage.jsx", "utf8");
const css = readFileSync("src/styles/pages/sponsor-store-page.css", "utf8");

test("başvuru kartı başlık açıklama ve butonu normal akışta sıralar", () => {
  assert.match(page, /className="sponsor-application-box"[\s\S]*<h3>[\s\S]*<p>[\s\S]*className="sponsor-store-button"/);
  assert.match(css, /\.sponsor-application-box\s*\{[\s\S]*display: flex;[\s\S]*flex-direction: column;[\s\S]*gap: 14px/);
  assert.match(css, /\.sponsor-store-button\s*\{[\s\S]*display: inline-flex/);
  assert.doesNotMatch(css, /\.sponsor-store-button\s*\{[^}]*position:\s*absolute/);
});

test("başvuru süreci karttan sonra bağımsız ve responsive boşlukla başlar", () => {
  assert.match(css, /\.sponsor-store-info\s*\{[\s\S]*margin-top: 28px/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.sponsor-store-info\s*\{[\s\S]*margin-top: 22px/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*\.sponsor-store-button\s*\{[\s\S]*width: 100%/);
});
