const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const helper = fs.readFileSync(path.join(root, "src/utils/homeDiscovery.js"), "utf8");
const component = fs.readFileSync(path.join(root, "src/components/HomeDiscovery.jsx"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/styles/components/home-discovery.css"), "utf8");
const productCard = fs.readFileSync(path.join(root, "src/components/ProductCard.jsx"), "utf8");
const home = fs.readFileSync(path.join(root, "src/pages/Home.jsx"), "utf8");
const giftBattle = fs.readFileSync(path.join(root, "src/components/GiftBattle.jsx"), "utf8");

test("Top 10 en fazla 10 canonical normal ürünü impressionCount değerine göre sıralar", () => {
  assert.match(helper, /getTopProducts\(listings, limit = 10\)/);
  assert.match(helper, /filterAvailableListings\(listings\)/);
  assert.match(helper, /!isA4Listing\(listing\)/);
  assert.match(helper, /!isLegacySecondHandListing\(listing\)/);
  assert.match(helper, /Number\(right\.impressionCount \|\| 0\) - Number\(left\.impressionCount \|\| 0\)/);
  assert.doesNotMatch(helper, /satisSayisi/);
  assert.match(helper, /\.slice\(0, limit\)/);
  assert.match(component, /Bugünün Top 10 Ürünü/);
});

test("öne çıkan hero yalnız canonical aktif boost normal ürünlerini kullanır", () => {
  assert.match(helper, /getActiveBoostListings\(listings, now = Date\.now\(\)\)/);
  assert.match(helper, /getNormalAvailableListings\(listings\)/);
  assert.match(helper, /isListingBoostActive\(listing, now\)/);
  assert.match(component, /Öne Çıkan İlanlar/);
  assert.match(component, /variant="discovery-hero"/);
});

test("tek boost sabit kalır, birden fazla boost altı saniyede sırayla değişir", () => {
  assert.match(component, /boosted\.length < 2/);
  assert.match(component, /window\.setInterval/);
  assert.match(component, /6000/);
  assert.match(component, /\(current \+ 1\) % boosted\.length/);
  assert.match(component, /boosted\.length > 1/);
});

test("Yeni Gelen 10 canonical normal ürünü en yeni tarihe göre sıralar", () => {
  assert.match(helper, /getNewestProducts\(listings, limit = 10\)/);
  assert.match(helper, /listingDateMs\(right\) - listingDateMs\(left\)/);
  assert.match(component, /Yeni Gelen 10 Ürün/);
});

test("iki sırada da büyük 1-10 numarası ve mevcut ProductCard kullanılır", () => {
  assert.equal((component.match(/index \+ 1/g) || []).length, 4);
  assert.equal((component.match(/<ProductCard ilan=\{listing\} variant="home" \/>/g) || []).length, 2);
  assert.doesNotMatch(component, /getTopDesigns|Top 10 Tasarımı|Yeni 10 Tasarım/);
  assert.match(component, /En çok görüntülenen popüler ürünler/);
  assert.match(styles, /\.discovery-ranked-card \{[^}]*flex:0 0 285px;[^}]*min-width:285px/);
  assert.match(styles, /\.discovery-ranked-product \{[^}]*right:0;[^}]*width:210px/);
  assert.match(styles, /\.discovery-rank-number \{[^}]*width:116px;[^}]*font-size:218px/);
});

test("ProductCard gösterim, favori, detay, favorileme ve sepet davranışlarını taşımayı sürdürür", () => {
  assert.match(productCard, /useListingImpression/);
  assert.match(productCard, /formatImpressionCount\(impressionCount\)/);
  assert.match(productCard, /ilan\.favoriSayisi \|\| 0/);
  assert.match(productCard, /to=\{`\/ilan\/\$\{ilan\.id\}`\}/);
  assert.match(productCard, /onClick=\{\s*favoriDegistir\s*\}/);
  assert.match(productCard, /onClick=\{\s*sepeteEkle\s*\}/);
});

test("her bölümün Tümünü Gör bağlantısı mevcut ilanlar routeuna gider", () => {
  assert.equal((component.match(/<Link to="\/ilanlar">Tümünü Gör →<\/Link>/g) || []).length, 1);
  assert.match(component, /function DiscoveryRail[\s\S]*<Link to="\/ilanlar">Tümünü Gör →<\/Link>/);
});

test("üst akış, Günün Fırsatları, mağazalar ve diğer özel alanlar korunur", () => {
  assert.match(home, /<Navbar \/>[\s\S]*<FlashSale ilanlar=\{gosterTrend\} \/>/);
  assert.match(home, /<FeaturedStores/);
  assert.match(home, /<GiftBattle \/>/);
  assert.match(home, /<GiftAssistant \/>/);
  assert.match(home, /<DailyQuote \/>[\s\S]*<Footer \/>/);
  assert.match(home, /sponsoredProduct=\{sponsored\.sponsored_product\?\.product\}/);
  assert.match(component, /isListingPublished\(sponsoredProduct\)/);
  assert.ok(home.indexOf("A4 Tasarım Pazarı") < home.indexOf("Ne Alırsan 100 TL"));
  assert.ok(home.indexOf("Ne Alırsan 100 TL") < home.indexOf("<HomeDiscovery"));
});

test("Hediye Kapışması geçici API hatasında kaybolmaz ve eski konumunu korur", () => {
  assert.ok(home.indexOf("<FeaturedStores") < home.indexOf("<GiftBattle />"));
  assert.ok(home.indexOf("<GiftBattle />") < home.indexOf("<GiftAssistant />"));
  assert.doesNotMatch(giftBattle, /if \(!loading && !battle\) return null/);
  assert.match(giftBattle, /window\.setTimeout\(\(\) => loadBattle\(1\), 1200\)/);
  assert.match(giftBattle, /Bugünün kapışması kısa süre içinde burada olacak/);
});

test("yükleme ve boş veri halinde kırık carousel gösterilmez", () => {
  assert.match(component, /loading && <DiscoverySkeleton \/>/);
  assert.match(component, /top\.length > 0/);
  assert.match(component, /newest\.length > 0/);
});
