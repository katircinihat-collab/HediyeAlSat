class PaymentValidationError extends Error {
    constructor(message, status = 400, code = "PAYMENT_VALIDATION_FAILED") {
        super(message);
        this.name = "PaymentValidationError";
        this.status = status;
        this.code = code;
    }
}

function numericPrice(value) {
    const price = Number(value);
    return Number.isFinite(price) ? Number(price.toFixed(2)) : NaN;
}

function toKurus(value) {
    return Math.round(Number(value) * 100);
}

function fromKurus(value) {
    return Number((value / 100).toFixed(2));
}

async function validateNormalPayment({ siparisIds, user, getOrder, getListing }) {
    if (!Array.isArray(siparisIds) || siparisIds.length === 0) {
        throw new PaymentValidationError("Ödeme için geçerli sipariş bulunamadı.");
    }

    const uniqueIds = [...new Set(siparisIds)];
    if (uniqueIds.length !== siparisIds.length || uniqueIds.some((id) => typeof id !== "string" || !id.trim())) {
        throw new PaymentValidationError("Geçersiz sipariş bilgisi.");
    }

    const verifiedItems = [];

    for (const siparisId of uniqueIds) {
        const order = await getOrder(siparisId);
        if (!order) throw new PaymentValidationError("Sipariş bulunamadı.", 404, "ORDER_NOT_FOUND");

        const buyerMatches = order.aliciUid
            ? order.aliciUid === user.uid
            : Boolean(user.email && order.alici === user.email);
        if (!buyerMatches) {
            throw new PaymentValidationError("Bu sipariş kullanıcı hesabınıza ait değil.", 403, "ORDER_FORBIDDEN");
        }
        if (order.odemeDurumu === true) {
            throw new PaymentValidationError("Bu siparişin ödemesi daha önce tamamlanmış.", 409, "ORDER_ALREADY_PAID");
        }

        const listingId = order.ilanId || order.urunId;
        const listing = listingId ? await getListing(listingId) : null;
        if (!listing) throw new PaymentValidationError("Siparişe ait ilan bulunamadı.", 404, "LISTING_NOT_FOUND");
        if (listing.onay !== true || listing.aktif === false) {
            throw new PaymentValidationError("İlan aktif değil.", 409, "LISTING_INACTIVE");
        }

        const ownListing = (listing.sahipUid && listing.sahipUid === user.uid)
            || (user.email && listing.sahip === user.email);
        if (ownListing) {
            throw new PaymentValidationError("Kendi ürününüz için ödeme başlatamazsınız.", 403, "OWN_LISTING");
        }

        const quantity = Number(order.adet);
        if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new PaymentValidationError("Geçersiz ürün adedi.", 400, "INVALID_QUANTITY");
        }

        const listingPrice = numericPrice(listing.fiyat);
        const orderPrice = numericPrice(order.fiyat);
        if (!Number.isFinite(listingPrice) || listingPrice <= 0 || orderPrice !== listingPrice) {
            throw new PaymentValidationError("Sipariş fiyatı güncel ilan fiyatıyla uyuşmuyor.", 409, "PRICE_MISMATCH");
        }

        if (listing.urunTipi !== "dijital") {
            const stock = Number(listing.stok ?? listing.adet);
            if (!Number.isInteger(stock) || stock < quantity) {
                throw new PaymentValidationError("Ürün için yeterli stok bulunmuyor.", 409, "INSUFFICIENT_STOCK");
            }
        }

        verifiedItems.push({
            siparisId,
            listingId,
            sellerKey: listing.sahipUid || listing.sahip || order.satici,
            sellerEmail: listing.sahip || order.satici || "",
            name: listing.baslik || order.ilanBaslik || "Ürün",
            unitPrice: listingPrice,
            quantity,
            total: Number((listingPrice * quantity).toFixed(2)),
            itemType: listing.urunTipi === "dijital" ? "VIRTUAL" : "PHYSICAL"
        });
    }

    const sellerGroups = new Map();
    for (const item of verifiedItems) {
        const current = sellerGroups.get(item.sellerKey) || {
            sellerKey: item.sellerKey,
            sellerEmail: item.sellerEmail,
            productTotalKurus: 0,
            orderIds: []
        };
        current.productTotalKurus += toKurus(item.total);
        current.orderIds.push(item.siparisId);
        sellerGroups.set(item.sellerKey, current);
    }

    const shippingDetails = [...sellerGroups.values()].map((group) => {
        const sellerShippingKurus = group.productTotalKurus >= 50000 ? 0 : 7990;
        return {
            sellerKey: group.sellerKey,
            sellerEmail: group.sellerEmail,
            orderIds: group.orderIds,
            sellerProductTotal: fromKurus(group.productTotalKurus),
            sellerShipping: fromKurus(sellerShippingKurus),
            shippingPayer: sellerShippingKurus === 0 ? "satici" : "alici"
        };
    });

    const productTotalKurus = verifiedItems.reduce((sum, item) => sum + toKurus(item.total), 0);
    const shippingKurus = shippingDetails.reduce((sum, detail) => sum + toKurus(detail.sellerShipping), 0);
    const productTotal = fromKurus(productTotalKurus);
    const shipping = fromKurus(shippingKurus);
    const payableTotal = fromKurus(productTotalKurus + shippingKurus);

    for (const item of verifiedItems) {
        item.shippingPayer = shippingDetails.find((detail) => detail.sellerKey === item.sellerKey).shippingPayer;
    }

    return { verifiedItems, shippingDetails, productTotal, shipping, payableTotal };
}

function buildIyzicoBasket(verifiedPayment) {
    const items = verifiedPayment.verifiedItems.map((item) => ({
        id: item.listingId,
        name: item.name,
        category1: "Genel",
        itemType: item.itemType,
        price: item.total.toFixed(2)
    }));

    verifiedPayment.shippingDetails.forEach((detail, index) => {
        if (detail.sellerShipping <= 0) return;
        items.push({
            id: `KARGO-${index + 1}`,
            name: "Kargo Ücreti",
            category1: "Kargo",
            itemType: "VIRTUAL",
            price: detail.sellerShipping.toFixed(2)
        });
    });
    return items;
}

module.exports = { PaymentValidationError, validateNormalPayment, buildIyzicoBasket };
