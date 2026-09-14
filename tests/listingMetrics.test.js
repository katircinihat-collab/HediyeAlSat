import assert from "node:assert/strict";
import test from "node:test";
import { getListingImpressionCount } from "../src/utils/listingMetrics.js";

test("canonical impressionCount legacy alanlardan önce kullanılır", () => {
  assert.equal(getListingImpressionCount({ impressionCount: 12, goruntulenme: 8, views: 4 }), 12);
});

test("legacy gösterim alanları geriye uyumlu fallback sağlar", () => {
  assert.equal(getListingImpressionCount({ goruntulenme: 8 }), 8);
  assert.equal(getListingImpressionCount({ views: 4 }), 4);
  assert.equal(getListingImpressionCount({ impressionCount: -1, goruntulenme: 3 }), 3);
});
