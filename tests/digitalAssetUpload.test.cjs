const test = require("node:test");
const assert = require("node:assert/strict");
const { _test } = require("../backend/controllers/digitalAssetController");
const authMiddleware = require("../backend/middleware/authMiddleware");

const config = {
  cloudName: "demo",
  apiKey: "server-key",
  apiSecret: "server-secret"
};

function response(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

test("JPG imzası tanınır ve authenticated upload başarılı olur", async () => {
  const buffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  const detected = _test.detectFile(buffer);
  assert.equal(detected.mimeType, "image/jpeg");

  let request;
  const result = await _test.uploadAuthenticatedAsset(config, {
    buffer,
    detected,
    publicId: "digital-originals/user/asset"
  }, async (url, options) => {
    request = { url, options };
    return response({ public_id: "digital-originals/user/asset", resource_type: "image", bytes: 4 });
  });

  assert.equal(result.public_id, "digital-originals/user/asset");
  assert.match(request.url, /\/image\/upload$/);
  assert.match(request.options.headers.Authorization, /^Basic /);
  assert.equal(request.options.body.get("type"), "authenticated");
});

test("PNG imzası tanınır ve authenticated upload başarılı olur", async () => {
  const buffer = Buffer.from("89504e470d0a1a0a00", "hex");
  const detected = _test.detectFile(buffer);
  assert.equal(detected.mimeType, "image/png");
  const result = await _test.uploadAuthenticatedAsset(config, {
    buffer,
    detected,
    publicId: "digital-originals/user/png"
  }, async () => response({ public_id: "digital-originals/user/png", resource_type: "image" }));
  assert.equal(result.public_id, "digital-originals/user/png");
});

test("PDF imzası tanınır ve authenticated upload başarılı olur", async () => {
  const buffer = Buffer.from("%PDF-1.7 test");
  const detected = _test.detectFile(buffer);
  assert.equal(detected.mimeType, "application/pdf");
  const result = await _test.uploadAuthenticatedAsset(config, {
    buffer,
    detected,
    publicId: "digital-originals/user/pdf"
  }, async () => response({ public_id: "digital-originals/user/pdf", resource_type: "image" }));
  assert.equal(result.public_id, "digital-originals/user/pdf");
});

test("desteklenmeyen dosya içeriği reddedilir", () => {
  assert.throws(
    () => _test.validateUploadBuffer(Buffer.from("not-an-image")),
    (error) => error.status === 415 && error.code === "DIGITAL_ASSET_UNSUPPORTED_TYPE"
  );
});

test("15 MB üstündeki dosya backend tarafından reddedilir", () => {
  assert.equal(_test.MAX_FILE_SIZE, 15 * 1024 * 1024);
  assert.throws(
    () => _test.validateUploadBuffer(Buffer.alloc(_test.MAX_FILE_SIZE + 1)),
    (error) => error.status === 413 && error.code === "DIGITAL_ASSET_TOO_LARGE"
  );
});

test("auth olmayan upload isteği middleware tarafından reddedilir", async () => {
  let statusCode;
  await authMiddleware(
    { headers: {} },
    { status(code) { statusCode = code; return this; }, json() {} },
    () => assert.fail("Auth olmadan next çağrılmamalı")
  );
  assert.equal(statusCode, 401);
});

test("upload sonucu protected digitalAssets kaydına dönüşür", () => {
  const record = _test.digitalAssetRecord({
    listingId: "listing-1",
    listing: { magazaId: "store-1", hakOnayiSurumu: "digital-rights-v1" },
    user: { uid: "seller-1" },
    result: { public_id: "digital-originals/seller-1/asset", resource_type: "image", version: 2, bytes: 1024 },
    detected: { format: "jpg", mimeType: "image/jpeg", resourceType: "image" },
    fallbackSize: 900
  });
  assert.equal(record.listingId, "listing-1");
  assert.equal(record.sellerUid, "seller-1");
  assert.equal(record.deliveryType, "authenticated");
  assert.equal(record.providerAssetId, "digital-originals/seller-1/asset");
  assert.equal("url" in record, false);
  assert.equal("apiSecret" in record, false);
});

test("provider upload hatası güvenli hata koduyla döner ve secret sızdırmaz", async () => {
  const detected = _test.detectFile(Buffer.from([0xff, 0xd8, 0xff]));
  await assert.rejects(
    _test.uploadAuthenticatedAsset(config, {
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      detected,
      publicId: "digital-originals/user/fail"
    }, async () => response({ error: { message: `invalid ${config.apiSecret}` } }, { ok: false, status: 401 })),
    (error) => {
      assert.equal(error.code, "DIGITAL_ASSET_PROVIDER_UPLOAD_FAILED");
      assert.doesNotMatch(error.message, /server-secret/);
      return true;
    }
  );
});
