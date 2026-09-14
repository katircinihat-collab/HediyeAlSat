const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "src/pages/SpecialListingsPage.jsx"), "utf8");
const controller = fs.readFileSync(path.join(root, "backend/controllers/designVoteController.js"), "utf8");

test("eski ve yeni canonical A4 ilanlar aynı oy arayüzünü kullanır", () => {
  assert.doesNotMatch(page, /isDigitalA4Listing/);
  assert.match(page, /ilanlar\.filter\(isA4Listing\)/);
  assert.match(page, /const dijital = isA4Listing\(ilan\)/);
});

test("backend A4 uygunluğunu urunTipi yerine canonical kategoriyle doğrular", () => {
  assert.match(controller, /listing\.kategori === "A4 Tasarım" \|\| listing\.anaKategori === "A4 Tasarım"/);
  assert.doesNotMatch(controller, /listing\.urunTipi === "dijital"/);
  assert.match(controller, /transaction\.create\(ref/);
  assert.match(controller, /voteSnap\.exists/);
});
