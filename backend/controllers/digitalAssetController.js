const crypto = require("crypto");
const { firestore, FieldValue } = require("../config/firebase");

const MAX_FILE_SIZE = 15 * 1024 * 1024;

function detectFile(buffer) {
    if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
        return { format: "pdf", mimeType: "application/pdf", resourceType: "image" };
    }
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
        return { format: "png", mimeType: "image/png", resourceType: "image" };
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { format: "jpg", mimeType: "image/jpeg", resourceType: "image" };
    }
    return null;
}

function cloudinaryConfig() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

function signParams(params, apiSecret) {
    const value = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
    return crypto.createHash("sha1").update(`${value}${apiSecret}`).digest("hex");
}

async function destroyAuthenticatedAsset(config, publicId, resourceType) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signed = { public_id: publicId, timestamp, type: "authenticated" };
    const form = new FormData();

    form.append("public_id", publicId);
    form.append("resource_type", resourceType);
    form.append("type", "authenticated");
    form.append("api_key", config.apiKey);
    form.append("timestamp", String(timestamp));
    form.append("signature", signParams(signed, config.apiSecret));

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`,
        { method: "POST", body: form }
    );
    const result = await response.json();

    if (!response.ok || !["ok", "not found"].includes(result.result)) {
        throw new Error(result?.error?.message || "Cloudinary orphan asset temizlenemedi.");
    }
}

async function ownsListingAndStore(listing, listingId, user) {
    const ownsListing = listing.sahipUid === user.uid
        || (!listing.sahipUid && user.email && listing.sahip === user.email);
    if (!ownsListing) return false;
    if (!listing.magazaId) return true;

    const snap = await firestore.collection("magazalar").doc(listing.magazaId).get();
    if (!snap.exists) return false;
    const store = snap.data();
    return store.aktif !== false && (
        store.sahipUid === user.uid
        || (!store.sahipUid && user.email && store.sahip === user.email)
        || (!store.sahipUid && user.email && listing.magazaId === user.email)
    );
}

exports.upload = async (req, res, next) => {
    try {
        const config = cloudinaryConfig();
        if (!config) {
            return res.status(503).json({ success: false, message: "Korumalı dosya servisi henüz yapılandırılmamış." });
        }

        const listingId = String(req.params.listingId || "").trim();
        if (!/^[A-Za-z0-9_-]{6,128}$/.test(listingId)) {
            return res.status(400).json({ success: false, message: "Geçersiz ilan kimliği." });
        }
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
            return res.status(400).json({ success: false, message: "Dosya boş olamaz." });
        }
        if (req.body.length > MAX_FILE_SIZE) {
            return res.status(413).json({ success: false, message: "Dosya en fazla 15 MB olabilir." });
        }

        const detected = detectFile(req.body);
        if (!detected) {
            return res.status(415).json({ success: false, message: "Yalnız PDF, JPG, JPEG ve PNG dosyaları desteklenir." });
        }

        const listingRef = firestore.collection("ilanlar").doc(listingId);
        const listingSnap = await listingRef.get();
        if (!listingSnap.exists) return res.status(404).json({ success: false, message: "İlan bulunamadı." });

        const listing = listingSnap.data();
        if (listing.urunTipi !== "dijital" || listing.hakOnayi !== true) {
            return res.status(409).json({ success: false, message: "İlan dijital ürün yüklemeye uygun değil." });
        }
        if (!(await ownsListingAndStore(listing, listingId, req.user))) {
            return res.status(403).json({ success: false, message: "Bu ilana dosya yükleme yetkiniz yok." });
        }

        const assetRef = firestore.collection("digitalAssets").doc();
        const timestamp = Math.floor(Date.now() / 1000);
        const publicId = `digital-originals/${req.user.uid}/${assetRef.id}`;
        const signed = { public_id: publicId, timestamp, type: "authenticated" };
        const form = new FormData();
        form.append("file", new Blob([req.body], { type: detected.mimeType }), `original.${detected.format}`);
        form.append("api_key", config.apiKey);
        form.append("timestamp", String(timestamp));
        form.append("public_id", publicId);
        form.append("type", "authenticated");
        form.append("signature", signParams(signed, config.apiSecret));

        const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/${detected.resourceType}/upload`, { method: "POST", body: form });
        const result = await response.json();
        if (!response.ok || !result.public_id) {
            const error = new Error(result?.error?.message || "Korumalı dosya yüklenemedi.");
            error.status = 502;
            throw error;
        }

        const uploadedResourceType = result.resource_type || detected.resourceType;
        const batch = firestore.batch();
        batch.set(assetRef, {
            listingId,
            sellerUid: req.user.uid,
            storeId: listing.magazaId || null,
            provider: "cloudinary",
            providerAssetId: result.public_id,
            providerVersion: result.version || null,
            resourceType: uploadedResourceType,
            deliveryType: "authenticated",
            format: detected.format,
            mimeType: detected.mimeType,
            size: result.bytes || req.body.length,
            status: "ready",
            rightsVersion: listing.hakOnayiSurumu,
            createdAt: FieldValue.serverTimestamp()
        });
        batch.update(listingRef, {
            dijitalDosyaDurumu: "hazir",
            dijitalDosyaGuncellemeTarihi: FieldValue.serverTimestamp()
        });
        try {
            await batch.commit();
        } catch (firestoreError) {
            try {
                await destroyAuthenticatedAsset(config, result.public_id, uploadedResourceType);
            } catch (cleanupError) {
                console.error("Cloudinary orphan asset cleanup hatası:", cleanupError);
            }

            throw firestoreError;
        }

        return res.status(201).json({ success: true, asset: { id: assetRef.id, format: detected.format, size: result.bytes || req.body.length, status: "ready" } });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

exports.status = (_req, res) => {
    res.json({ success: true, configured: Boolean(cloudinaryConfig()) });
};
