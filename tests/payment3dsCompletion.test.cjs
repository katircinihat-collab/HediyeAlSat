const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { retrieveCheckoutForm, scheduleCartCleanup } = require("../backend/services/paymentService");
const paymentService = require("../backend/services/paymentService");
const paymentController = require("../backend/controllers/paymentController");

function responseRecorder() {
  return {
    statusCode: null,
    location: null,
    redirect(statusCode, location) {
      this.statusCode = statusCode;
      this.location = location;
      return this;
    }
  };
}

async function withCallbackResult(result, run) {
  const original = paymentService.securePaymentCallback;
  paymentService.securePaymentCallback = async () => {
    if (result instanceof Error) throw result;
    return result;
  };
  try {
    await run();
  } finally {
    paymentService.securePaymentCallback = original;
  }
}

test("checkout retrieve başarı cevabını tek kez tamamlar", async () => {
  const client = { checkoutForm: { retrieve(_request, callback) { callback(null, { paymentStatus: "SUCCESS" }); callback(null, { paymentStatus: "FAILURE" }); } } };
  const result = await retrieveCheckoutForm(client, "opaque-token", 50);
  assert.equal(result.paymentStatus, "SUCCESS");
});

test("invalid provider token güvenli hata ile tamamlanır", async () => {
  const client = { checkoutForm: { retrieve(_request, callback) { callback(Object.assign(new Error("invalid token"), { code: "INVALID_TOKEN" })); } } };
  await assert.rejects(retrieveCheckoutForm(client, "invalid", 50), (error) => error.code === "INVALID_TOKEN");
});

test("provider callback dönmezse request sonsuza kadar açık kalmaz", async () => {
  const client = { checkoutForm: { retrieve() {} } };
  await assert.rejects(retrieveCheckoutForm(client, "opaque-token", 10), (error) => error.code === "CHECKOUT_RETRIEVE_TIMEOUT");
});

test("sepet temizliği success redirect sonucunu bekletmez", async () => {
  let release;
  const blockedCleanup = () => new Promise((resolve) => { release = resolve; });
  const started = Date.now();
  scheduleCartCleanup("buyer@example.com", blockedCleanup);
  assert.ok(Date.now() - started < 20);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof release, "function");
  release();
});

test("callback POST dönüşleri 303 ile success veya fail sayfasına tamamlanır", () => {
  const source = fs.readFileSync(path.join(__dirname, "../backend/controllers/paymentController.js"), "utf8");
  assert.equal((source.match(/res\.redirect\(\s*303,/g) || []).length, 3);
  assert.match(source, /tokenPresent: Boolean\(req\.body\?\.token\)/);
  assert.doesNotMatch(source, /Callback controller hatası:[\s\S]*message:\s*err\.message/);
});

test("başarılı callback 303 ile güvenli success route'una yönlendirir", async () => {
  const previousFrontendUrl = process.env.FRONTEND_URL;
  process.env.FRONTEND_URL = "https://frontend.example";
  const response = responseRecorder();
  try {
    await withCallbackResult({ redirect: "/payment-success" }, async () => {
      await paymentController.paymentCallback({ body: { token: "opaque-token" } }, response);
    });
    assert.equal(response.statusCode, 303);
    assert.equal(response.location, "https://frontend.example/payment-success");
  } finally {
    process.env.FRONTEND_URL = previousFrontendUrl;
  }
});

test("eksik token ve callback exception 303 ile failure route'una yönlendirir", async () => {
  const previousFrontendUrl = process.env.FRONTEND_URL;
  process.env.FRONTEND_URL = "https://frontend.example";
  const missingTokenResponse = responseRecorder();
  const exceptionResponse = responseRecorder();
  const originalError = console.error;
  console.error = () => {};
  try {
    await paymentController.paymentCallback({ body: {} }, missingTokenResponse);
    await withCallbackResult(Object.assign(new Error("provider detail"), { code: "RETRIEVE_FAILED" }), async () => {
      await paymentController.paymentCallback({ body: { token: "opaque-token" } }, exceptionResponse);
    });
    assert.deepEqual(
      [missingTokenResponse.statusCode, missingTokenResponse.location],
      [303, "https://frontend.example/payment-fail"]
    );
    assert.deepEqual(
      [exceptionResponse.statusCode, exceptionResponse.location],
      [303, "https://frontend.example/payment-fail"]
    );
  } finally {
    console.error = originalError;
    process.env.FRONTEND_URL = previousFrontendUrl;
  }
});

test("normal success cleanup ayrımı sponsor ve listing boost branchlerini korur", () => {
  const source = fs.readFileSync(path.join(__dirname, "../backend/services/paymentService.js"), "utf8");
  assert.match(source, /!payment\?\.listingBoost && !payment\?\.sponsor/);
  assert.match(source, /scheduleCartCleanup\(payment\.kullanici\)/);
});
