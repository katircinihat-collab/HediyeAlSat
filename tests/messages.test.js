import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildConversations, filterConversations, isOwnMessage, messagePreview } from "../src/utils/messages.js";

const stamp = (seconds) => ({ seconds });

test("mesajlar ilan ve karşı taraf bazında konuşma listesine gruplanır", () => {
  const messages = [
    { id: "1", gonderenUid: "me", alanUid: "seller", ilanId: "listing", ilanBaslik: "Kupa", mesaj: "Merhaba", tarih: stamp(1), okundu: true },
    { id: "2", gonderenUid: "seller", alanUid: "me", ilanId: "listing", ilanBaslik: "Kupa", mesaj: "Buyurun", tarih: stamp(2), okundu: false }
  ];
  const conversations = buildConversations(messages, "me", "me@example.com");
  assert.equal(conversations.length, 1);
  assert.equal(conversations[0].lastMessage.id, "2");
  assert.equal(conversations[0].unreadCount, 1);
  assert.deepEqual(conversations[0].messages.map((message) => message.id), ["1", "2"]);
});

test("legacy email mesajları korunur ve son mesaj önizlemesi doğru oluşturulur", () => {
  const own = { gonderen: "me@example.com", alan: "seller@example.com", mesaj: "Ürün hâlâ mevcut mu?" };
  assert.equal(isOwnMessage(own, "me", "me@example.com"), true);
  assert.equal(messagePreview(own, "me", "me@example.com"), "Siz: Ürün hâlâ mevcut mu?");
});

test("arama ve okunmamış filtresi birlikte çalışır", () => {
  const conversations = [
    { ilanBaslik: "Kırmızı Kupa", lastMessage: { mesaj: "Merhaba" }, unreadCount: 2 },
    { ilanBaslik: "Poster", lastMessage: { mesaj: "Teşekkürler" }, unreadCount: 0 }
  ];
  assert.equal(filterConversations(conversations, "kupa", false).length, 1);
  assert.equal(filterConversations(conversations, "", true).length, 1);
  assert.equal(filterConversations(conversations, "poster", true).length, 0);
});

test("sayfa dört güvenli listenerı hata callbacki ve cleanup ile yönetir", () => {
  const source = fs.readFileSync(new URL("../src/pages/Messages.jsx", import.meta.url), "utf8");
  assert.match(source, /\["gonderen", currentEmail\]/);
  assert.match(source, /\["alanUid", currentUid\]/);
  assert.match(source, /unsubscribers\.forEach\(\(unsubscribe\) => unsubscribe\(\)\)/);
  assert.match(source, /onSnapshot\([\s\S]*?fail[\s\S]*?\)/);
  assert.doesNotMatch(source, /window\.scrollTo|document\.scrollingElement/);
});
