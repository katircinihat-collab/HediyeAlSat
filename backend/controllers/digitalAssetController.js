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

function validateUploadBuffer(body) {
    if (!Buffer.isBuffer(body) || body.length === 0) {
        const error = new Error("Dosya boş olamaz.");
        error.status = 400;
        error.code = "DIGITAL_ASSET_EMPTY";
        throw error;
    }
    if (body.length > MAX_FILE_SIZE) {
        const error = new Error("Dosya en fazla 15 MB olabilir.");
        error.status = 413;
        error.code = "DIGITAL_ASSET_TOO_LARGE";
        throw error;
    }

    const detected = detectFile(body);
    if (!detected) {
        const error = new Error("Yalnız PDF, JPG, JPEG ve PNG dosyaları desteklenir.");
        error.status = 415;
        error.code = "DIGITAL_ASSET_UNSUPPORTED_TYPE";
        throw error;
    }
    return detected;
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

async function uploadAuthenticatedAsset(config, { buffer, detected, publicId }, fetchImpl = fetch) {
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: detected.mimeType }), `original.${detected.format}`);
    form.append("public_id", publicId);
    form.append("type", "authenticated");

    const authorization = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");
    const response = await fetchImpl(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/${detected.resourceType}/upload`,
        {
            method: "POST",
            headers: { Authorization: `Basic ${authorization}` },
            body: form
        }
    );

    let result = null;
    try {
        result = await response.json();
    } catch {
        // Provider cevabı kullanıcıya veya loglara ham olarak taşınmaz.
    }

    if (!response.ok || !result?.public_id) {
        const error = new Error("Korumalı dosya yükleme servisi dosyayı kabul etmedi.");
        error.status = 502;
        error.code = "DIGITAL_ASSET_PROVIDER_UPLOAD_FAILED";
        error.providerStatus = response.status;
        throw error;
    }

    return result;
}

function digitalAssetRecord({ listingId, listing, user, result, detected, fallbackSize }) {
    return {
        listingId,
        sellerUid: user.uid,
        storeId: listing.magazaId || null,
        provider: "cloudinary",
        providerAssetId: result.public_id,
        providerVersion: result.version || null,
        resourceType: result.resource_type || detected.resourceType,
        deliveryType: "authenticated",
        format: detected.format,
        mimeType: detected.mimeType,
        size: result.bytes || fallbackSize,
        status: "ready",
        rightsVersion: listing.hakOnayiSurumu,
        createdAt: FieldValue.serverTimestamp()
    };
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
        const detected = validateUploadBuffer(req.body);

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
        const publicId = `digital-originals/${req.user.uid}/${assetRef.id}`;
        const result = await uploadAuthenticatedAsset(config, {
            buffer: req.body,
            detected,
            publicId
        });

        const uploadedResourceType = result.resource_type || detected.resourceType;
        const batch = firestore.batch();
        batch.set(assetRef, digitalAssetRecord({
            listingId,
            listing,
            user: req.user,
            result,
            detected,
            fallbackSize: req.body.length
        }));
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
        if (error.status) {
            if (error.code === "DIGITAL_ASSET_PROVIDER_UPLOAD_FAILED") {
                console.error("Dijital asset provider yükleme hatası:", {
                    code: error.code,
                    providerStatus: error.providerStatus || null
                });
            }
            return res.status(error.status).json({
                success: false,
                code: error.code || "DIGITAL_ASSET_UPLOAD_FAILED",
                message: error.message
            });
        }
        next(error);
    }
};

exports.status = (_req, res) => {
    res.json({ success: true, configured: Boolean(cloudinaryConfig()) });
};

function ownsPaidOrder(order, user) {
    return order?.odemeDurumu === true && Boolean(
        (user.uid && order.aliciUid === user.uid)
        || (user.email && (order.alici === user.email || order.kullanici === user.email))
    );
}

function privateDownloadUrl(config, asset, now = Date.now()) {
    const timestamp = Math.floor(now / 1000);
    const expiresAt = timestamp + 5 * 60;
    const signed = {
        attachment: true,
        expires_at: expiresAt,
        format: asset.format,
        public_id: asset.providerAssetId,
        timestamp,
        type: "authenticated"
    };
    const params = new URLSearchParams({
        ...Object.fromEntries(Object.entries(signed).map(([key, value]) => [key, String(value)])),
        api_key: config.apiKey,
        signature: signParams(signed, config.apiSecret)
    });
    return {
        url: `https://api.cloudinary.com/v1_1/${config.cloudName}/${asset.resourceType || "image"}/download?${params.toString()}`,
        expiresAt: new Date(expiresAt * 1000).toISOString()
    };
}

exports.download = async (req, res, next) => {
    try {
        const config = cloudinaryConfig();
        if (!config) return res.status(503).json({ success: false, message: "Korumalı dosya servisi henüz yapılandırılmamış." });
        const orderId = String(req.params.orderId || "").trim();
        if (!/^[A-Za-z0-9_-]{6,128}$/.test(orderId)) return res.status(400).json({ success: false, message: "Geçersiz sipariş kimliği." });

        const orderSnap = await firestore.collection("siparisler").doc(orderId).get();
        if (!orderSnap.exists) return res.status(404).json({ success: false, message: "Sipariş bulunamadı." });
        const order = orderSnap.data();
        if (!ownsPaidOrder(order, req.user)) return res.status(403).json({ success: false, message: "Bu dosyaya erişim yetkiniz yok." });

        const listingId = order.ilanId || order.urunId;
        const listingSnap = listingId ? await firestore.collection("ilanlar").doc(listingId).get() : null;
        if (!listingSnap?.exists) return res.status(404).json({ success: false, message: "Dijital ilan bulunamadı." });
        const listing = listingSnap.data();
        if (listing.urunTipi !== "dijital" || listing.fizikselKargo !== false) {
            return res.status(409).json({ success: false, message: "Bu sipariş dijital dosya teslimatına uygun değil." });
        }

        const assetSnap = await firestore.collection("digitalAssets")
            .where("listingId", "==", listingId)
            .where("status", "==", "ready")
            .limit(1)
            .get();
        if (assetSnap.empty) return res.status(404).json({ success: false, message: "Dijital dosya henüz teslimata hazır değil." });
        const asset = assetSnap.docs[0].data();
        if (asset.listingId !== listingId || asset.deliveryType !== "authenticated" || !asset.providerAssetId || !asset.format) {
            return res.status(409).json({ success: false, message: "Dijital dosya kaydı doğrulanamadı." });
        }

        return res.json({ success: true, download: privateDownloadUrl(config, asset) });
    } catch (error) {
        next(error);
    }
};

exports._test = {
    ownsPaidOrder,
    privateDownloadUrl,
    detectFile,
    validateUploadBuffer,
    uploadAuthenticatedAsset,
    digitalAssetRecord,
    MAX_FILE_SIZE
};
