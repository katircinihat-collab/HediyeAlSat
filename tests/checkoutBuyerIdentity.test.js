import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { isValidTurkishIdentityNumber, normalizeTurkishIdentityNumber } from "../src/utils/buyerIdentity.js";

test("TC kimlik girişi yalnız 11 rakama normalize edilir", () => {
  assert.equal(normalizeTurkishIdentityNumber(" 10000-000 146 x"), "10000000146");
});

test("geçerli TC algoritması kabul edilir, geçersiz değer ödeme öncesi reddedilir", () => {
  assert.equal(isValidTurkishIdentityNumber("10000000146"), true);
  assert.equal(isValidTurkishIdentityNumber("12345678901"), false);
  assert.equal(isValidTurkishIdentityNumber("00000000000"), false);
});

test("Checkout private identity endpointini kullanır ve payment body kimlik taşımaz", () => {
  const source = fs.readFileSync(new URL("../src/pages/Checkout.jsx", import.meta.url), "utf8");
  assert.match(source, /apiUrl\("\/api\/buyer-identity"\)/);
  const paymentSections = source.split('apiUrl("/api/payment")').slice(1);
  assert.equal(paymentSections.length, 2);
  for (const section of paymentSections) {
    const paymentBody = section.slice(0, section.indexOf("const data"));
    assert.doesNotMatch(paymentBody, /identityNumber/);
  }
});

test("identity hazırlığı ürün tipi ve satıcıdan bağımsız ortak ödeme kapısıdır", () => {
  const source = fs.readFileSync(new URL("../src/pages/Checkout.jsx", import.meta.url), "utf8");
  const normalFlow = source.slice(source.indexOf("// NORMAL ÜRÜN ÖDEMESİ"));
  const identityGate = normalFlow.indexOf("kimligiOdemeIcinHazirla(token)");
  const orderWrites = normalFlow.indexOf("for (const urun of urunler)");
  const paymentInitialize = normalFlow.indexOf('apiUrl("/api/payment")');
  assert.ok(identityGate > -1);
  assert.ok(identityGate < orderWrites);
  assert.ok(identityGate < paymentInitialize);
  assert.doesNotMatch(normalFlow.slice(0, identityGate), /dijitalUrunMu\(|sahipUid|saticiUid/);
});
