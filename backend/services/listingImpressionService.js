class ListingImpressionError extends Error {
    constructor(message, status = 400, code = "IMPRESSION_INVALID") {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function validateListingId(listingId) {
    const value = String(listingId || "").trim();
    if (!value || value.length > 160 || value.includes("/")) {
        throw new ListingImpressionError("Geçersiz ilan kimliği.", 400, "INVALID_LISTING_ID");
    }
    return value;
}

async function recordListingImpression({ firestore, listingId }) {
    const id = validateListingId(listingId);
    const ref = firestore.collection("ilanlar").doc(id);

    return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) {
            throw new ListingImpressionError("İlan bulunamadı.", 404, "LISTING_NOT_FOUND");
        }

        const listing = snapshot.data();
        if (listing.onay !== true || listing.aktif === false) {
            throw new ListingImpressionError("İlan gösterime uygun değil.", 404, "LISTING_NOT_PUBLIC");
        }

        const current = Number(listing.impressionCount || 0);
        const impressionCount = Number.isSafeInteger(current) && current >= 0 ? current + 1 : 1;
        transaction.update(ref, { impressionCount });
        return { listingId: id, impressionCount };
    });
}

module.exports = { ListingImpressionError, recordListingImpression, validateListingId };
