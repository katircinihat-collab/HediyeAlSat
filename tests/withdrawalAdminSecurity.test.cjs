const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const configPath = path.resolve(__dirname, "../backend/config/firebase.js");
const middlewarePath = path.resolve(__dirname, "../backend/middleware/adminMiddleware.js");

function loadMiddleware(adminDocument) {
  delete require.cache[middlewarePath];
  require.cache[configPath] = { id: configPath, filename: configPath, loaded: true, exports: {
    firestore: { collection: () => ({ doc: () => ({ get: async () => adminDocument }) }) }
  } };
  return require(middlewarePath);
}

function response() {
  return { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

test("normal kullanıcı admin ödeme middleware katmanını geçemez", async () => {
  const middleware = loadMiddleware({ exists: false }); const res = response(); let nextCalled = false;
  await middleware({ user: { uid: "user", email: "user@example.com" } }, res, () => { nextCalled = true; });
  assert.equal(res.code, 403); assert.equal(nextCalled, false);
});

test("aktif admin güvenli ödeme endpointi middleware katmanını geçer", async () => {
  const middleware = loadMiddleware({ exists: true, data: () => ({ aktif: true }) }); const res = response(); let nextCalled = false;
  await middleware({ user: { uid: "admin", email: "admin@example.com" } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});
