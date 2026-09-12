const crypto = require("crypto");
const { recordFinancialReconciliation } = require("./financialReconciliationService");

const REJECTED_STATUS = "IPTAL_EDILDI";

class WithdrawalRejectionError extends Error {
    constructor(message, status = 400, code = "WITHDRAWAL_REJECTION_FAILED") {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function clean(value, max = 1000) {
    return String(value ?? "").trim().slice(0, max);
}

function toKurus(value) {
    const number = Number(value);
    return Number.isFinite(number)
        ? Math.round((number + Number.EPSILON) * 100)
        : null;
}

function idempotencyKey(withdrawalId) {
    return crypto.createHash("sha256")
        .update(`withdrawal-rejection|${withdrawalId}`)
        .digest("hex")
        .slice(0, 40);
}

async function rejectWithdrawal({ firestore, FieldValue, withdrawalId, admin, body = {}, now = () => new Date() }) {
    const id = clean(withdrawalId, 200);
    const reason = clean(body.reason ?? body.neden, 1000);
    if (!id) throw new WithdrawalRejectionError("Para çekme talebi ID gerekli.", 400, "WITHDRAWAL_ID_REQUIRED");
    if (!admin?.uid && !admin?.email) throw new WithdrawalRejectionError("Admin kimliği doğrulanamadı.", 403, "ADMIN_REQUIRED");
    if (reason.length < 3) throw new WithdrawalRejectionError("İptal veya bloke gerekçesi zorunludur.", 400, "WITHDRAWAL_REASON_REQUIRED");

    const withdrawalRef = firestore.collection("paraCekmeTalepleri").doc(id);
    const finalizationRef = firestore.collection("withdrawalFinalizations").doc(id);

    try {
        return await firestore.runTransaction(async (tx) => {
            const [withdrawalSnapshot, finalizationSnapshot] = await Promise.all([
                tx.get(withdrawalRef),
                tx.get(finalizationRef)
            ]);
            if (finalizationSnapshot.exists) {
                const existing = finalizationSnapshot.data();
                if (existing.status === REJECTED_STATUS) {
                    return { idempotent: true, status: REJECTED_STATUS, withdrawalId: id };
                }
                throw new WithdrawalRejectionError("Çekim talebi daha önce farklı bir işlemle sonuçlandırılmış.", 409, "WITHDRAWAL_FINALIZATION_CONFLICT");
            }
            if (!withdrawalSnapshot.exists) throw new WithdrawalRejectionError("Para çekme talebi bulunamadı.", 404, "WITHDRAWAL_NOT_FOUND");

            const withdrawal = withdrawalSnapshot.data();
            if (withdrawal.durum === REJECTED_STATUS) {
                return { idempotent: true, status: REJECTED_STATUS, withdrawalId: id };
            }
            if (!["BEKLIYOR", "PROCESSING"].includes(withdrawal.durum)) throw new WithdrawalRejectionError("Talep iptal için uygun değil.", 409, "WITHDRAWAL_NOT_PROCESSING");

            const seller = clean(withdrawal.email, 320);
            const amountKurus = toKurus(withdrawal.tutar);
            if (!seller) throw new WithdrawalRejectionError("Talepte satıcı bilgisi bulunamadı.", 409, "WITHDRAWAL_SELLER_MISSING");
            if (!Number.isInteger(amountKurus) || amountKurus <= 0) throw new WithdrawalRejectionError("Talep tutarı geçersiz.", 409, "WITHDRAWAL_AMOUNT_INVALID");

            const walletRef = firestore.collection("wallets").doc(seller);
            const walletSnapshot = await tx.get(walletRef);
            if (!walletSnapshot.exists) throw new WithdrawalRejectionError("Satıcı cüzdanı bulunamadı.", 409, "WITHDRAWAL_WALLET_MISSING");

            const wallet = walletSnapshot.data();
            const balanceKurus = toKurus(wallet.balance);
            const pendingKurus = toKurus(wallet.withdrawalPending);
            if (!Number.isInteger(balanceKurus) || balanceKurus < 0 || !Number.isInteger(pendingKurus) || pendingKurus < 0) {
                throw new WithdrawalRejectionError("Cüzdan değerleri doğrulanamadı.", 409, "WITHDRAWAL_WALLET_INVALID");
            }
            if (pendingKurus < amountKurus) {
                throw new WithdrawalRejectionError("Rezerve çekim bakiyesi talep tutarını karşılamıyor; manuel mutabakat gerekli.", 409, "WITHDRAWAL_PENDING_INSUFFICIENT");
            }

            const timestamp = FieldValue?.serverTimestamp ? FieldValue.serverTimestamp() : now();
            const amount = Number((amountKurus / 100).toFixed(2));
            const newBalance = Number(((balanceKurus + amountKurus) / 100).toFixed(2));
            const newPending = Number(((pendingKurus - amountKurus) / 100).toFixed(2));
            const guardRef = withdrawal.ownerUid
                ? firestore.collection("withdrawalRequestGuards").doc(withdrawal.ownerUid)
                : null;
            const guardSnapshot = guardRef ? await tx.get(guardRef) : null;

            tx.update(walletRef, {
                balance: newBalance,
                withdrawalPending: newPending,
                guncellenmeTarihi: timestamp
            });
            tx.update(withdrawalRef, {
                durum: REJECTED_STATUS,
                payoutStatus: "CANCELLED",
                neden: reason,
                iptalTarihi: timestamp,
                iptalEdenUid: admin.uid || null,
                iptalEdenEmail: clean(admin.email, 320) || null,
                guncellenmeTarihi: timestamp
            });
            if (guardRef && guardSnapshot?.exists && guardSnapshot.data()?.withdrawalId === id) {
                tx.update(guardRef, {
                    active: false,
                    status: "CANCELLED",
                    updatedAt: timestamp
                });
            }
            tx.create(finalizationRef, {
                withdrawalId: id,
                seller,
                amount,
                status: REJECTED_STATUS,
                reason,
                previousBalance: Number((balanceKurus / 100).toFixed(2)),
                newBalance,
                previousWithdrawalPending: Number((pendingKurus / 100).toFixed(2)),
                newWithdrawalPending: newPending,
                previousWithdrawalStatus: withdrawal.durum,
                newWithdrawalStatus: REJECTED_STATUS,
                adminUid: admin.uid || null,
                adminEmail: clean(admin.email, 320) || null,
                idempotencyKey: idempotencyKey(id),
                createdAt: timestamp
            });
            return { idempotent: false, status: REJECTED_STATUS, withdrawalId: id, seller, amount };
        });
    } catch (error) {
        if (error.code === "WITHDRAWAL_PENDING_INSUFFICIENT") {
            await recordFinancialReconciliation({
                firestore,
                event: {
                    type: "withdrawal_rejection",
                    reasonCode: error.code,
                    reason: error.message,
                    sourceCollection: "paraCekmeTalepleri",
                    sourceId: id
                }
            }).catch(() => undefined);
        }
        throw error;
    }
}

module.exports = {
    REJECTED_STATUS,
    WithdrawalRejectionError,
    toKurus,
    idempotencyKey,
    rejectWithdrawal
};
