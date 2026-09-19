const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("SEO bileşeni canonical, robots, sosyal meta ve güvenli JSON-LD üretir", () => {
  const source = read("src/components/SEO.jsx");
  assert.match(source, /robots = "index,follow"/);
  assert.match(source, /application\/ld\+json/);
  assert.match(source, /JSON\.stringify\(data\)\.replace\(\/<\//);
  assert.match(source, /og:site_name/);
  assert.match(source, /og:locale/);
});

test("başlangıç meta etiketleri Helmet tarafından devralınabilir", () => {
  const source = read("index.html");
  assert.match(source, /<title data-rh="true">/);
  assert.match(source, /data-rh="true"\s+rel="canonical"/);
  assert.match(source, /data-rh="true"\s+name="description"/);
});

test("SEO landing sayfaları merkezi meta ve breadcrumb şeması kullanır", () => {
  const source = read("src/pages/SeoLandingPage.jsx");
  assert.match(source, /<SEO/);
  assert.match(source, /"@type": "BreadcrumbList"/);
  assert.match(source, /robots="noindex,follow"/);
  assert.doesNotMatch(source, /document\.title|document\.head/);
});

test("ürün sayfası yalnız gerçek ilan verisiyle Product şeması üretir", () => {
  const source = read("src/pages/DetailPage.jsx");
  assert.match(source, /"@type": "Product"/);
  assert.match(source, /priceCurrency: "TRY"/);
  assert.match(source, /price: fiyat/);
  assert.doesNotMatch(source, /aggregateRating|reviewCount/);
});

test("private işlem sayfaları noindex ve sitemap dışında kalır", () => {
  const policy = read("src/components/RouteSeoPolicy.jsx");
  const sitemap = read("public/sitemap.xml");
  for (const route of ["/login", "/sepet", "/odeme", "/admin", "/seller", "/sponsor-basvuru"]) {
    assert.match(policy, new RegExp(route.replace("/", "\\/")));
  }
  for (const route of ["magaza-olustur", "ilan-ver", "sponsor-basvuru"]) {
    assert.doesNotMatch(sitemap, new RegExp(`<loc>[^<]*${route}`));
  }
});

test("sitemap public vitrinleri içerir ve duplicate URL barındırmaz", () => {
  const sitemap = read("public/sitemap.xml");
  for (const route of ["100-tl-alti", "a4-tasarimlar", "top-10-tasarim"]) {
    assert.match(sitemap, new RegExp(`<loc>https:\\/\\/hediyealsat\\.com\\/${route}<\\/loc>`));
  }
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(new Set(urls).size, urls.length);
});
