import test from "node:test";
import assert from "node:assert/strict";
import {
  isEligibleSponsoredProduct,
  isEligibleSponsoredStore,
  selectSponsoredContent,
  activeStoreSponsorMap,
  sortStoresBySponsor,
  sponsorTierLabel
} from "../src/utils/sponsoredContent.js";

const now = new Date("2026-09-09T12:00:00Z").getTime();
const item = (id, placement, extra = {}) => ({ id, placement, active: true, priority: 1, ...extra });

test("aktif reklam yoksa sonuç boş olur", () => {
  assert.deepEqual(selectSponsoredContent([], now), []);
});

test("bir aktif reklam yalnız bir kez görünür", () => {
  assert.equal(selectSponsoredContent([item("1", "middle_banner")], now).length, 1);
});

test("dört placement birlikte gösterilebilir", () => {
  const ads = ["middle_banner", "sponsored_product", "sponsored_store", "lower_banner"]
    .map((placement, index) => item(String(index), placement));
  assert.equal(selectSponsoredContent(ads, now).length, 4);
});

test("beşten fazla kayıtta hard limit ve placement tekilliği korunur", () => {
  const ads = [
    item("a", "middle_banner", { priority: 2 }),
    item("b", "middle_banner", { priority: 1 }),
    item("c", "sponsored_product"),
    item("d", "sponsored_store"),
    item("e", "lower_banner")
  ];
  const selected = selectSponsoredContent(ads, now);
  assert.equal(selected.length, 4);
  assert.equal(selected.find((entry) => entry.placement === "middle_banner").id, "a");
});

test("inactive ve tarih dışındaki reklam görünmez", () => {
  const selected = selectSponsoredContent([
    item("inactive", "middle_banner", { active: false }),
    item("future", "sponsored_product", { startAt: new Date(now + 1000) }),
    item("expired", "sponsored_store", { endAt: new Date(now - 1000) }),
    item("valid", "lower_banner", { startAt: new Date(now - 1000), endAt: new Date(now + 1000) })
  ], now);
  assert.deepEqual(selected.map(({ id }) => id), ["valid"]);
});

test("pasif veya stoksuz fiziksel sponsorlu ürün gösterilmez", () => {
  assert.equal(isEligibleSponsoredProduct({ onay: true, aktif: false, stok: 5 }), false);
  assert.equal(isEligibleSponsoredProduct({ onay: true, aktif: true, stok: 0 }), false);
  assert.equal(isEligibleSponsoredProduct({ onay: true, aktif: true, stok: 2 }), true);
  assert.equal(isEligibleSponsoredProduct({ onay: true, aktif: true, urunTipi: "dijital" }), true);
});

test("kapalı sponsorlu mağaza gösterilmez", () => {
  assert.equal(isEligibleSponsoredStore({ aktif: false }), false);
  assert.equal(isEligibleSponsoredStore({ aktif: true }), true);
});

test("sponsor mağazalar diamond, gold, bronze ve normal sırasına girer", () => {
  const sponsors = activeStoreSponsorMap([
    item("b", "sponsored_store", { storeId: "bronze", tier: "bronze", endAt: new Date(now + 1000) }),
    item("d", "sponsored_store", { storeId: "diamond", tier: "diamond", endAt: new Date(now + 1000) }),
    item("g", "sponsored_store", { storeId: "gold", tier: "gold", endAt: new Date(now + 1000) })
  ], now);
  assert.deepEqual(sortStoresBySponsor([{ id: "normal" }, { id: "bronze" }, { id: "diamond" }, { id: "gold" }], sponsors).map((store) => store.id), ["diamond", "gold", "bronze", "normal"]);
  assert.equal(sponsorTierLabel("diamond"), "💎 Elmas Sponsor");
});

test("süresi dolmuş sponsor mağaza aktif haritaya girmez", () => {
  assert.equal(activeStoreSponsorMap([item("x", "sponsored_store", { storeId: "store", tier: "diamond", endAt: new Date(now - 1) })], now).size, 0);
});
