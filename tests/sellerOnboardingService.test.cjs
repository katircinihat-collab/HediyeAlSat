const test = require("node:test");
const assert = require("node:assert/strict");
const {
    ensureSellerMarketplaceProfile,
    _test: { stableExternalId, prepareOnboardingRequest }
} = require("../backend/services/sellerOnboardingService");

const validSources = {
    authUser: { email: "seller@example.com", displayName: "Ada Satıcı" },
    profile: { telefon: "05324093233" },
    store: { magazaAdi: "Ada Hediye" },
    wallet: { iban: "TR330006100519786457841326" },
    identityNumber: "10000000146"
};

test("external id seller UID'den deterministik üretilir", () => {
    assert.equal(stableExternalId("seller_123"), "hediyealsat_seller_123");
    assert.equal(stableExternalId("seller_123"), stableExternalId("seller_123"));
});

test("satıcı tipi tahmin edilmez ve eksik bilgi provider öncesi reddedilir", () => {
    assert.throws(
        () => prepareOnboardingRequest({ sellerUid: "seller_123", sources: validSources, input: {} }),
        (error) => error.code === "SELLER_MARKETPLACE_INFO_INCOMPLETE"
            && error.missingFields.includes("subMerchantType")
    );
});

test("PERSONAL request resmi iyzico alanlarını ve normalize değerleri taşır", () => {
    const request = prepareOnboardingRequest({
        sellerUid: "seller_123",
        sources: validSources,
        input: { subMerchantType: "PERSONAL", address: "Sakarya Serdivan" }
    });
    assert.equal(request.subMerchantType, "PERSONAL");
    assert.equal(request.subMerchantExternalId, "hediyealsat_seller_123");
    assert.equal(request.gsmNumber, "+905324093233");
    assert.equal(request.currency, "TRY");
    assert.equal(request.contactName, "Ada");
    assert.equal(request.contactSurname, "Satıcı");
    assert.equal(request.identityNumber, "10000000146");
});

test("aktif profile varsa provider create çağrılmaz ve key response'a çıkmaz", async () => {
    let createCalls = 0;
    const result = await ensureSellerMarketplaceProfile("seller_123", {}, {
        getExisting: async () => ({ active: true, subMerchantKey: "secret-key" }),
        create: async () => { createCalls += 1; }
    });
    assert.deepEqual(result, { status: "active" });
    assert.equal(createCalls, 0);
    assert.equal(JSON.stringify(result).includes("secret-key"), false);
});

test("eksik bilgi varsa retrieve/create çağrısı yapılmaz", async () => {
    let providerCalls = 0;
    await assert.rejects(
        ensureSellerMarketplaceProfile("seller_123", {}, {
            getExisting: async () => null,
            loadSellerSources: async () => validSources,
            retrieve: async () => { providerCalls += 1; },
            create: async () => { providerCalls += 1; }
        }),
        (error) => error.code === "SELLER_MARKETPLACE_INFO_INCOMPLETE"
    );
    assert.equal(providerCalls, 0);
});

test("create success private key'i finalize eder fakat response'a sızdırmaz", async () => {
    let finalized;
    let createCalls = 0;
    const result = await ensureSellerMarketplaceProfile("seller_123", {
        subMerchantType: "PERSONAL",
        address: "Sakarya Serdivan"
    }, {
        getExisting: async () => null,
        loadSellerSources: async () => validSources,
        acquireLock: async () => true,
        retrieve: async () => ({ status: "failure", errorCode: "2001" }),
        create: async () => { createCalls += 1; return { status: "success", subMerchantKey: "private-secret" }; },
        finalize: async (value) => { finalized = value; }
    });
    assert.equal(createCalls, 1);
    assert.equal(finalized.subMerchantKey, "private-secret");
    assert.deepEqual(result, { status: "active" });
    assert.equal(JSON.stringify(result).includes("private-secret"), false);
});

test("provider retrieve mevcut kaydı bulursa tekrar create etmez", async () => {
    let createCalls = 0;
    await ensureSellerMarketplaceProfile("seller_123", {
        subMerchantType: "PERSONAL",
        address: "Sakarya Serdivan"
    }, {
        getExisting: async () => null,
        loadSellerSources: async () => validSources,
        acquireLock: async () => true,
        retrieve: async () => ({ status: "success", subMerchantKey: "existing-private" }),
        create: async () => { createCalls += 1; },
        finalize: async () => {}
    });
    assert.equal(createCalls, 0);
});

test("eşzamanlı onboarding lock kazanılmazsa provider çağrısı yapılmaz", async () => {
    let providerCalls = 0;
    const result = await ensureSellerMarketplaceProfile("seller_123", {
        subMerchantType: "PERSONAL",
        address: "Sakarya Serdivan"
    }, {
        getExisting: async () => null,
        loadSellerSources: async () => validSources,
        acquireLock: async () => false,
        retrieve: async () => { providerCalls += 1; },
        create: async () => { providerCalls += 1; }
    });
    assert.deepEqual(result, { status: "active" });
    assert.equal(providerCalls, 0);
});

test("kaydedilmiş submerchant tipi sonradan değiştirilemez", async () => {
    await assert.rejects(
        ensureSellerMarketplaceProfile("seller_123", { subMerchantType: "PRIVATE_COMPANY" }, {
            getExisting: async () => ({ active: false, subMerchantType: "PERSONAL" })
        }),
        (error) => error.code === "SELLER_MARKETPLACE_TYPE_IMMUTABLE"
    );
});
