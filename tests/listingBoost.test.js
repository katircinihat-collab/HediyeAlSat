import test from "node:test";
import assert from "node:assert/strict";
import { isListingBoostActive, LISTING_BOOST_PACKAGES, sortListingsByBoost } from "../src/utils/listingBoost.js";

test("frontend paketleri backend ile ortak 29/49/99 configini kullanır", () => {
  assert.deepEqual(LISTING_BOOST_PACKAGES.map(({ days, price }) => [days, price]), [[3, 29], [7, 49], [30, 99]]);
});

test("aktif boost normal ilanın önüne geçer, süresi dolan avantaj alamaz", () => {
  const now = Date.parse("2026-09-11T10:00:00Z");
  const normal = { id: "normal", tarih: new Date(now + 1000) };
  const active = { id: "active", boostActive: true, boostEndAt: new Date(now + 10000), tarih: new Date(now - 1000) };
  const expired = { id: "expired", boostActive: true, boostEndAt: new Date(now - 1000), tarih: new Date(now + 2000) };
  assert.equal(isListingBoostActive(expired, now), false);
  assert.deepEqual(sortListingsByBoost([normal, active, expired], now).map((item) => item.id), ["active", "expired", "normal"]);
});
