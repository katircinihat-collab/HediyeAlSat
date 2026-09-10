const { hesaplaNetTutar } = require("../utils/commission");

const SELLER_PAYMENT_PROFILES = "sellerPaymentProfiles";

class SellerMarketplaceError extends Error {
    constructor(message, status = 409, code = "SELLER_PAYMENT_NOT_READY", missingFields = []) {
        super(message);
        this.status = status;
        this.code = code;
        this.missingFields = missingFields;
    }
}

async function resolveSellerSubMerchantKey({ firestore, sellerUid }) {
    if (!sellerUid) return null;

    const snapshot = await firestore
        .collection(SELLER_PAYMENT_PROFILES)
        .doc(sellerUid)
        .get();

    if (!snapshot.exists) return null;

    const profile = snapshot.data() || {};
    const key = typeof profile.subMerchantKey === "string"
        ? profile.subMerchantKey.trim()
        : "";

    return profile.active === true && key ? key : null;
}

function getPlatformSellerUids(environment = process.env) {
    return new Set(
        String(environment.PLATFORM_SELLER_UIDS || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
    );
}

function isPlatformSeller(sellerUid, platformSellerUids = getPlatformSellerUids()) {
    return Boolean(sellerUid) && platformSellerUids.has(sellerUid);
}

async function attachMarketplaceSettlement({
    verifiedItems,
    resolveSubMerchantKey,
    platformSellerUids = getPlatformSellerUids()
}) {
    const sellerKeys = new Map();
    const platformFlags = verifiedItems.map((item) => isPlatformSeller(item.sellerUid, platformSellerUids));

    if (platformFlags.some(Boolean) && !platformFlags.every(Boolean)) {
        throw new SellerMarketplaceError(
            "Platform ve pazaryeri ürünleri aynı ödemede birlikte işlenemiyor.",
            409,
            "MIXED_PLATFORM_MARKETPLACE_UNSUPPORTED"
        );
    }

    if (platformFlags.every(Boolean)) {
        return {
            items: verifiedItems.map((item) => {
                const platformItem = { ...item };
                delete platformItem.subMerchantKey;
                delete platformItem.subMerchantPrice;
                return platformItem;
            }),
            paymentGroup: "LISTING"
        };
    }

    for (const item of verifiedItems) {
        if (!item.sellerUid) {
            throw new SellerMarketplaceError("Satıcının ödeme hesabı henüz aktif değil.");
        }

        if (!sellerKeys.has(item.sellerUid)) {
            sellerKeys.set(
                item.sellerUid,
                await resolveSubMerchantKey({ sellerUid: item.sellerUid, storeId: item.storeId || null })
            );
        }

        const subMerchantKey = sellerKeys.get(item.sellerUid);
        if (!subMerchantKey) {
            throw new SellerMarketplaceError("Satıcının ödeme hesabı henüz aktif değil.");
        }
    }

    return {
        items: verifiedItems.map((item) => ({
            ...item,
            subMerchantKey: sellerKeys.get(item.sellerUid),
            subMerchantPrice: hesaplaNetTutar(item.total)
        })),
        paymentGroup: "PRODUCT"
    };
}

module.exports = {
    SellerMarketplaceError,
    SELLER_PAYMENT_PROFILES,
    resolveSellerSubMerchantKey,
    attachMarketplaceSettlement,
    getPlatformSellerUids,
    isPlatformSeller
};
