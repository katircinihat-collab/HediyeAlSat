const test = require("node:test");
const assert = require("node:assert/strict");
const {
    attachMarketplaceSettlement
} = require("../backend/services/sellerMarketplaceService");
const { buildIyzicoBasket } = require("../backend/services/paymentValidationService");

function item(overrides = {}) {
    return {
        siparisId: "order-1",
        listingId: "listing-1",
        sellerUid: "seller-1",
        storeId: "store-1",
        name: "Poster",
        total: 50,
        isDigital: false,
        itemType: "PHYSICAL",
        ...overrides
    };
}

test("seller subMerchantKey ve yüzde 8 sonrası tutar basket item'a server-side eklenir", async () => {
    const settlement = await attachMarketplaceSettlement({
        verifiedItems: [item()],
        resolveSubMerchantKey: async ({ sellerUid }) => sellerUid === "seller-1" ? "private-key-1" : null
    });
    const basket = buildIyzicoBasket({ verifiedItems: settlement.items, shippingDetails: [] });
    assert.equal(settlement.paymentGroup, "PRODUCT");

    assert.deepEqual(basket[0], {
        id: "listing-1",
        name: "Poster",
        category1: "Genel",
        itemType: "PHYSICAL",
        price: "50.00",
        subMerchantKey: "private-key-1",
        subMerchantPrice: "46.00"
    });
});

test("client alanları key kaynağı değildir", async () => {
    const settlement = await attachMarketplaceSettlement({
        verifiedItems: [item({ subMerchantKey: "client-forged", subMerchantPrice: 1 })],
        resolveSubMerchantKey: async () => "server-key"
    });

    assert.equal(settlement.items[0].subMerchantKey, "server-key");
    assert.equal(settlement.items[0].subMerchantPrice, 46);
});

test("key yoksa provider çağrısından önce güvenli hata verir", async () => {
    await assert.rejects(
        attachMarketplaceSettlement({
            verifiedItems: [item()],
            resolveSubMerchantKey: async () => null
        }),
        (error) => error.code === "SELLER_PAYMENT_NOT_READY"
            && error.status === 409
            && !error.message.includes("private")
    );
});

test("multi-seller ve dijital item kendi seller key'lerini kullanır", async () => {
    const settlement = await attachMarketplaceSettlement({
        verifiedItems: [
            item(),
            item({ listingId: "listing-2", sellerUid: "seller-2", total: 100, isDigital: true, itemType: "VIRTUAL" })
        ],
        resolveSubMerchantKey: async ({ sellerUid }) => `${sellerUid}-key`
    });
    const basket = buildIyzicoBasket({ verifiedItems: settlement.items, shippingDetails: [] });

    assert.equal(basket[0].subMerchantKey, "seller-1-key");
    assert.equal(basket[0].subMerchantPrice, "46.00");
    assert.equal(basket[1].subMerchantKey, "seller-2-key");
    assert.equal(basket[1].subMerchantPrice, "92.00");
    assert.equal(basket[1].itemType, "VIRTUAL");
});

test("platform-owned sepet LISTING olur ve submerchant alanı taşımaz", async () => {
    const settlement = await attachMarketplaceSettlement({
        verifiedItems: [item({ subMerchantKey: "forged", subMerchantPrice: 1 })],
        resolveSubMerchantKey: async () => { throw new Error("çağrılmamalı"); },
        platformSellerUids: new Set(["seller-1"])
    });
    const basket = buildIyzicoBasket({ verifiedItems: settlement.items, shippingDetails: [] });
    assert.equal(settlement.paymentGroup, "LISTING");
    assert.equal("subMerchantKey" in basket[0], false);
    assert.equal("subMerchantPrice" in basket[0], false);
});

test("platform ve normal seller aynı sepette güvenli biçimde reddedilir", async () => {
    await assert.rejects(
        attachMarketplaceSettlement({
            verifiedItems: [item(), item({ sellerUid: "seller-2" })],
            resolveSubMerchantKey: async () => "key",
            platformSellerUids: new Set(["seller-1"])
        }),
        (error) => error.code === "MIXED_PLATFORM_MARKETPLACE_UNSUPPORTED"
    );
});

test("aynı seller için resolver yalnız bir kez çağrılır", async () => {
    let calls = 0;
    await attachMarketplaceSettlement({
        verifiedItems: [item(), item({ listingId: "listing-2" })],
        resolveSubMerchantKey: async () => { calls += 1; return "server-key"; }
    });
    assert.equal(calls, 1);
});
