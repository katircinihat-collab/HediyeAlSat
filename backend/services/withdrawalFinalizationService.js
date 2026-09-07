const crypto = require("crypto");
const { recordFinancialReconciliation } = require("./financialReconciliationService");

const MANUAL_PAYMENT_STATUS = "MANUEL_ODEME_DOGRULANDI";

class WithdrawalFinalizationError extends Error {
    constructor(message, status = 400, code = "WITHDRAWAL_FINALIZATION_FAILED") {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function clean(value, max = 500) { return String(value ?? "").trim().slice(0, max); }
function toKurus(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.round((number + Number.EPSILON) * 100);
}

function auditId(withdrawalId) {
    return crypto.createHash("sha256").update(`manual-withdrawal|${withdrawalId}`).digest("hex").slice(0, 40);
}

async function finalizeManualWithdrawal({ firestore, FieldValue, withdrawalId, admin, body = {}, now = () => new Date() }) {
    const id = clean(withdrawalId, 200);
    const providerReference = clean(body.providerReference, 200);
    const note = clean(body.note, 1000);
    if (!id) throw new WithdrawalFinalizationError("Para çekme talebi ID gerekli.", 400, "WITHDRAWAL_ID_REQUIRED");
    if (!admin?.uid && !admin?.email) throw new WithdrawalFinalizationError("Admin kimliği doğrulanamadı.", 403, "ADMIN_REQUIRED");
    if (!providerReference || providerReference.length < 4) {
        throw new WithdrawalFinalizationError("Gerçek banka transfer referansı zorunludur.", 400, "TRANSFER_REFERENCE_REQUIRED");
    }

    const withdrawalRef = firestore.collection("paraCekmeTalepleri").doc(id);
    const finalizationRef = firestore.collection("withdrawalFinalizations").doc(id);
    try {
        return await firestore.runTransaction(async (tx) => {
            const [withdrawalSnapshot, finalizationSnapshot] = await Promise.all([
                tx.get(withdrawalRef), tx.get(finalizationRef)
            ]);
            if (finalizationSnapshot.exists) {
                const existing = finalizationSnapshot.data();
                if (existing.status === MANUAL_PAYMENT_STATUS) return { idempotent: true, status: existing.status, withdrawalId: id };
                throw new WithdrawalFinalizationError("Çekim finalizasyonu manuel inceleme gerektiriyor.", 409, "WITHDRAWAL_FINALIZATION_CONFLICT");
            }
            if (!withdrawalSnapshot.exists) throw new WithdrawalFinalizationError("Para çekme talebi bulunamadı.", 404, "WITHDRAWAL_NOT_FOUND");
            const withdrawal = withdrawalSnapshot.data();
            if (withdrawal.durum === MANUAL_PAYMENT_STATUS || withdrawal.durum === "ODENDI" || withdrawal.durum === "Ödendi") {
                return { idempotent: true, status: withdrawal.durum, withdrawalId: id };
            }
            if (withdrawal.durum !== "BEKLIYOR") throw new WithdrawalFinalizationError(`Talep ödeme için uygun değil: ${withdrawal.durum || "bilinmiyor"}.`, 409, "WITHDRAWAL_NOT_PENDING");
            const seller = clean(withdrawal.email, 320);
            const amountKurus = toKurus(withdrawal.tutar);
            if (!seller) throw new WithdrawalFinalizationError("Talepte satıcı bilgisi bulunamadı.", 409, "WITHDRAWAL_SELLER_MISSING");
            if (!Number.isInteger(amountKurus) || amountKurus <= 0) throw new WithdrawalFinalizationError("Talep tutarı geçersiz.", 409, "WITHDRAWAL_AMOUNT_INVALID");

            const walletRef = firestore.collection("wallets").doc(seller);
            const walletSnapshot = await tx.get(walletRef);
            if (!walletSnapshot.exists) throw new WithdrawalFinalizationError("Satıcı cüzdanı bulunamadı.", 409, "WITHDRAWAL_WALLET_MISSING");
            const wallet = walletSnapshot.data();
            const pendingKurus = toKurus(wallet.withdrawalPending);
            const balanceKurus = toKurus(wallet.balance);
            const paidKurus = toKurus(wallet.paid || 0);
            if (![pendingKurus, balanceKurus, paidKurus].every(Number.isInteger)) throw new WithdrawalFinalizationError("Cüzdan değerleri doğrulanamadı.", 409, "WITHDRAWAL_WALLET_INVALID");
            if (pendingKurus < amountKurus) {
                throw new WithdrawalFinalizationError("Rezerve çekim bakiyesi talep tutarını karşılamıyor; manuel mutabakat gerekli.", 409, "WITHDRAWAL_PENDING_INSUFFICIENT");
            }

            const timestamp = FieldValue?.serverTimestamp ? FieldValue.serverTimestamp() : now();
            const newPending = Number(((pendingKurus - amountKurus) / 100).toFixed(2));
            const newPaid = Number(((paidKurus + amountKurus) / 100).toFixed(2));
            const amount = Number((amountKurus / 100).toFixed(2));
            tx.update(walletRef, {
                withdrawalPending: newPending, paid: newPaid,
                sonOdeme: timestamp, guncellenmeTarihi: timestamp
            });
            tx.update(withdrawalRef, {
                durum: MANUAL_PAYMENT_STATUS,
                manuelOdemeDogrulandi: true,
                odemeReferansi: providerReference,
                odemeNotu: note,
                odemeTarihi: timestamp,
                odemeyiDogrulayanUid: admin.uid || null,
                odemeyiDogrulayanEmail: clean(admin.email, 320) || null,
                guncellenmeTarihi: timestamp
            });
            tx.create(finalizationRef, {
                withdrawalId: id, seller, amount, status: MANUAL_PAYMENT_STATUS,
                provider: "manual_bank_transfer", providerReference,
                previousBalance: Number((balanceKurus / 100).toFixed(2)),
                newBalance: Number((balanceKurus / 100).toFixed(2)),
                previousWithdrawalPending: Number((pendingKurus / 100).toFixed(2)),
                newWithdrawalPending: newPending,
                previousPaid: Number((paidKurus / 100).toFixed(2)), newPaid,
                previousWithdrawalStatus: withdrawal.durum, newWithdrawalStatus: MANUAL_PAYMENT_STATUS,
                adminUid: admin.uid || null, adminEmail: clean(admin.email, 320) || null,
                note, idempotencyKey: auditId(id), createdAt: timestamp
            });
            return { idempotent: false, status: MANUAL_PAYMENT_STATUS, withdrawalId: id, seller, amount };
        });
    } catch (error) {
        if (error.code === "WITHDRAWAL_PENDING_INSUFFICIENT") {
            await recordFinancialReconciliation({ firestore, event: {
                type: "withdrawal", reasonCode: error.code, reason: error.message,
                sourceCollection: "paraCekmeTalepleri", sourceId: id
            } }).catch(() => undefined);
        }
        throw error;
    }
}

module.exports = { MANUAL_PAYMENT_STATUS, WithdrawalFinalizationError, toKurus, auditId, finalizeManualWithdrawal };
