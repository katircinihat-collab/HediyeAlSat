const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { sanitize, fingerprint, providerFields, context, trace, bindConversation, failure, callbackParsed, ingress } = require("../backend/services/paymentTrace");

for (const field of ["apiKey", "secretKey", "Authorization", "cardNumber", "cvv", "otp", "identityNumber", "email", "phone", "address", "password", "token", "buyer", "checkoutFormContent"]) {
  test(`trace excludes ${field}`, () => assert.deepEqual(sanitize({ [field]: "SENSITIVE_VALUE" }), {}));
}

test("token fingerprint is stable, irreversible short digest; full token never returned", () => {
  const token = "opaque-sensitive-token";
  assert.match(fingerprint(token), /^[a-f0-9]{12}$/);
  assert.equal(fingerprint(token), fingerprint(token));
  assert.notEqual(fingerprint(token), token);
  assert.equal(providerFields({ token }).token, undefined);
  assert.equal(providerFields({ token }).tokenFingerprint, fingerprint(token));
});

test("safe provider IDs and mdStatus=0 retained, absent mdStatus explicitly false", () => {
  const result = providerFields({ paymentId: "12345678", conversationId: "attempt-uuid", mdStatus: 0, paymentStatus: "FAILURE", email: "private@example.test", itemTransactions: [{ cardNumber: "private" }] });
  assert.equal(result.paymentId, "12345678");
  assert.equal(result.conversationId, "attempt-uuid");
  assert.equal(result.mdStatus, "0");
  assert.equal(result.mdStatusPresent, true);
  assert.equal(result.itemTransactionsCount, 1);
  assert.equal(result.email, undefined);
  assert.equal(providerFields({}).mdStatusPresent, false);
});

test("free provider/exception messages cannot disclose credentials or PII", () => {
  const value = "Authorization Bearer secret 4111111111111111 CVV 123 OTP 876543 TC 12345678901 private@example.test +905551234567 Ev adresi";
  const result = sanitize({ errorMessage: value, stack: value, response: { value }, errorCode: "BAD\n" + value });
  assert.equal(result.errorMessage, "Message withheld; consult errorCode with provider.");
  assert.equal(JSON.stringify(result).includes("411111"), false);
  assert.equal(result.errorCode, undefined);
});

test("configured secrets cannot be smuggled into allowed identifiers", () => {
  const old = process.env.IYZIPAY_API_KEY;
  process.env.IYZIPAY_API_KEY = "secretSentinel";
  try { assert.deepEqual(sanitize({ conversationId: "secretSentinel", errorCode: "secretSentinel" }), {}); }
  finally { if (old === undefined) delete process.env.IYZIPAY_API_KEY; else process.env.IYZIPAY_API_KEY = old; }
});

test("callback URL strips query fragment and credentials", () => {
  assert.equal(sanitize({ callbackUrl: "https://user:secret@example.test/api/payment/callback?token=private#secret" }).callbackUrl, "https://example.test/api/payment/callback");
});

async function capture(run) {
  const lines = [];
  const original = console.info;
  console.info = (line) => lines.push(JSON.parse(line.replace("[PAYMENT_TRACE] ", "")));
  try { await run(); return lines; } finally { console.info = original; }
}

test("one attempt preserves conversation trace across awaits; callback whitelist excludes untrusted IDs", async () => {
  const logs = await capture(() => context.run({ requestId: "request-1", traceId: "request-1" }, async () => {
    bindConversation("attempt-1");
    trace("IYZICO_INITIALIZE_REQUEST");
    await Promise.resolve();
    trace("IYZICO_INITIALIZE_RESPONSE", { tokenFingerprint: fingerprint("opaque") });
    callbackParsed({ mdStatus: "0", token: "opaque", paymentId: "untrusted", email: "private@example.test", cardNumber: "4111111111111111" });
    failure("IYZICO_RETRIEVE", Object.assign(new Error("private@example.test secret"), { code: "ECONNRESET" }));
  }));
  assert.ok(logs.every((line) => line.traceId === "attempt-1"));
  assert.equal(logs[0].previousTraceId, "request-1");
  const parsed = logs.find((line) => line.stage === "CALLBACK_PARSE_RESULT");
  assert.equal(parsed.mdStatus, "0");
  assert.equal(parsed.tokenFingerprint, fingerprint("opaque"));
  assert.equal(parsed.paymentId, undefined);
  assert.doesNotMatch(JSON.stringify(logs), /private@example|411111|untrusted/);
});

test("logger failure never changes payment flow", () => {
  const original = console.info;
  console.info = () => { throw new Error("sink unavailable"); };
  try { assert.doesNotThrow(() => trace("PAYMENT_VERIFIED", { paymentVerified: true })); }
  finally { console.info = original; }
});

test("callback entry observed even before CORS/parser rejection without body access", async () => {
  const logs = await capture(() => {
    const listeners = {};
    const req = { path: "/api/payment/callback", method: "POST", headers: { "content-type": "application/x-www-form-urlencoded; charset=utf-8" }, body: { token: "secret" } };
    const res = { statusCode: 500, once: (name, fn) => { listeners[name] = fn; } };
    ingress(req, res, () => {
      failure("HTTP_MIDDLEWARE_OR_HANDLER", new Error("CORS origin reddedildi."));
      listeners.finish();
    });
  });
  assert.equal(logs[0].stage, "CALLBACK_REQUEST_RECEIVED");
  assert.equal(logs[1].reason, "CORS_REJECTED");
  assert.equal(logs[2].httpStatus, 500);
  assert.doesNotMatch(JSON.stringify(logs), /secret/);
});

test("instrumentation precedes unchanged CORS and body parsers; no new public debug route", () => {
  const server = fs.readFileSync("backend/server.js", "utf8");
  assert.ok(server.indexOf("app.use(paymentTrace.ingress)") < server.indexOf("app.use(cors("));
  assert.ok(server.indexOf("CORS_PASSED") < server.indexOf("express.json()"));
  assert.ok(server.indexOf("BODY_PARSERS_PASSED") > server.indexOf("express.urlencoded"));
  assert.doesNotMatch(server, /app\.(get|post)\(["']\/(debug|trace|logs)/);
  const service = fs.readFileSync("backend/services/paymentService.js", "utf8");
  assert.match(service, /IYZICO_INITIALIZE_MAX_ATTEMPTS = 3/);
  assert.match(service, /await sleep\(400 \* attempt\)/);
  assert.match(service, /process.env.CALLBACK_URL/);
  assert.match(service, /PAYMENT_FORM_RESPONSE_READY/);
});
