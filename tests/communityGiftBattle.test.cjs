const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const service = require("../backend/services/communityGiftBattleService");

test("ürün çifti A/B sırasından bağımsız normalize edilir", () => {
  assert.equal(service.pairKey(["b", "a"]), "a__b");
  assert.equal(service.pairKey(["a", "b"]), "a__b");
});

test("soru limiti ve özel iletişim bilgisi engellenir", () => {
  assert.equal(service.validateQuestion("Hangisini almalıyım?"), "Hangisini almalıyım?");
  assert.throws(() => service.validateQuestion("a".repeat(151)), (error) => error.code === "QUESTION_TOO_LONG");
  assert.throws(() => service.validateQuestion("Bana test@example.com yaz"), (error) => error.code === "PRIVATE_DATA");
});

test("public projection private owner uid ve sonuçları oy öncesi sızdırmaz", () => {
  const battle = service.publicBattle("x", { ownerUid: "secret", ownerName: "Ayşe", status: "ACTIVE", expiresAt: new Date(Date.now() + 60000), productA: { id: "a" }, productB: { id: "b" }, votesA: 9, votesB: 3 });
  assert.equal(battle.ownerUid, undefined);
  assert.equal(battle.results, null);
  assert.equal(JSON.stringify(battle).includes("secret"), false);
});

test("oy sonrası ve creator görünümünde doğru aggregate gösterilir", () => {
  const battle = service.publicBattle("x", { status: "ACTIVE", expiresAt: new Date(Date.now() + 60000), productA: { id: "a" }, productB: { id: "b" }, votesA: 3, votesB: 1 }, { selectedChoice: "A", reveal: true });
  assert.deepEqual(battle.results, { votesA: 3, votesB: 1, totalVotes: 4, percentageA: 75, percentageB: 25 });
});

test("frontend kırmızı-sol mavi-sağ, VS, paylaşım ve gizli sonuç sözleşmesini taşır", () => {
  const root = path.join(__dirname, "..");
  const arena = fs.readFileSync(path.join(root, "src/components/CommunityGiftBattleArena.jsx"), "utf8");
  const page = fs.readFileSync(path.join(root, "src/pages/GiftBattles.jsx"), "utf8");
  assert.match(arena, /side=\"A\"/); assert.match(arena, /side=\"B\"/); assert.match(arena, />VS</);
  assert.match(page, /WhatsApp'ta Paylaş/); assert.match(page, /Linki Kopyala/); assert.match(page, /from: location\.pathname/);
});

test("sepet oluşturucu tam iki ürün, ücretsiz ve 150 karakter sözleşmesini taşır", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/pages/Cart.jsx"), "utf8");
  assert.match(source, /battleSelected\.length !== 2/); assert.match(source, /maxLength="150"/); assert.match(source, /Ücretsiz · XP harcanmaz/);
});

test("legacy vote XP vermez; yeni ödül yalnız üçüncü farklı oy eventidir", () => {
  const config = require("../shared/xpConfig.json");
  const controller = fs.readFileSync(path.join(__dirname, "../backend/controllers/giftBattleController.js"), "utf8");
  assert.equal(config.events.GIFT_BATTLE_VOTE.amount, 0);
  assert.equal(config.events.GIFT_BATTLE_DAILY_3_VOTES.amount, 5);
  assert.match(controller, /feedCommunityBattles/);
  assert.doesNotMatch(controller.slice(0, controller.indexOf("exports\.GIFT_BATTLE_CANDIDATE_LIMIT")), /applyXpEventInTransaction/);
});

test("backend authoritative create sepeti ve ilanları okur, client snapshot kabul etmez", () => {
  const source = fs.readFileSync(path.join(__dirname, "../backend/services/communityGiftBattleService.js"), "utf8");
  assert.match(source, /collection\("sepet"\)/); assert.match(source, /collection\("ilanlar"\)/);
  assert.match(source, /ACTIVE_LIMIT/); assert.match(source, /DUPLICATE_PAIR/);
  assert.doesNotMatch(source, /req\.body\?\.(?:price|seller|votes)/);
});

test("localhost preview yalnız DEV koşulunda lazy yüklenir ve production mutation içermez", () => {
  const page = fs.readFileSync(path.join(__dirname, "../src/pages/GiftBattles.jsx"), "utf8");
  const preview = fs.readFileSync(path.join(__dirname, "../src/components/GiftBattleDevPreview.jsx"), "utf8");
  assert.match(page, /import\.meta\.env\.DEV \? lazy/);
  assert.match(page, /localhost.*127\.0\.0\.1/);
  assert.doesNotMatch(preview, /(?:fetch|addDoc|setDoc|updateDoc|createCommunityBattle|voteCommunityBattle)\s*\(/);
  for (const state of ["unvoted", "voted", "creator", "ended", "tie", "unavailable"]) assert.match(preview, new RegExp(`${state}:`));
});
