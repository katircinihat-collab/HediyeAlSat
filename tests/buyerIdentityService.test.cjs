const test = require("node:test");
const assert = require("node:assert/strict");
const service = require("../backend/services/buyerIdentityService");

const VALID_IDENTITY = "10000000146";
const KEY = Buffer.alloc(32, 7);

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function fakeFirestore(initial = null) {
  let stored = initial;
  return {
    collection(name) {
      assert.equal(name, "buyerIdentities");
      return {
        doc(uid) {
          assert.equal(uid, "buyer-uid");
          return {
            async get() {
              return { exists: Boolean(stored), data: () => stored };
            },
            async set(value) {
              stored = value;
            }
          };
        }
      };
    },
    read: () => stored
  };
}

test("production global sabit identity kullanılmaz", async () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldUri = process.env.IYZIPAY_URI;
  const oldGlobal = process.env.IYZIPAY_BUYER_IDENTITY_NUMBER;
  process.env.NODE_ENV = "production";
  process.env.IYZIPAY_URI = "https://api.iyzipay.com";
  process.env.IYZIPAY_BUYER_IDENTITY_NUMBER = "11111111111";
  try {
    await assert.rejects(
      service.resolveBuyerIdentity("buyer-uid", {
        firestore: fakeFirestore(),
        key: KEY,
        sandboxIdentity: null
      }),
      (error) => error.code === "BUYER_IDENTITY_REQUIRED"
    );
  } finally {
    restoreEnv("NODE_ENV", oldNodeEnv);
    restoreEnv("IYZIPAY_URI", oldUri);
    restoreEnv("IYZIPAY_BUYER_IDENTITY_NUMBER", oldGlobal);
  }
});

test("sandbox fallback yalnız sandbox ortamında çalışır", () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldUri = process.env.IYZIPAY_URI;
  process.env.NODE_ENV = "production";
  process.env.IYZIPAY_URI = "https://sandbox-api.iyzipay.com";
  try {
    assert.equal(service._test.isSandboxMode(), true);
    assert.equal(service._test.sandboxIdentity(), "11111111111");
    process.env.IYZIPAY_URI = "https://api.iyzipay.com";
    assert.equal(service._test.isSandboxMode(), false);
    assert.equal(service._test.sandboxIdentity(), null);
  } finally {
    restoreEnv("NODE_ENV", oldNodeEnv);
    restoreEnv("IYZIPAY_URI", oldUri);
  }
});

test("kullanıcıya ait trusted identity backend şifreli kaydından alınır", async () => {
  const database = fakeFirestore();
  await service.saveBuyerIdentity("buyer-uid", VALID_IDENTITY, {
    firestore: database,
    key: KEY,
    serverTimestamp: () => "server-time"
  });
  const resolved = await service.resolveBuyerIdentity("buyer-uid", {
    firestore: database,
    key: KEY,
    sandboxIdentity: null
  });
  assert.equal(resolved, VALID_IDENTITY);
  assert.notEqual(database.read().ciphertext, VALID_IDENTITY);
});

test("client sahte identity ödeme resolver girdisi değildir", async () => {
  const database = fakeFirestore();
  await service.saveBuyerIdentity("buyer-uid", VALID_IDENTITY, {
    firestore: database,
    key: KEY,
    serverTimestamp: () => "server-time"
  });
  const clientBody = { identityNumber: "11111111111" };
  const resolved = await service.resolveBuyerIdentity("buyer-uid", {
    firestore: database,
    key: KEY,
    sandboxIdentity: null,
    clientBody
  });
  assert.equal(resolved, VALID_IDENTITY);
});

test("eksik production identity güvenli hata verir", async () => {
  await assert.rejects(
    service.resolveBuyerIdentity("buyer-uid", {
      firestore: fakeFirestore(),
      key: KEY,
      sandboxIdentity: null
    }),
    (error) => error.status === 409 && error.code === "BUYER_IDENTITY_REQUIRED"
  );
});

test("identity yalnız maskeli response ile gösterilir", async () => {
  const database = fakeFirestore();
  const result = await service.saveBuyerIdentity("buyer-uid", VALID_IDENTITY, {
    firestore: database,
    key: KEY,
    serverTimestamp: () => "server-time"
  });
  assert.deepEqual(result, { configured: true, masked: "*******0146" });
  const masked = await service.getMaskedBuyerIdentity("buyer-uid", { firestore: database });
  assert.deepEqual(masked, { configured: true, masked: "*******0146" });
  assert.doesNotMatch(JSON.stringify(result), new RegExp(VALID_IDENTITY));
});

test("geçersiz kimlik kaydedilmez", async () => {
  await assert.rejects(
    service.saveBuyerIdentity("buyer-uid", "12345678901", {
      firestore: fakeFirestore(),
      key: KEY
    }),
    (error) => error.code === "BUYER_IDENTITY_INVALID"
  );
});
