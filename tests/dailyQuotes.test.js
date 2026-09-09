import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dailyQuoteForDate, dailyQuoteIndex, dailyQuotes } from "../src/data/dailyQuotes.js";

function localDate(dayOffset) {
  return new Date(2026, 8, 1 + dayOffset, 12, 0, 0);
}

test("aynı yerel tarih aynı söz ve tasarımı verir", () => {
  assert.deepEqual(dailyQuoteForDate(new Date(2026, 8, 9, 1)), dailyQuoteForDate(new Date(2026, 8, 9, 23)));
});

test("ardışık günler sırayla değişir", () => {
  assert.equal(dailyQuoteIndex(localDate(1)), (dailyQuoteIndex(localDate(0)) + 1) % 30);
});

test("otuz ardışık gün otuz farklı kombinasyon gösterir", () => {
  const combinations = new Set(Array.from({ length: 30 }, (_, index) => {
    const item = dailyQuoteForDate(localDate(index));
    return `${item.quote}|${item.design.variant}`;
  }));
  assert.equal(combinations.size, 30);
});

test("otuz birinci gün ilk kombinasyona döner", () => {
  assert.deepEqual(dailyQuoteForDate(localDate(0)), dailyQuoteForDate(localDate(30)));
});

test("veri yapısı otuz eksiksiz ve farklı kayıt içerir", () => {
  assert.equal(dailyQuotes.length, 30);
  assert.equal(new Set(dailyQuotes.map(({ quote }) => quote)).size, 30);
  dailyQuotes.forEach((item, index) => {
    assert.ok(item.quote);
    assert.ok(item.subtitle);
    assert.equal(item.design.variant, index);
    assert.ok(item.design.family);
    assert.ok(item.design.sky);
    assert.ok(item.design.ground);
    assert.ok(item.design.accent);
    assert.ok(item.design.ink);
  });
});

test("rastgele seçim ve raster asset bağımlılığı kullanılmaz", () => {
  const source = readFileSync(new URL("../src/data/dailyQuotes.js", import.meta.url), "utf8");
  const component = readFileSync(new URL("../src/components/DailyQuote.jsx", import.meta.url), "utf8");
  assert.equal(source.includes("Math.random"), false);
  assert.equal(component.includes("<img"), false);
});
