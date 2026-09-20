const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("Kura sayfası tagline, countdown, 100 XP taahhüt ve temel durumları gösterir", () => {
  const page = read("src/pages/Raffle.jsx");
  assert.match(page, /Hiç tanımadığın birine hediye al/);
  assert.match(page, /Katılım bedeli 100 XP/);
  assert.match(page, /Kura çekilmeden önce vazgeçersen XP iade edilir/);
  assert.match(page, /KURAYA KATILDIN/i);
  assert.match(page, /Şu anda aktif Kura yok/);
  assert.match(page, /Tekrar Dene/);
  assert.match(page, /countdown/);
  assert.match(page, /HediyeAlSat topluluğuna katıl, sana çıkan kişiyi keşfet/);
  assert.match(page, /Nasıl Çalışır/);
  assert.match(page, /🎲 Kuraya Katıl/);
  assert.match(page, /disabled=\{busy \|\| \(me\?\.availableXP \?\? 0\) < event\.xpCost\}/);
});

test("Kura bütçesi tek opsiyonel öneridir ve boşken kullanıcı satırı render edilmez", () => {
  const page = read("src/pages/Raffle.jsx");
  const admin = read("src/components/admin/AdminRaffles.jsx");
  assert.match(admin, /Önerilen Hediye Bütçesi \(Opsiyonel\)/);
  assert.match(admin, /Boş bırakılırsa herhangi bir hediye tutarı sınırı uygulanmaz/);
  assert.doesNotMatch(admin, /Min\. hediye bütçesi|Maks\. hediye bütçesi/);
  assert.match(page, /event\.suggestedGiftBudget &&/);
  assert.match(page, /Bu tutar yalnızca öneridir; hediye değerinde alt veya üst sınır yoktur/);
  assert.doesNotMatch(page, /giftBudgetMin|giftBudgetMax/);
});

test("Kura sohbeti katılımcı olmayan kullanıcıya yazma alanı açmaz ve gizlilik uyarısı verir", () => {
  const page = read("src/pages/Raffle.jsx");
  assert.match(page, /me\?\.joined \? <form/);
  assert.match(page, /Sohbete yazmak için Kuraya katılmalısın/);
  assert.match(page, /Telefon, adres, e-posta veya sosyal medya bilgisi paylaşma/);
  const controller = read("backend/controllers/raffleController.js");
  const routes = read("backend/routes/raffleRoutes.js");
  assert.match(controller, /participant\.data\(\)\.status !== "ACTIVE"/);
  assert.match(controller, /validatePublicText\(req\.body\?\.message/);
  assert.match(routes, /router\.post\("\/:eventId\/messages", authMiddleware, chatRateLimit/);
});

test("Kura gerçek route ile Navbar ve HediyeCep içinde keşfedilebilir", () => {
  assert.match(read("src/App.jsx"), /path="\/kura"/);
  assert.match(read("src/components/Navbar.jsx"), /to="\/kura"/);
  assert.match(read("src/components\/chat\/PublicChat.jsx"), /goTo\("\/kura"\)/);
});

test("admin Kura işlemleri mevcut adminApi ve ayrı draw/cancel endpointlerini kullanır", () => {
  const component = read("src/components/admin/AdminRaffles.jsx");
  const routes = read("backend/routes/adminRoutes.js");
  assert.match(component, /adminApi\("\/raffles"/);
  assert.match(routes, /router\.post\("\/raffles", raffleController\.adminCreate\)/);
  assert.match(routes, /router\.post\("\/raffles\/:eventId\/draw", raffleController\.adminDraw\)/);
  assert.match(routes, /router\.post\("\/raffles\/:eventId\/cancel", raffleController\.adminCancel\)/);
  assert.match(routes, /router\.use\(authMiddleware, adminMiddleware\)/);
  assert.match(component, /Değişiklikleri Kaydet/);
  assert.match(routes, /router\.get\("\/raffles\/:eventId\/participants", raffleController\.adminParticipants\)/);
  assert.match(routes, /router\.get\("\/raffles\/:eventId\/results", raffleController\.adminResults\)/);
  assert.match(component, /Minimum katılımcı sayısına ulaşmak için/);
  assert.match(component, /Kura çekildiğinde eşleşmeler kesinleşir/);
  assert.match(component, /Uygun katılımcıların 100 XP katılım bedelleri idempotent olarak iade edilecek/);
});

test("eşleşme sonucu authenticated UID'den okunur ve bütün eşleşme listesi endpointi yoktur", () => {
  const controller = read("backend/controllers/raffleController.js");
  const routes = read("backend/routes/raffleRoutes.js");
  assert.match(controller, /doc\(`\$\{req\.params\.eventId\}_\$\{req\.user\.uid\}`\)/);
  assert.match(routes, /router\.get\("\/:eventId\/result", authMiddleware/);
  assert.doesNotMatch(routes, /matches/);
  assert.match(controller, /giverUid !== req\.user\.uid/);
});

test("DRAWN kullanıcı görünümü yalnız güvenli ad ve hediye ipucunu gösterir", () => {
  const page = read("src/pages/Raffle.jsx");
  const resultCard = read("src/components/raffle/RaffleResultCard.jsx");
  const controller = read("backend/controllers/raffleController.js");
  assert.match(page, /RaffleResultCard result=\{result\}/);
  assert.match(resultCard, /Sürpriz eşleşmen hazır/);
  assert.match(resultCard, /Sana çıkan kişi/);
  assert.match(resultCard, /SANA ÇIKTI!/);
  assert.match(resultCard, /için hediye hazırlayacaksın/);
  assert.match(resultCard, /Şimdi sıra sende! Ona güzel bir sürpriz seç/);
  assert.match(resultCard, /bu Kura için bir hediye notu bırakmamış/);
  assert.match(resultCard, /to="\/ilanlar"/);
  assert.match(controller, /recipient: \{ displayName: safeDisplayName\(data\.displayName\)[^}]+giftHint: data\.giftHint/);
  assert.doesNotMatch(`${page}${resultCard}`, /paymentTransactionId|recipientUid|giverUid/);
});

test("Kura kullanıcı dili isim çekimini ve opsiyonel Hediye Notum alanını doğru anlatır", () => {
  const page = read("src/pages/Raffle.jsx");
  const resultCard = read("src/components/raffle/RaffleResultCard.jsx");
  assert.match(page, /💌 Hediye Notum/);
  assert.match(page, /Sana çıkacak kişiye küçük bir not bırak/);
  assert.match(page, /\{giftHint\.length\} \/ 240/);
  assert.match(page, /maxLength=\{240\}/);
  assert.match(page, /Hediye notun kaydedildi/);
  assert.match(page, /İsimler çekilsin/);
  assert.doesNotMatch(`${page}${resultCard}`, /Hediye çıktı|Hediyeler karıştırılıyor|Sürpriz hediye seçiliyor/);
});

test("production kullanıcı sonucu ortak kısa çekim deneyiminden sonra açılır", () => {
  const page = read("src/pages/Raffle.jsx");
  const draw = read("src/components/raffle/RaffleDrawExperience.jsx");
  assert.match(page, /RaffleDrawExperience onComplete=\{\(\) => setResultRevealed\(true\)\}/);
  assert.match(draw, /İsimler karıştırılıyor/);
  assert.match(draw, /Kura çekiliyor/);
  assert.match(draw, /Sürpriz eşleşmen hazırlanıyor/);
  assert.match(draw, /prefers-reduced-motion: reduce/);
  const delays = [...draw.matchAll(/delay: (\d+)/g)].map((match) => Number(match[1]));
  assert.equal(delays.reduce((sum, delay) => sum + delay, 0), 10000);
});

test("Kura sayfası 0 XP, katılabilir ve katıldı durumlarını aynı deneyimde sunar", () => {
  const page = read("src/pages/Raffle.jsx");
  assert.match(page, /Bu Kura için biraz daha XP gerekiyor/);
  assert.match(page, /Kuraya Katılmaya Hazırsın/);
  assert.match(page, /Katılım için .* kullanılabilir XP gerekiyor/);
  assert.match(page, /to="\/profil">XP Nasıl Kazanılır/);
  assert.match(page, /✓ KURAYA KATILDIN!/);
  assert.match(page, /Artık Kura listesindesin/);
  assert.match(page, /raffle-steps/);
});

test("admin katılımcı ve sonuç görünümü yalnız güvenli alanları kullanır", () => {
  const controller = read("backend/controllers/raffleController.js");
  const component = read("src/components/admin/AdminRaffles.jsx");
  const participantBlock = controller.slice(controller.indexOf("exports.adminParticipants"), controller.indexOf("exports.adminResults"));
  const resultBlock = controller.slice(controller.indexOf("exports.adminResults"), controller.indexOf("exports.adminCreate"));
  assert.match(participantBlock, /displayName/);
  assert.match(participantBlock, /giftHint/);
  assert.match(participantBlock, /joinedAt/);
  assert.doesNotMatch(participantBlock, /email|phone|address|token/);
  assert.match(resultBlock, /giverDisplayName/);
  assert.match(resultBlock, /recipientDisplayName/);
  assert.doesNotMatch(resultBlock, /email|phone|address|token/);
  assert.match(component, /Eşleşme Sonuçları/);
  assert.match(component, /KURA ÇEKİLDİ/);
  assert.match(component, /İPTAL EDİLDİ/);
});

test("Kura responsive kart, modal, chat ve admin form kurallarına sahiptir", () => {
  const css = read("src/styles/pages/raffle.css");
  const adminCss = read("src/styles/pages/admin.css");
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /max-height:calc\(100vh - 36px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(adminCss, /admin-raffle-form/);
  assert.match(adminCss, /admin-raffle-match/);
});
