import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const navbar = readFileSync("src/components/Navbar.jsx", "utf8");
const navbarCss = readFileSync("src/styles/layout/navbar.css", "utf8");
const slider = readFileSync("src/components/ProductSlider.jsx", "utf8");
const sliderCss = readFileSync("src/styles/components/product-slider.css", "utf8");
const home = readFileSync("src/pages/Home.jsx", "utf8");
const listings = readFileSync("src/pages/Listings.jsx", "utf8");

test("mobil header logo, arama, sepet ve hesap aksiyonlarını birlikte sunar", () => {
  assert.match(navbar, /className="mobile-navbar-top"/);
  assert.match(navbar, /className="mobile-navbar-search"/);
  assert.match(navbar, /to="\/sepet" className="mobile-navbar-action"/);
  assert.match(navbar, /to=\{user \? "\/profil" : "\/login"\}/);
  assert.match(navbarCss, /@media \(max-width: 720px\)[\s\S]*\.mobile-navbar-top\s*\{[\s\S]*display: grid/);
});

test("büyük vitrin iç sayfalarda gizlenir ve mobil kategori menüsü yatay kayar", () => {
  assert.match(navbar, /isHome \? "navbar-home" : "navbar-inner-page"/);
  assert.match(navbarCss, /\.navbar-inner-page \.navbar-top\s*\{\s*display: none/);
  assert.match(navbarCss, /\.navbar-menu\s*\{[\s\S]*overflow-x: auto/);
});

test("ortak ürün sliderı sınır durumlu oklar ve mobil swipe kullanır", () => {
  assert.match(slider, /canPrev: slider\.scrollLeft > 2/);
  assert.match(slider, /canNext: slider\.scrollLeft < maxScroll - 2/);
  assert.match(slider, /disabled=\{!scrollState\.canPrev\}/);
  assert.match(slider, /disabled=\{!scrollState\.canNext\}/);
  assert.match(slider, /behavior: "smooth"/);
  assert.match(sliderCss, /@media \(max-width: 600px\)[\s\S]*scroll-snap-type: x proximity/);
  assert.match(sliderCss, /@media \(max-width: 600px\)[\s\S]*overflow-x: auto/);
});

test("ana sayfa Tümünü Gör bağlantıları mevcut ilanlar routeunda desteklenen filtreleri açar", () => {
  for (const view of ["best-sellers", "new", "premium", "editors-choice"]) {
    assert.match(home, new RegExp(`allTo="/ilanlar\\?view=${view}"`));
  }
  assert.match(slider, /<Link className="all-button" to=\{allTo\}>/);
  assert.match(listings, /searchParams\.get\("view"\)/);
  assert.match(listings, /view === "best-sellers"/);
  assert.match(listings, /view === "new"/);
  assert.match(listings, /view === "premium"/);
  assert.match(listings, /view === "editors-choice"/);
});
