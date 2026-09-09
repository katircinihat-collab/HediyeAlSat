import test from "node:test";
import assert from "node:assert/strict";
import {
  IMPRESSION_DWELL_MS,
  IMPRESSION_VISIBILITY_RATIO,
  formatImpressionCount,
  impressionSessionKey
} from "../src/utils/impressions.js";

test("görünürlük ve bekleme eşikleri sabittir", () => {
  assert.equal(IMPRESSION_VISIBILITY_RATIO, 0.5);
  assert.equal(IMPRESSION_DWELL_MS, 1500);
});

test("session anahtarı listing bazında deterministiktir", () => {
  assert.equal(impressionSessionKey("abc"), "hediyealsat_impression_abc");
});

test("büyük gösterim sayıları Türkçe kısa formatlanır", () => {
  assert.equal(formatImpressionCount(999), "999");
  assert.equal(formatImpressionCount(1200), "1,2 B");
  assert.equal(formatImpressionCount(15400), "15,4 B");
  assert.equal(formatImpressionCount(125000), "125 B");
});
