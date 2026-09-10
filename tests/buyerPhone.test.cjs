const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeIyzicoGsmNumber } = require("../backend/utils/buyerPhone");

test("Türkiye cep telefonu numarasını iyzico formatına dönüştürür", () => {
    assert.equal(normalizeIyzicoGsmNumber("0532 409 32 33"), "+905324093233");
    assert.equal(normalizeIyzicoGsmNumber("5324093233"), "+905324093233");
    assert.equal(normalizeIyzicoGsmNumber("+90 532 409 32 33"), "+905324093233");
});

test("geçersiz telefon numarasını reddeder", () => {
    assert.equal(normalizeIyzicoGsmNumber(""), null);
    assert.equal(normalizeIyzicoGsmNumber("123456"), null);
    assert.equal(normalizeIyzicoGsmNumber("0212 123 45 67"), null);
});
