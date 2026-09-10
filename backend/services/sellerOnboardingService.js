const crypto = require("crypto");
const iyzipay = require("../config/iyzico");
const { admin, firestore, FieldValue } = require("../config/firebase");
const { normalizeIyzicoGsmNumber } = require("../utils/buyerPhone");
const { normalizeTurkishIban, isValidTurkishIban } = require("../utils/iban");
const { resolveBuyerIdentity } = require("./buyerIdentityService");
const {
    SELLER_PAYMENT_PROFILES,
    SellerMarketplaceError
} = require("./sellerMarketplaceService");

const PROVIDER = "iyzico";
const LOCK_MS = 2 * 60 * 1000;
const SUB_MERCHANT_TYPES = new Set([
    "PERSONAL",
    "PRIVATE_COMPANY",
    "LIMITED_OR_JOINT_STOCK_COMPANY"
]);

function stableExternalId(sellerUid) {
    const uid = String(sellerUid || "").trim();
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(uid)) {
        throw new SellerMarketplaceError("Satıcı kimliği geçersiz.", 400, "SELLER_UID_INVALID");
    }
    return `hediyealsat_${uid}`;
}

function clean(value) {
    return typeof value === "string" ? value.trim() : "";
}

function prepareOnboardingRequest({ sellerUid, sources = {}, input = {} }) {
    const profile = sources.profile || {};
    const store = sources.store || {};
    const wallet = sources.wallet || {};
    const authUser = sources.authUser || {};
    const subMerchantType = clean(input.subMerchantType || profile.subMerchantType).toUpperCase();
    const fullName = clean(input.fullName || profile.adSoyad || profile.ad || authUser.displayName);
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const name = clean(input.name) || nameParts[0] || "";
    const surname = clean(input.surname) || nameParts.slice(1).join(" ");
    const email = clean(authUser.email || profile.email);
    const gsmNumber = normalizeIyzicoGsmNumber(input.gsmNumber || profile.telefon || profile.phone);
    const address = clean(input.address || profile.acikAdres || profile.adres);
    const iban = normalizeTurkishIban(input.iban || wallet.iban);
    const identityNumber = clean(sources.identityNumber);
    const taxOffice = clean(input.taxOffice);
    const taxNumber = clean(input.taxNumber);
    const legalCompanyTitle = clean(input.legalCompanyTitle || store.magazaAdi);
    const missingFields = [];

    if (!clean(store.magazaAdi) && !clean(store.name)) missingFields.push("store");
    if (!SUB_MERCHANT_TYPES.has(subMerchantType)) missingFields.push("subMerchantType");
    if (!name) missingFields.push("name");
    if (!email) missingFields.push("email");
    if (!gsmNumber) missingFields.push("gsmNumber");
    if (!address) missingFields.push("address");
    if (!isValidTurkishIban(iban)) missingFields.push("iban");

    if (subMerchantType === "PERSONAL") {
        if (!surname) missingFields.push("surname");
        if (!identityNumber) missingFields.push("identityNumber");
    } else if (subMerchantType === "PRIVATE_COMPANY") {
        if (!identityNumber) missingFields.push("identityNumber");
        if (!taxOffice) missingFields.push("taxOffice");
        if (!legalCompanyTitle) missingFields.push("legalCompanyTitle");
    } else if (subMerchantType === "LIMITED_OR_JOINT_STOCK_COMPANY") {
        if (!taxOffice) missingFields.push("taxOffice");
        if (!taxNumber) missingFields.push("taxNumber");
        if (!legalCompanyTitle) missingFields.push("legalCompanyTitle");
    }

    if (missingFields.length) {
        throw new SellerMarketplaceError(
            "Satıcı ödeme hesabı bilgileri eksik.",
            409,
            "SELLER_MARKETPLACE_INFO_INCOMPLETE",
            [...new Set(missingFields)]
        );
    }

    return {
        locale: "tr",
        conversationId: `seller_${crypto.randomUUID()}`,
        subMerchantExternalId: stableExternalId(sellerUid),
        subMerchantType,
        name,
        email,
        gsmNumber,
        address,
        iban,
        currency: "TRY",
        ...(subMerchantType === "PERSONAL" ? {
            contactName: name,
            contactSurname: surname,
            identityNumber
        } : {}),
        ...(subMerchantType === "PRIVATE_COMPANY" ? {
            taxOffice,
            legalCompanyTitle,
            identityNumber
        } : {}),
        ...(subMerchantType === "LIMITED_OR_JOINT_STOCK_COMPANY" ? {
            taxOffice,
            taxNumber,
            legalCompanyTitle
        } : {})
    };
}

async function loadSellerSources(sellerUid, input, dependencies = {}) {
    const database = dependencies.firestore || firestore;
    const auth = dependencies.auth || admin.auth();
    const authUser = await auth.getUser(sellerUid);
    const [profileSnap, storeQuery, walletQuery] = await Promise.all([
        database.collection("profiller").doc(sellerUid).get(),
        database.collection("magazalar").where("sahipUid", "==", sellerUid).limit(1).get(),
        database.collection("wallets").where("ownerUid", "==", sellerUid).limit(1).get()
    ]);
    let walletSnap = walletQuery.empty ? null : walletQuery.docs[0];
    if (!walletSnap && authUser.email) {
        const legacy = await database.collection("wallets").doc(authUser.email).get();
        walletSnap = legacy.exists ? legacy : null;
    }
    const requestedType = clean(input.subMerchantType).toUpperCase();
    const needsIdentity = requestedType === "PERSONAL" || requestedType === "PRIVATE_COMPANY";
    let identityNumber = "";
    if (needsIdentity) {
        try {
            identityNumber = await (dependencies.resolveBuyerIdentity || resolveBuyerIdentity)(sellerUid);
        } catch {
            identityNumber = "";
        }
    }
    return {
        authUser,
        profile: profileSnap.exists ? profileSnap.data() : {},
        store: storeQuery.empty ? {} : storeQuery.docs[0].data(),
        wallet: walletSnap ? walletSnap.data() : {},
        identityNumber
    };
}

function providerCall(method, request, client = iyzipay) {
    if (!client?.subMerchant?.[method]) {
        throw new SellerMarketplaceError("Satıcı ödeme sağlayıcısı yapılandırılmamış.", 503, "SELLER_MARKETPLACE_PROVIDER_UNAVAILABLE");
    }
    return new Promise((resolve, reject) => {
        client.subMerchant[method](request, (error, result) => error ? reject(error) : resolve(result));
    });
}

function extractProviderKey(result) {
    return result?.status === "success" && typeof result.subMerchantKey === "string"
        ? result.subMerchantKey.trim()
        : "";
}

async function defaultGetExisting(sellerUid, database = firestore) {
    const snapshot = await database.collection(SELLER_PAYMENT_PROFILES).doc(sellerUid).get();
    return snapshot.exists ? snapshot.data() : null;
}

async function defaultAcquireLock({ sellerUid, subMerchantExternalId, subMerchantType, attemptId, database = firestore }) {
    const ref = database.collection(SELLER_PAYMENT_PROFILES).doc(sellerUid);
    return database.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const current = snapshot.exists ? snapshot.data() : {};
        if (current.active === true && clean(current.subMerchantKey)) return false;
        const lockExpiresAt = current.lockExpiresAt?.toMillis?.() || 0;
        if (current.status === "creating" && lockExpiresAt > Date.now()) {
            throw new SellerMarketplaceError("Satıcı ödeme hesabı oluşturuluyor.", 409, "SELLER_MARKETPLACE_ONBOARDING_IN_PROGRESS");
        }
        transaction.set(ref, {
            sellerUid,
            provider: PROVIDER,
            subMerchantExternalId,
            subMerchantType,
            status: "creating",
            active: false,
            onboardingAttemptId: attemptId,
            lockExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + LOCK_MS),
            createdAt: current.createdAt || FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
    });
}

async function defaultFinalize({ sellerUid, attemptId, request, subMerchantKey, database = firestore }) {
    const ref = database.collection(SELLER_PAYMENT_PROFILES).doc(sellerUid);
    await database.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const current = snapshot.data() || {};
        if (current.onboardingAttemptId !== attemptId && current.active !== true) {
            throw new SellerMarketplaceError("Satıcı ödeme hesabı işlemi değişti.", 409, "SELLER_MARKETPLACE_ONBOARDING_CONFLICT");
        }
        transaction.set(ref, {
            sellerUid,
            provider: PROVIDER,
            subMerchantExternalId: request.subMerchantExternalId,
            subMerchantKey,
            subMerchantType: request.subMerchantType,
            status: "active",
            active: true,
            providerCreatedAt: current.providerCreatedAt || FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            onboardingAttemptId: FieldValue.delete(),
            lockExpiresAt: FieldValue.delete(),
            lastErrorCode: FieldValue.delete()
        }, { merge: true });
    });
}

async function defaultMarkFailed({ sellerUid, attemptId, errorCode, database = firestore }) {
    const ref = database.collection(SELLER_PAYMENT_PROFILES).doc(sellerUid);
    await database.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const current = snapshot.exists ? snapshot.data() : {};
        if (current.onboardingAttemptId !== attemptId || current.active === true) return;
        transaction.set(ref, {
            status: "failed",
            active: false,
            lastErrorCode: clean(errorCode) || "SELLER_MARKETPLACE_PROVIDER_ERROR",
            updatedAt: FieldValue.serverTimestamp(),
            onboardingAttemptId: FieldValue.delete(),
            lockExpiresAt: FieldValue.delete()
        }, { merge: true });
    });
}

async function ensureSellerMarketplaceProfile(sellerUid, input = {}, dependencies = {}) {
    const getExisting = dependencies.getExisting || ((uid) => defaultGetExisting(uid, dependencies.firestore || firestore));
    const existing = await getExisting(sellerUid);
    if (existing?.active === true && clean(existing.subMerchantKey)) return { status: "active" };

    const requestedType = clean(input.subMerchantType).toUpperCase();
    const existingType = clean(existing?.subMerchantType).toUpperCase();
    if (existingType && requestedType && existingType !== requestedType) {
        throw new SellerMarketplaceError(
            "Satıcı ödeme hesabı tipi değiştirilemez.",
            409,
            "SELLER_MARKETPLACE_TYPE_IMMUTABLE"
        );
    }
    const effectiveInput = {
        ...input,
        subMerchantType: existingType || requestedType
    };

    const sources = dependencies.loadSellerSources
        ? await dependencies.loadSellerSources(sellerUid, effectiveInput)
        : await loadSellerSources(sellerUid, effectiveInput, dependencies);
    const request = prepareOnboardingRequest({ sellerUid, sources, input: effectiveInput });
    const attemptId = crypto.randomUUID();
    const acquireLock = dependencies.acquireLock || ((args) => defaultAcquireLock({ ...args, database: dependencies.firestore || firestore }));
    const finalize = dependencies.finalize || ((args) => defaultFinalize({ ...args, database: dependencies.firestore || firestore }));
    const acquired = await acquireLock({
        sellerUid,
        subMerchantExternalId: request.subMerchantExternalId,
        subMerchantType: request.subMerchantType,
        attemptId
    });
    if (acquired === false) return { status: "active" };

    const retrieve = dependencies.retrieve || ((payload) => providerCall("retrieve", payload, dependencies.iyzipay || iyzipay));
    const create = dependencies.create || ((payload) => providerCall("create", payload, dependencies.iyzipay || iyzipay));
    const markFailed = dependencies.markFailed || ((args) => defaultMarkFailed({ ...args, database: dependencies.firestore || firestore }));
    let result;
    try {
        const retrieved = await retrieve({
            locale: "tr",
            conversationId: request.conversationId,
            subMerchantExternalId: request.subMerchantExternalId
        });
        result = extractProviderKey(retrieved) ? retrieved : await create(request);
    } catch {
        await markFailed({ sellerUid, attemptId, errorCode: "SELLER_MARKETPLACE_PROVIDER_ERROR" });
        throw new SellerMarketplaceError("Satıcı ödeme hesabı oluşturulamadı.", 502, "SELLER_MARKETPLACE_PROVIDER_ERROR");
    }
    const subMerchantKey = extractProviderKey(result);
    if (!subMerchantKey) {
        await markFailed({
            sellerUid,
            attemptId,
            errorCode: clean(result?.errorCode) || "SELLER_MARKETPLACE_PROVIDER_REJECTED"
        });
        throw new SellerMarketplaceError("Satıcı ödeme hesabı etkinleştirilemedi.", 409, "SELLER_MARKETPLACE_PROVIDER_REJECTED");
    }
    await finalize({ sellerUid, attemptId, request, subMerchantKey });
    return { status: "active" };
}

module.exports = {
    ensureSellerMarketplaceProfile,
    _test: {
        stableExternalId,
        prepareOnboardingRequest,
        extractProviderKey,
        loadSellerSources
    }
};
