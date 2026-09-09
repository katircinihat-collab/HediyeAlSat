const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeTurkishIban, isValidTurkishIban, maskIban } = require("../backend/utils/iban");

test("Türkiye IBAN'ını boşluksuz ve büyük harfe normalize eder", () => {
  assert.equal(normalizeTurkishIban("tr33 0006 1005 1978 6457 8413 26"), "TR330006100519786457841326");
});

test("geçerli Türkiye IBAN checksum değerini kabul eder", () => {
  assert.equal(isValidTurkishIban("TR33 0006 1005 1978 6457 8413 26"), true);
});

test("yanlış format ve checksum değerlerini reddeder", () => {
  assert.equal(isValidTurkishIban("DE89370400440532013000"), false);
  assert.equal(isValidTurkishIban("TR330006100519786457841327"), false);
});

test("IBAN'ı yalnız başlangıç ve son iki hanesi görünecek şekilde maskeler", () => {
  const masked = maskIban("TR330006100519786457841326");
  assert.equal(masked, "TR33 **** **** **** **** **26");
  assert.equal(masked.includes("61005197864578413"), false);
});
