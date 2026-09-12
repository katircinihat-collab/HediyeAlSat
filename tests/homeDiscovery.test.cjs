const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const helper = fs.readFileSync(path.join(root, "src/utils/homeDiscovery.js"), "utf8");
const component = fs.readFileSync(path.join(root, "src/components/HomeDiscovery.jsx"), "utf8");
const home = fs.readFileSync(path.join(root, "src/pages/Home.jsx"), "utf8");

test("öne çıkan ilanlar canonical availability ve aktif boost helperlarını birlikte kullanır", () => {
  assert.match(helper, /filterAvailableListings\(listings\)/);
  assert.match(helper, /isListingBoostActive\(listing, now\)/);
  assert.match(component, /Öne Çıkan İlanlar/);
  assert.match(component, /boosted\.length > 0/);
});

test("Top 10 gerçek oy API sırasını korur ve en fazla 10 tasarım gösterir", () => {
  assert.match(component, /getTopDesigns\(10\)/);
  assert.match(component, /design\.sira/);
  assert.match(helper, /slice\(0, limit\)/);
  assert.match(helper, /filterAvailableListings\(listings\)/);
});

test("Yeni 10 tasarım canonical uygunlukla en yeni tarihe göre sıralanır", () => {
  assert.match(helper, /filterAvailableListings\(listings\)[\s\S]*\.filter\(isA4Listing\)[\s\S]*listingDateMs\(right\) - listingDateMs\(left\)[\s\S]*\.slice\(0, limit\)/);
  assert.match(component, /Yeni 10 Tasarım/);
});

test("eski tekrar eden sliderlar kalkar ve tüm ilanlar CTA mevcut routea gider", () => {
  assert.doesNotMatch(home, /En Çok Satan Hediyeler|Yeni Gelen Hediyeler|Editörün Seçimi|Premium Mağazalar/);
  assert.match(component, /to="\/ilanlar"/);
  assert.match(home, /<HomeDiscovery[\s\S]*listings=\{ilanlar\}/);
});

test("Günün Fırsatları üst akışı ve alt özel işlevler korunur", () => {
  assert.match(home, /<Navbar \/>[\s\S]*<FlashSale ilanlar=\{gosterTrend\} \/>/);
  assert.match(home, /<FeaturedStores/);
  assert.match(home, /<GiftBattle \/>/);
  assert.match(home, /<GiftAssistant \/>/);
  assert.match(home, /<DailyQuote \/>[\s\S]*<Footer \/>/);
  assert.match(home, /sponsoredProduct=\{sponsored\.sponsored_product\?\.product\}/);
  assert.match(component, /isListingPublished\(sponsoredProduct\)/);
});

test("yükleme skeletonı ve boş veri halinde kırık rail üretmeme davranışı vardır", () => {
  assert.match(component, /loading \? <DiscoverySkeleton \/>/);
  assert.match(component, /top\.length > 0/);
  assert.match(component, /newest\.length > 0/);
});
