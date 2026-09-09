const test = require("node:test");
const assert = require("node:assert/strict");
const {
  recordListingImpression
} = require("../backend/services/listingImpressionService");
const { createRateLimit } = require("../backend/middleware/rateLimit");

function fakeFirestore(listing) {
  const updates = [];
  const ref = { path: "ilanlar/listing-1" };
  return {
    updates,
    collection: () => ({ doc: () => ref }),
    runTransaction: async (callback) => callback({
      get: async () => ({ exists: Boolean(listing), data: () => listing }),
      update: (_ref, value) => updates.push(value)
    })
  };
}

test("public ve onaylı ilan gösterimi transaction içinde bir artar", async () => {
  const firestore = fakeFirestore({ onay: true, aktif: true, impressionCount: 12 });
  const result = await recordListingImpression({ firestore, listingId: "listing-1" });
  assert.equal(result.impressionCount, 13);
  assert.deepEqual(firestore.updates, [{ impressionCount: 13 }]);
});

test("olmayan listing reddedilir", async () => {
  await assert.rejects(
    recordListingImpression({ firestore: fakeFirestore(null), listingId: "missing" }),
    (error) => error.status === 404 && error.code === "LISTING_NOT_FOUND"
  );
});

test("pasif veya onaysız listing artmaz", async () => {
  for (const listing of [{ onay: false, aktif: true }, { onay: true, aktif: false }]) {
    const firestore = fakeFirestore(listing);
    await assert.rejects(recordListingImpression({ firestore, listingId: "listing-1" }));
    assert.equal(firestore.updates.length, 0);
  }
});

test("client toplam alanı servise taşınmaz ve yalnız bir artırılır", async () => {
  const firestore = fakeFirestore({ onay: true, impressionCount: 4 });
  const result = await recordListingImpression({
    firestore,
    listingId: "listing-1",
    impressionCount: 999999
  });
  assert.equal(result.impressionCount, 5);
});

test("rate limiter hızlı abuse isteğini 429 ile durdurur", () => {
  const limiter = createRateLimit({ windowMs: 60000, max: 1, message: "limit" });
  const req = { baseUrl: "/api/listings", ip: "127.0.0.10" };
  let statusCode = 200;
  const res = {
    set() {},
    status(code) { statusCode = code; return this; },
    json() { return this; }
  };
  let nextCalls = 0;
  limiter(req, res, () => { nextCalls += 1; });
  limiter(req, res, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);
  assert.equal(statusCode, 429);
});
