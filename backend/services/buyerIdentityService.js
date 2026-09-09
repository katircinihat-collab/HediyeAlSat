const crypto = require("crypto");
const { firestore, FieldValue } = require("../config/firebase");
const { PaymentValidationError } = require("./paymentValidationService");

const COLLECTION = "buyerIdentities";
const ENCRYPTION_VERSION = 1;

function normalizeIdentityNumber(value) {
    return String(value || "").replace(/\D/g, "");
}

function isValidTurkishIdentityNumber(value) {
    const digits = normalizeIdentityNumber(value);
    if (!/^[1-9]\d{10}$/.test(digits)) return false;
    const numbers = [...digits].map(Number);
    const odd = numbers[0] + numbers[2] + numbers[4] + numbers[6] + numbers[8];
    const even = numbers[1] + numbers[3] + numbers[5] + numbers[7];
    return ((odd * 7 - even) % 10 + 10) % 10 === numbers[9]
        && numbers.slice(0, 10).reduce((sum, number) => sum + number, 0) % 10 === numbers[10];
}

function encryptionKey() {
    const configured = String(process.env.BUYER_IDENTITY_ENCRYPTION_KEY || "").trim();
    if (!configured) return null;
    const key = Buffer.from(configured, "base64");
    return key.length === 32 ? key : null;
}

function encryptIdentity(identityNumber, key) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(identityNumber, "utf8"), cipher.final()]);
    return {
        ciphertext: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        authTag: cipher.getAuthTag().toString("base64")
    };
}

function decryptIdentity(record, key) {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(record.iv, "base64"));
    decipher.setAuthTag(Buffer.from(record.authTag, "base64"));
    return Buffer.concat([
        decipher.update(Buffer.from(record.ciphertext, "base64")),
        decipher.final()
    ]).toString("utf8");
}

function isSandboxMode() {
    return process.env.NODE_ENV !== "production"
        || /sandbox/i.test(String(process.env.IYZIPAY_URI || ""));
}

function sandboxIdentity() {
    if (!isSandboxMode()) return null;
    return normalizeIdentityNumber(
        process.env.IYZIPAY_SANDBOX_BUYER_IDENTITY_NUMBER || "11111111111"
    );
}

async function getStoredIdentity(uid, dependencies = {}) {
    const database = dependencies.firestore || firestore;
    const key = dependencies.key || encryptionKey();
    const snapshot = await database.collection(COLLECTION).doc(uid).get();
    if (!snapshot.exists) return null;
    if (!key) {
        throw new PaymentValidationError(
            "Kimlik bilgisi güvenli biçimde okunamıyor.",
            503,
            "BUYER_IDENTITY_ENCRYPTION_NOT_CONFIGURED"
        );
    }
    try {
        const identityNumber = decryptIdentity(snapshot.data(), key);
        return isValidTurkishIdentityNumber(identityNumber) ? identityNumber : null;
    } catch {
        throw new PaymentValidationError(
            "Kimlik bilgisi doğrulanamadı.",
            409,
            "BUYER_IDENTITY_INVALID"
        );
    }
}

async function resolveBuyerIdentity(uid, dependencies = {}) {
    const stored = await getStoredIdentity(uid, dependencies);
    if (stored) return stored;
    const fallback = dependencies.sandboxIdentity === undefined
        ? sandboxIdentity()
        : dependencies.sandboxIdentity;
    if (fallback) return fallback;
    throw new PaymentValidationError(
        "Ödeme için kimlik bilginizi güvenli biçimde kaydetmelisiniz.",
        409,
        "BUYER_IDENTITY_REQUIRED"
    );
}

async function saveBuyerIdentity(uid, identityNumber, dependencies = {}) {
    const normalized = normalizeIdentityNumber(identityNumber);
    if (!isValidTurkishIdentityNumber(normalized)) {
        const error = new Error("Geçerli bir T.C. kimlik numarası girin.");
        error.status = 400;
        error.code = "BUYER_IDENTITY_INVALID";
        throw error;
    }
    const key = dependencies.key || encryptionKey();
    if (!key) {
        const error = new Error("Kimlik bilgisi güvenli kayıt servisi yapılandırılmamış.");
        error.status = 503;
        error.code = "BUYER_IDENTITY_ENCRYPTION_NOT_CONFIGURED";
        throw error;
    }
    const database = dependencies.firestore || firestore;
    const serverTimestamp = dependencies.serverTimestamp || (() => FieldValue.serverTimestamp());
    const encrypted = encryptIdentity(normalized, key);
    await database.collection(COLLECTION).doc(uid).set({
        ...encrypted,
        last4: normalized.slice(-4),
        version: ENCRYPTION_VERSION,
        updatedAt: serverTimestamp()
    });
    return { configured: true, masked: `*******${normalized.slice(-4)}` };
}

async function getMaskedBuyerIdentity(uid, dependencies = {}) {
    const database = dependencies.firestore || firestore;
    const snapshot = await database.collection(COLLECTION).doc(uid).get();
    if (!snapshot.exists) return { configured: false, masked: "" };
    const last4 = String(snapshot.data().last4 || "").replace(/\D/g, "").slice(-4);
    return { configured: Boolean(last4), masked: last4 ? `*******${last4}` : "" };
}

module.exports = {
    resolveBuyerIdentity,
    saveBuyerIdentity,
    getMaskedBuyerIdentity,
    _test: {
        normalizeIdentityNumber,
        isValidTurkishIdentityNumber,
        encryptIdentity,
        decryptIdentity,
        isSandboxMode,
        sandboxIdentity
    }
};
