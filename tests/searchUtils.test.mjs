import test from "node:test";
import assert from "node:assert/strict";
import { listingMatchesSearch, normalizeSearchText } from "../src/utils/search.js";

const listing = {
  baslik: "Kişiye Özel Kupa",
  aciklama: "Anneler Günü için zarif hediye",
  kategori: "Ev & Yaşam",
  altKategori: "Mutfak",
  marka: "HediyeAlSat",
  magazaAdi: "Mutluluk Atölyesi",
  etiketler: ["hediye", "anne"]
};

test("arama başlık, açıklama, kategori, marka, mağaza ve etiket alanlarında çalışır", () => {
  for (const query of ["kupa", "anneler", "yaşam", "hediyealsat", "atölye", "anne"]) {
    assert.equal(listingMatchesSearch(listing, query), true, query);
  }
});

test("Türkçe karakter ve büyük-küçük harf farkı kaldırılır", () => {
  assert.equal(normalizeSearchText("ÇİÇEK ŞÖLENİ"), "cicek soleni");
  assert.equal(listingMatchesSearch(listing, "KISIYE OZEL"), true);
});

test("kısmi eşleşme çalışır, ilgisiz arama sonuç vermez ve boş arama filtrelemez", () => {
  assert.equal(listingMatchesSearch(listing, "mutlu"), true);
  assert.equal(listingMatchesSearch(listing, "telefon"), false);
  assert.equal(listingMatchesSearch(listing, "  "), true);
});

test("dizi ve nesne biçimindeki etiket alanları aranabilir", () => {
  assert.equal(listingMatchesSearch({ tags: [{ ad: "Romantik" }] }, "romantik"), true);
});

test("ad içermeyen eski yorum güvenli fallback kullanır", async () => {
  const { formatPublicCommentDate, publicUserName } = await import("../src/utils/publicUserName.js");
  assert.equal(publicUserName({ kullanici: "gizli@example.com" }), "Kullanıcı");
  assert.equal(publicUserName({ kullaniciAdi: "Ayşe Yılmaz" }), "Ayşe Yılmaz");
  assert.match(formatPublicCommentDate(new Date("2026-09-08T10:00:00Z")), /2026/);
});
