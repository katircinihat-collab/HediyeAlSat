const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const chat = fs.readFileSync("src/components/chat/PublicChat.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const home = fs.readFileSync("src/pages/Home.jsx", "utf8");
const battle = fs.readFileSync("src/components/GiftBattle.jsx", "utf8");

test("HediyeCep tek sağ alt merkez olarak mevcut sohbeti içerir", () => {
  assert.equal((home.match(/<PublicChat \/>/g) || []).length, 1);
  assert.match(chat, /🎁 HediyeCep/);
  assert.doesNotMatch(chat, /public-chat__launcher/);
  assert.match(chat, /screen === "home"/);
  assert.match(chat, /screen !== "chat"/);
});

test("HediyeCep yalnız gerçek uygulama route'larını kullanır", () => {
  for (const route of ["/a4-tasarimlar", "/hediye-fikirleri"]) {
    assert.match(app, new RegExp(`path="${route}"`));
    assert.match(chat, new RegExp(route.replace("/", "\\/")));
  }
  assert.match(home, /id="hediye-kapismasi"|<GiftBattle \/>/);
  assert.match(chat, /\/#hediye-kapismasi/);
  assert.doesNotMatch(chat, /Kura/);
});

test("misafir sorgu açmaz, önizleme üç ve açık sohbet elli mesajla sınırlıdır", () => {
  assert.match(chat, /if \(open \|\| !user\) return undefined;[\s\S]*limit\(3\)/);
  assert.match(chat, /if \(!open \|\| screen !== "chat" \|\| !user\) return undefined;[\s\S]*limit\(50\)/);
  assert.equal((chat.match(/return onSnapshot\(/g) || []).length, 2);
  assert.match(chat, /setMessages\(\[\]\);[\s\S]*setPreviewMessages\(\[\]\);/);
});

test("GiftBattle geçici hata ile gerçek boş günü ayrı gösterir ve yeniden denenebilir", () => {
  assert.match(battle, /error \? \([\s\S]*Kapışma geçici olarak yüklenemedi[\s\S]*Tekrar Dene/);
  assert.match(battle, /setReloadKey\(\(current\) => current \+ 1\)/);
  assert.match(battle, /Bugünün kapışması kısa süre içinde burada olacak/);
});
