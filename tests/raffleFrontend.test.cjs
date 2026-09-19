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
  assert.match(page, /Kuraya Katıldın/);
  assert.match(page, /Şu anda aktif Kura yok/);
  assert.match(page, /Tekrar Dene/);
  assert.match(page, /countdown/);
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
});

test("eşleşme sonucu authenticated UID'den okunur ve bütün eşleşme listesi endpointi yoktur", () => {
  const controller = read("backend/controllers/raffleController.js");
  const routes = read("backend/routes/raffleRoutes.js");
  assert.match(controller, /doc\(`\$\{req\.params\.eventId\}_\$\{req\.user\.uid\}`\)/);
  assert.match(routes, /router\.get\("\/:eventId\/result", authMiddleware/);
  assert.doesNotMatch(routes, /matches/);
});

test("Kura responsive kart, modal, chat ve admin form kurallarına sahiptir", () => {
  const css = read("src/styles/pages/raffle.css");
  const adminCss = read("src/styles/pages/admin.css");
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /@media\(max-width:480px\)/);
  assert.match(css, /max-height:calc\(100vh - 36px\)/);
  assert.match(adminCss, /admin-raffle-form/);
});
