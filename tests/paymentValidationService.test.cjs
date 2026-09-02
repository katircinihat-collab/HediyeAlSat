const test = require("node:test");
const assert = require("node:assert/strict");
const {
    validateNormalPayment,
    buildIyzicoBasket
} = require("../backend/services/paymentValidationService");
const authMiddleware = require("../backend/middleware/authMiddleware");
const commission = require("../backend/utils/commission");

const user = { uid: "buyer-uid", email: "buyer@example.com" };
const validOrder = {
    id: "order-1",
    alici: user.email,
    satici: "seller@example.com",
    ilanId: "listing-1",
    fiyat: 500,
    adet: 2,
    odemeDurumu: false
};
const validListing = {
    id: "listing-1",
    sahipUid: "seller-uid",
    sahip: "seller@example.com",
    baslik: "Kupa",
    fiyat: 500,
    stok: 4,
    onay: true,
    aktif: true
};

function dependencies(order = validOrder, listing = validListing) {
    return {
        siparisIds: ["order-1"],
        user,
        getOrder: async () => order,
        getListing: async () => listing
    };
}

function multiSellerDependencies(orders, listings) {
    return {
        siparisIds: Object.keys(orders),
        user,
        getOrder: async (orderId) => orders[orderId] || null,
        getListing: async (listingId) => listings[listingId] || null
    };
}

async function rejectsCode(overrides, code) {
    await assert.rejects(
        validateNormalPayment({ ...dependencies(), ...overrides }),
        (error) => error.code === code
    );
}

test("token yoksa ödeme middleware aşamasında başlamaz", async () => {
    let statusCode;
    let responseBody;
    await authMiddleware(
        { headers: {} },
        { status(code) { statusCode = code; return this; }, json(body) { responseBody = body; } },
        () => assert.fail("next çağrılmamalı")
    );
    assert.equal(statusCode, 401);
    assert.equal(responseBody.message, "Token bulunamadı.");
});

test("başka kullanıcı siparişi reddedilir", () => rejectsCode({
    getOrder: async () => ({ ...validOrder, alici: "other@example.com" })
}, "ORDER_FORBIDDEN"));

test("ödenmiş sipariş reddedilir", () => rejectsCode({
    getOrder: async () => ({ ...validOrder, odemeDurumu: true })
}, "ORDER_ALREADY_PAID"));

test("bulunamayan sipariş reddedilir", () => rejectsCode({ getOrder: async () => null }, "ORDER_NOT_FOUND"));
test("bulunamayan ilan reddedilir", () => rejectsCode({ getListing: async () => null }, "LISTING_NOT_FOUND"));
test("pasif ilan reddedilir", () => rejectsCode({
    getListing: async () => ({ ...validListing, aktif: false })
}, "LISTING_INACTIVE"));
test("fiyat uyuşmazlığı reddedilir", () => rejectsCode({
    getOrder: async () => ({ ...validOrder, fiyat: 1 })
}, "PRICE_MISMATCH"));
test("geçersiz adet reddedilir", () => rejectsCode({
    getOrder: async () => ({ ...validOrder, adet: 1.5 })
}, "INVALID_QUANTITY"));
test("yetersiz stok reddedilir", () => rejectsCode({
    getListing: async () => ({ ...validListing, stok: 1 })
}, "INSUFFICIENT_STOCK"));

async function resultForPrice(price) {
    return validateNormalPayment(dependencies(
        { ...validOrder, fiyat: price, adet: 1 },
        { ...validListing, fiyat: price }
    ));
}

test("499,99 TL ürün toplamında 79,90 TL kargoyu alıcı öder", async () => {
    const result = await resultForPrice(499.99);
    assert.equal(result.shipping, 79.90);
    assert.equal(result.shippingDetails[0].shippingPayer, "alici");
    assert.equal(result.payableTotal, 579.89);
});

test("500 TL ürün toplamında kargoyu satıcı karşılar", async () => {
    const result = await resultForPrice(500);
    assert.equal(result.shipping, 0);
    assert.equal(result.shippingDetails[0].shippingPayer, "satici");
    assert.equal(result.payableTotal, 500);
});

test("750 TL ürün toplamında kargoyu satıcı karşılar", async () => {
    const result = await resultForPrice(750);
    assert.equal(result.shipping, 0);
    assert.equal(result.shippingDetails[0].shippingPayer, "satici");
    assert.equal(result.payableTotal, 750);
});

test("client sahte kargo gönderse bile backend kendi kargo kuralını uygular", async () => {
    const result = await validateNormalPayment({ ...dependencies(), shipping: 0, kargo: 0 });
    assert.equal(result.productTotal, 1000);
    assert.equal(result.shipping, 0);
    assert.equal(result.shippingDetails[0].shippingPayer, "satici");
    assert.equal(result.payableTotal, 1000);
});

test("iki satıcının 300 ve 250 TL grupları için toplam 159,80 TL kargo hesaplanır", async () => {
    const result = await validateNormalPayment(multiSellerDependencies({
        "order-a": { ...validOrder, id: "order-a", ilanId: "listing-a", satici: "a@example.com", fiyat: 300, adet: 1 },
        "order-b": { ...validOrder, id: "order-b", ilanId: "listing-b", satici: "b@example.com", fiyat: 250, adet: 1 }
    }, {
        "listing-a": { ...validListing, id: "listing-a", sahipUid: "seller-a", sahip: "a@example.com", fiyat: 300 },
        "listing-b": { ...validListing, id: "listing-b", sahipUid: "seller-b", sahip: "b@example.com", fiyat: 250 }
    }));

    assert.equal(result.productTotal, 550);
    assert.equal(result.shipping, 159.80);
    assert.equal(result.payableTotal, 709.80);
    assert.equal(result.shippingDetails.length, 2);
    assert.deepEqual(result.shippingDetails.map((detail) => detail.shippingPayer), ["alici", "alici"]);
});

test("600 TL ve 200 TL satıcı gruplarında yalnız düşük tutarlı gruba kargo eklenir", async () => {
    const result = await validateNormalPayment(multiSellerDependencies({
        "order-a": { ...validOrder, id: "order-a", ilanId: "listing-a", satici: "a@example.com", fiyat: 600, adet: 1 },
        "order-b": { ...validOrder, id: "order-b", ilanId: "listing-b", satici: "b@example.com", fiyat: 200, adet: 1 }
    }, {
        "listing-a": { ...validListing, id: "listing-a", sahipUid: "seller-a", sahip: "a@example.com", fiyat: 600 },
        "listing-b": { ...validListing, id: "listing-b", sahipUid: "seller-b", sahip: "b@example.com", fiyat: 200 }
    }));

    assert.equal(result.productTotal, 800);
    assert.equal(result.shipping, 79.90);
    assert.equal(result.payableTotal, 879.90);
    assert.deepEqual(result.shippingDetails.map((detail) => detail.shippingPayer), ["satici", "alici"]);
});

test("aynı satıcının 300 ve 250 TL ürünleri tek grupta ücretsiz kargoya ulaşır", async () => {
    const result = await validateNormalPayment(multiSellerDependencies({
        "order-a": { ...validOrder, id: "order-a", ilanId: "listing-a", fiyat: 300, adet: 1 },
        "order-b": { ...validOrder, id: "order-b", ilanId: "listing-b", fiyat: 250, adet: 1 }
    }, {
        "listing-a": { ...validListing, id: "listing-a", fiyat: 300 },
        "listing-b": { ...validListing, id: "listing-b", fiyat: 250 }
    }));

    assert.equal(result.productTotal, 550);
    assert.equal(result.shipping, 0);
    assert.equal(result.payableTotal, 550);
    assert.equal(result.shippingDetails.length, 1);
    assert.equal(result.shippingDetails[0].shippingPayer, "satici");
    assert.ok(result.verifiedItems.every((item) => item.shippingPayer === "satici"));
});

test("client sahte toplam ve kargo gönderse de iki satıcılı tutarlar backend tarafından hesaplanır", async () => {
    const source = multiSellerDependencies({
        "order-a": { ...validOrder, id: "order-a", ilanId: "listing-a", satici: "a@example.com", fiyat: 300, adet: 1 },
        "order-b": { ...validOrder, id: "order-b", ilanId: "listing-b", satici: "b@example.com", fiyat: 250, adet: 1 }
    }, {
        "listing-a": { ...validListing, id: "listing-a", sahipUid: "seller-a", sahip: "a@example.com", fiyat: 300 },
        "listing-b": { ...validListing, id: "listing-b", sahipUid: "seller-b", sahip: "b@example.com", fiyat: 250 }
    });
    const result = await validateNormalPayment({
        ...source,
        shipping: 0,
        kargo: 0,
        paidPrice: 1,
        price: 1,
        basketItems: [{ id: "fake", price: "1.00" }]
    });

    assert.equal(result.shipping, 159.80);
    assert.equal(result.payableTotal, 709.80);
    assert.deepEqual(buildIyzicoBasket(result).map(({ id, price }) => ({ id, price })), [
        { id: "listing-a", price: "300.00" },
        { id: "listing-b", price: "250.00" },
        { id: "KARGO-1", price: "79.90" },
        { id: "KARGO-2", price: "79.90" }
    ]);
});

test("client düşük fiyatı ve sahte basketItems gönderse de güvenilir sepet backend sonucundan üretilir", async () => {
    const clientBody = { price: "1.00", basketItems: [{ id: "fake", price: "1.00" }] };
    const verified = await validateNormalPayment({ ...dependencies(), ...clientBody });
    const basket = buildIyzicoBasket(verified);
    assert.deepEqual(basket.map(({ id, price }) => ({ id, price })), [
        { id: "listing-1", price: "1000.00" }
    ]);
});

test("platform komisyonu kargo hariç yalnız ürün toplamından yüzde 8 hesaplanır", async () => {
    const result = await resultForPrice(400);
    const calculatedCommission = commission.hesaplaKomisyon(result.productTotal);
    assert.equal(result.shipping, 79.90);
    assert.equal(result.payableTotal, 479.90);
    assert.equal(calculatedCommission, 32);
});

test("çok satıcılı kargo bedelleri yüzde 8 komisyon matrahına girmez", async () => {
    const result = await validateNormalPayment(multiSellerDependencies({
        "order-a": { ...validOrder, id: "order-a", ilanId: "listing-a", satici: "a@example.com", fiyat: 300, adet: 1 },
        "order-b": { ...validOrder, id: "order-b", ilanId: "listing-b", satici: "b@example.com", fiyat: 250, adet: 1 }
    }, {
        "listing-a": { ...validListing, id: "listing-a", sahipUid: "seller-a", sahip: "a@example.com", fiyat: 300 },
        "listing-b": { ...validListing, id: "listing-b", sahipUid: "seller-b", sahip: "b@example.com", fiyat: 250 }
    }));

    assert.equal(result.shipping, 159.80);
    assert.equal(commission.hesaplaKomisyon(result.productTotal), 44);
    assert.notEqual(commission.hesaplaKomisyon(result.payableTotal), 44);
});
