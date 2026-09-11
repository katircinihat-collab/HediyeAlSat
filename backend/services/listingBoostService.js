const boostConfig = require("../../shared/listingBoostPackages.json");
const { isListingPublished } = require("../utils/listingAvailability");

const DAY_MS = 24 * 60 * 60 * 1000;
const PACKAGES = new Map(boostConfig.packages.map((item) => [item.id, Object.freeze({ ...item })]));

class ListingBoostError extends Error {
    constructor(message, status = 400, code = "LISTING_BOOST_INVALID") {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function getListingBoostPackage(packageId) {
    const selected = PACKAGES.get(String(packageId || ""));
    if (!selected) throw new ListingBoostError("Geçersiz öne çıkarma paketi.", 400, "LISTING_BOOST_PACKAGE_INVALID");
    return selected;
}

function ownerMatches(listing, user) {
    if (listing?.sahipUid) return listing.sahipUid === user?.uid;
    return Boolean(user?.email && listing?.sahip === user.email);
}

async function prepareListingBoost({ firestore, listingId, packageId, user }) {
    if (!listingId || typeof listingId !== "string") {
        throw new ListingBoostError("Geçerli bir ilan seçin.", 400, "LISTING_BOOST_LISTING_INVALID");
    }
    const selectedPackage = getListingBoostPackage(packageId);
    const snapshot = await firestore.collection("ilanlar").doc(listingId).get();
    if (!snapshot.exists) throw new ListingBoostError("İlan bulunamadı.", 404, "LISTING_NOT_FOUND");
    const listing = { id: snapshot.id, ...snapshot.data() };
    if (!ownerMatches(listing, user)) {
        throw new ListingBoostError("Yalnız kendi ilanınızı öne çıkarabilirsiniz.", 403, "LISTING_BOOST_FORBIDDEN");
    }
    if (!isListingPublished(listing)) {
        throw new ListingBoostError("Yalnız yayındaki ilanlar öne çıkarılabilir.", 409, "LISTING_BOOST_NOT_ELIGIBLE");
    }
    return { listing, package: selectedPackage };
}

function dateMs(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    if (typeof value.seconds === "number") return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

function buildListingBoostPeriod(listing, selectedPackage, finalizedAt = new Date()) {
    const paidAt = finalizedAt instanceof Date ? finalizedAt : new Date(finalizedAt);
    const currentEnd = dateMs(listing?.boostEndAt);
    const startsAtMs = Math.max(paidAt.getTime(), currentEnd);
    return {
        purchasedAt: paidAt,
        benefitStartAt: new Date(startsAtMs),
        endAt: new Date(startsAtMs + selectedPackage.days * DAY_MS)
    };
}

function isListingBoostActive(listing, now = Date.now()) {
    return listing?.boostActive === true && dateMs(listing.boostEndAt) > now;
}

function buildListingBoostPaymentData(listing, selectedPackage) {
    return {
        price: selectedPackage.price,
        paymentGroup: "LISTING",
        basketItems: [{
            id: `BOOST-${listing.id}-${selectedPackage.id}`,
            name: selectedPackage.title,
            category1: "İlan Öne Çıkarma",
            category2: "Reklam Hizmeti",
            itemType: "VIRTUAL",
            price: selectedPackage.price.toFixed(2)
        }]
    };
}

module.exports = {
    DAY_MS,
    ListingBoostError,
    getListingBoostPackage,
    prepareListingBoost,
    buildListingBoostPeriod,
    isListingBoostActive,
    buildListingBoostPaymentData,
    ownerMatches
};
