const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const chat = fs.readFileSync("src/components/chat/PublicChat.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const home = fs.readFileSync("src/pages/Home.jsx", "utf8");
const battle = fs.readFileSync("src/components/GiftBattle.jsx", "utf8");
const battleApi = fs.readFileSync("src/services/giftBattleApi.js", "utf8");
const chatCss = fs.readFileSync("src/styles/components/public-chat.css", "utf8");

test("HediyeCep tek sağ alt merkez olarak mevcut sohbeti içerir", () => {
  assert.equal((home.match(/<PublicChat \/>/g) || []).length, 1);
  assert.match(chat, /🎁 HediyeCep/);
  assert.doesNotMatch(chat, /public-chat__launcher/);
  assert.match(chat, /screen === "home"/);
  assert.match(chat, /screen !== "chat"/);
});

test("HediyeCep yalnız gerçek uygulama route'larını kullanır", () => {
  for (const route of ["/a4-tasarimlar", "/hediye-fikirleri", "/kura"]) {
    assert.match(app, new RegExp(`path="${route}"`));
    assert.match(chat, new RegExp(route.replace("/", "\\/")));
  }
  assert.match(home, /id="hediye-kapismasi"|<GiftBattle \/>/);
  assert.match(chat, /\/#hediye-kapismasi/);
  assert.match(chat, /Kura/);
});

test("misafir sorgu açmaz, önizleme üç ve açık sohbet elli mesajla sınırlıdır", () => {
  assert.match(chat, /if \(open \|\| minimized \|\| !user\) return undefined;[\s\S]*limit\(3\)/);
  assert.match(chat, /if \(!open \|\| screen !== "chat" \|\| !user\) return undefined;[\s\S]*limit\(50\)/);
  assert.equal((chat.match(/return onSnapshot\(/g) || []).length, 2);
  assert.match(chat, /setMessages\(\[\]\);[\s\S]*setPreviewMessages\(\[\]\);/);
});

test("HediyeCep küçültme tercihini saklar ve kapsülden geri büyür", () => {
  assert.match(chat, /MINIMIZED_STORAGE_KEY = "hediyeCepMinimized"/);
  assert.match(chat, /localStorage\.getItem\(MINIMIZED_STORAGE_KEY\)/);
  assert.match(chat, /localStorage\.setItem\(MINIMIZED_STORAGE_KEY, String\(value\)\)/);
  assert.match(chat, /aria-label="HediyeCep'i küçült">−<\/button>/);
  assert.match(chat, /className="hediye-cep__capsule"[\s\S]*aria-label="HediyeCep'i büyüt"/);
  assert.match(chat, /if \(open \|\| minimized \|\| !user\) return undefined/);
});

test("GiftBattle geçici hata ile gerçek boş günü ayrı gösterir ve yeniden denenebilir", () => {
  assert.match(battle, /error \? \([\s\S]*Kapışma geçici olarak yüklenemedi[\s\S]*Tekrar Dene/);
  assert.match(battle, /setReloadKey\(\(current\) => current \+ 1\)/);
  assert.match(battle, /Bugünün kapışması kısa süre içinde burada olacak/);
});

test("HediyeCep paneli navbar üstünde ve kısa viewport içinde erişilebilir kalır", () => {
  assert.match(chatCss, /\.public-chat\s*\{[\s\S]*z-index:\s*10000/);
  assert.match(chatCss, /height:\s*min\(570px, calc\(100dvh - 32px\)\)/);
  assert.match(chatCss, /max-height:\s*calc\(100dvh - 32px\)/);
  assert.match(chatCss, /@media \(max-width: 600px\)[\s\S]*height:\s*100dvh/);
});

test("GiftBattle geçici hatada loaderı kapatır ve yalnız transient hatayı bir kez tekrarlar", () => {
  assert.match(battleApi, /controller\.abort\(\), 9000/);
  assert.match(battleApi, /GIFT_BATTLE_TEMPORARILY_UNAVAILABLE|GIFT_BATTLE_CLIENT_TIMEOUT/);
  assert.match(battle, /setError\([\s\S]*setLoading\(false\);[\s\S]*attempt === 0 && transient/);
  assert.match(battle, /setTimeout\(\(\) => loadBattle\(1\), 1200\)/);
});
