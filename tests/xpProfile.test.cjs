const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("profil XP kartı seviye, kullanılabilir/toplam XP, yardım ve hareket geçmişini gösterir", () => {
  const profile = read("src/pages/Profile.jsx");
  assert.match(profile, /XP &amp; Seviyem/);
  assert.match(profile, /Kullanılabilir XP/);
  assert.match(profile, /Toplam kazandığın/);
  assert.match(profile, /XP Nasıl Kazanırım \/ Nerede Kullanırım/);
  assert.match(profile, /XP Hareketlerim/);
  assert.match(profile, /XP para değildir; satın alınamaz veya nakde çevrilemez/);
});

test("profil XP sayıları merkezi configden gelir ve responsive yapı korunur", () => {
  const profile = read("src/pages/Profile.jsx");
  const styles = read("src/styles/pages/profile.css");
  assert.match(profile, /xpConfig\.events\.WELCOME_BONUS\.amount/);
  assert.match(profile, /xpConfig\.events\.GIFT_BATTLE_DAILY_3_VOTES\.amount/);
  assert.match(styles, /\.profile-xp-card/);
  assert.match(styles, /@media \(max-width: 640px\)/);
});

test("kayıt akışı backend hoş geldin bonusunu çağırır; client XP alanı yazmaz", () => {
  const register = read("src/pages/Register.jsx");
  assert.match(register, /claimWelcomeXp\(credential\.user\)/);
  assert.doesNotMatch(register, /(?:lifetimeXP|availableXP)\s*:/);
});

test("topluluk GiftBattle üçüncü geçerli oyla XP'yi aynı backend transactionında uygular", () => {
  const service = read("backend/services/communityGiftBattleService.js");
  assert.match(service, /applyXpEventInTransaction/);
  assert.match(service, /reason: "GIFT_BATTLE_DAILY_3_VOTES"/);
  assert.match(service, /count === 3/);
});
