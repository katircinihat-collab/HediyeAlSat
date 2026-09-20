const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("community feed auth restore nedeniyle tekrar çağrılmaz ve shell skeleton gösterir", () => {
  const page = read("src/pages/GiftBattles.jsx");
  assert.match(page, /getCommunityBattles\(\)/);
  assert.match(page, /\}, \[battleId\]\);/);
  assert.match(page, /community-battle-loading/);
  assert.doesNotMatch(page, /const load = battleId \?/);
});

test("community feed ve Top 10 kısa süreli cache ile tekrarlı Firestore okumalarını önler", () => {
  const battle = read("backend/controllers/giftBattleController.js");
  const ranking = read("backend/controllers/designVoteController.js");
  assert.match(battle, /COMMUNITY_FEED_CACHE_MS = 15000/);
  assert.match(battle, /clearCommunityFeedCache\(\)/);
  assert.match(ranking, /TOP_DESIGNS_CACHE_MS = 60000/);
  assert.match(ranking, /clearTopDesignsCache\(\)/);
});

test("satış kartları ürünü kırpmadan gösterir ve güvenli fallback kullanır", () => {
  const component = read("src/components/ProductCard.jsx");
  const shared = read("src/styles/components/product-card.css");
  const ideas = read("src/styles/pages/gift-ideas-page.css");
  assert.match(component, /loading="lazy"/);
  assert.match(component, /event\.currentTarget\.src = productFallback/);
  assert.match(shared, /\.product-image img\s*\{[^}]*object-fit:\s*contain/s);
  assert.doesNotMatch(ideas, /\.gift-ideas-grid img\s*\{[^}]*object-fit:\s*cover/s);
});

test("Günün Ürünü mevcut gerçek ilan havuzundan deterministik seçilir", async () => {
  const { selectDailyProduct, istanbulDayKey } = await import("../src/utils/dailyProduct.js");
  const now = new Date("2026-09-20T12:00:00Z");
  const listings = [
    { id: "b", onay: true, aktif: true, stok: 2 },
    { id: "a", onay: true, aktif: true, stok: 1 },
    { id: "inactive", onay: true, aktif: false, stok: 4 },
    { id: "sold", onay: true, aktif: true, stok: 0 }
  ];
  const first = selectDailyProduct(listings, now);
  const second = selectDailyProduct([...listings].reverse(), now);
  assert.equal(istanbulDayKey(now), "2026-09-20");
  assert.equal(first.id, second.id);
  assert.ok(["a", "b"].includes(first.id));
});

test("Günün Ürünü gerçek detay rotası, başlık, fiyat ve görsel kullanır", () => {
  const navbar = read("src/components/Navbar.jsx");
  const home = read("src/pages/Home.jsx");
  assert.match(home, /selectDailyProduct\(ilanlar\)/);
  assert.match(home, /<Navbar dailyProduct=\{dailyProduct\} \/>/);
  assert.match(navbar, /to: `\/ilan\/\$\{dailyProduct\.id\}`/);
  assert.match(navbar, /dailyProduct\.fiyat/);
  assert.match(navbar, /dailyProduct\.resim/);
});
