const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Kura Test Modu yalnız DEV ve localhost koşulunda yüklenebilir", () => {
  const admin = read("src/components/admin/AdminRaffles.jsx");
  assert.match(admin, /import\.meta\.env\.DEV \? lazy/);
  assert.match(admin, /import\.meta\.env\.DEV && typeof window/);
  assert.match(admin, /\["localhost", "127\.0\.0\.1"\]\.includes\(window\.location\.hostname\)/);
  assert.match(admin, /isLocalRaffleTestMode && LocalRaffleTestMode/);
});

test("test paneli yalnız local state kullanır ve mutation istemcisi içermez", () => {
  const component = read("src/components/admin/RaffleTestMode.jsx");
  assert.match(component, /Test Kurasını Başlat/);
  assert.match(component, /Gerçek kullanıcı, XP, Firestore veya production Kura verilerini değiştirmez/);
  assert.doesNotMatch(component, /adminApi|fetch\(|firebase|joinRaffle|updateDoc|setDoc|addDoc|runTransaction/);
});

test("üç test katılımcısı circular eşleşir, self-match ve eksik alıcı oluşmaz", async () => {
  const moduleUrl = pathToFileURL(path.join(root, "src/utils/raffleTestMode.js")).href;
  const { RAFFLE_TEST_PARTICIPANTS, createCircularTestMatches } = await import(moduleUrl);
  const matches = createCircularTestMatches(RAFFLE_TEST_PARTICIPANTS);
  assert.equal(matches.length, 3);
  assert.equal(new Set(matches.map((item) => item.giverId)).size, 3);
  assert.equal(new Set(matches.map((item) => item.recipientId)).size, 3);
  assert.equal(matches.some((item) => item.giverId === item.recipientId), false);
});

test("kullanıcı önizlemesi doğru alıcıyı aynı production sonuç kartında gösterir", async () => {
  const moduleUrl = pathToFileURL(path.join(root, "src/utils/raffleTestMode.js")).href;
  const { RAFFLE_TEST_PARTICIPANTS, createCircularTestMatches, getTestResult } = await import(moduleUrl);
  const result = getTestResult(createCircularTestMatches(), "test-ahmet");
  assert.deepEqual(result, { displayName: "Ayşe T.", giftHint: "Mum, dekorasyon ve küçük sürprizleri severim." });
  assert.match(read("src/components/admin/RaffleTestMode.jsx"), /RaffleResultCard result=\{previewResult\}/);
  assert.match(read("src/pages/Raffle.jsx"), /RaffleResultCard result=\{result\}/);
});

test("OPEN ve sıfır katılımcılı etkinlik düzenlenebilir, DRAWN güvenliği korunur", () => {
  const admin = read("src/components/admin/AdminRaffles.jsx");
  const controller = read("backend/controllers/raffleController.js");
  assert.match(admin, /method: editingId \? "PATCH" : "POST"/);
  assert.match(admin, /Kura Düzenleniyor/);
  assert.match(admin, /scrollIntoView/);
  assert.doesNotMatch(controller.slice(controller.indexOf("exports.adminUpdate"), controller.indexOf("exports.adminDraw")), /participantCount/);
  assert.match(controller, /\["MATCHED", "COMPLETED", "CANCELLED"\]\.includes\(snapshot\.data\(\)\.status\)/);
});

test("test yaşam döngüsü OPEN, READY ve MATCHED önizlemelerini içerir", () => {
  const component = read("src/components/admin/RaffleTestMode.jsx");
  assert.match(component, /OPEN: "KATILIMA AÇIK"/);
  assert.match(component, /READY: "ÇEKİME HAZIR"/);
  assert.match(component, /DRAWING: "KURA ÇEKİLİYOR"/);
  assert.match(component, /MATCHED: "KURA ÇEKİLDİ"/);
  assert.match(component, /Çekime Hazır Duruma Getir/);
  assert.match(component, /Test Kurasını Çek/);
  assert.match(component, /Eşleşme Sonuçları/);
  assert.match(component, /RaffleDrawExperience/);
});

test("katılım önizlemesi üç ayrı state kullanır ve DRAWN sonucu tekrar etmez", () => {
  const component = read("src/components/admin/RaffleTestMode.jsx");
  assert.match(component, /value="insufficient"/);
  assert.match(component, /value="eligible"/);
  assert.match(component, /value="joined"/);
  assert.doesNotMatch(component, /value="matched"/);
  assert.equal((component.match(/<RaffleResultCard result=\{previewResult\}/g) || []).length, 1);
});

test("katılmış preview Hediye Notum textarea ve local kaydet kontrolünü gösterir", () => {
  const component = read("src/components/admin/RaffleTestMode.jsx");
  assert.match(component, /value=\{testNote\}/);
  assert.match(component, /setTestNote\(event\.target\.value\.slice\(0, 240\)\)/);
  assert.match(component, /💌 Notumu Kaydet/);
  assert.match(component, /Hediye notun kaydedildi/);
  assert.doesNotMatch(component, /updateRaffleHint|joinRaffle|adminApi/);
});

test("Ahmet önizlemesinde Ayşe ve Ayşe'nin Kura notu gösterilir", async () => {
  const moduleUrl = pathToFileURL(path.join(root, "src/utils/raffleTestMode.js")).href;
  const { createCircularTestMatches, getTestResult } = await import(moduleUrl);
  const result = getTestResult(createCircularTestMatches(), "test-ahmet");
  assert.equal(result.displayName, "Ayşe T.");
  assert.equal(result.giftHint, "Mum, dekorasyon ve küçük sürprizleri severim.");
  const resultCard = read("src/components/raffle/RaffleResultCard.jsx");
  assert.match(resultCard, /toLocaleUpperCase\("tr-TR"\)/);
  assert.match(resultCard, /SANA ÇIKTI!/);
});

test("çekim double submit engeli ve reduced-motion desteği korunur", () => {
  const component = read("src/components/admin/RaffleTestMode.jsx");
  const draw = read("src/components/raffle/RaffleDrawExperience.jsx");
  const css = read("src/styles/pages/raffle.css");
  assert.match(component, /phase !== "READY"/);
  assert.match(component, /setPhase\("DRAWING"\)/);
  assert.match(draw, /matchMedia/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /animation:none!important/);
});
