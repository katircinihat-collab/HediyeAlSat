class PaymentCallbackError extends Error {
    constructor(message, code, status = "FAILED") {
        super(message);
        this.name = "PaymentCallbackError";
        this.code = code;
        this.paymentStatus = status;
    }
}

function toKurus(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.round(amount * 100) : NaN;
}

function fromKurus(value) {
    return Number((value / 100).toFixed(2));
}

function calculateOrderEarnings(order) {
    const unitPriceKurus = toKurus(order.fiyat);
    const quantity = Number(order.adet);
    if (!Number.isInteger(unitPriceKurus) || unitPriceKurus <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
        throw new PaymentCallbackError("Sipariş tutarı veya adedi geçersiz.", "INVALID_ORDER_AMOUNT");
    }
    const productTotalKurus = unitPriceKurus * quantity;
    const commissionKurus = Math.round(productTotalKurus * 8 / 100);
    return {
        toplamTutar: fromKurus(productTotalKurus),
        komisyon: fromKurus(commissionKurus),
        netTutar: fromKurus(productTotalKurus - commissionKurus),
        komisyonOrani: 0.08
    };
}

function validateRetrievedPayment(result, payment) {
    if (!payment) throw new PaymentCallbackError("Ödeme kaydı bulunamadı.", "PAYMENT_NOT_FOUND");
    if (result?.paymentStatus !== "SUCCESS") {
        throw new PaymentCallbackError("Ödeme başarılı değil.", "PAYMENT_NOT_SUCCESS", "FAILED");
    }
    const conversationId = result.conversationId || result.basketId;
    if (!conversationId || conversationId !== payment.id) {
        throw new PaymentCallbackError("Ödeme kaydı eşleşmiyor.", "CONVERSATION_MISMATCH");
    }
    if (!result.paymentId || typeof result.paymentId !== "string") {
        throw new PaymentCallbackError("Ödeme kimliği bulunamadı.", "PAYMENT_ID_MISSING");
    }
    const expectedCurrency = payment.currency || "TRY";
    if (result.currency !== expectedCurrency) {
        throw new PaymentCallbackError("Para birimi eşleşmiyor.", "CURRENCY_MISMATCH");
    }
    const expected = toKurus(payment.expectedPaidPrice ?? payment.toplamTutar);
    const paid = toKurus(result.paidPrice);
    const price = toKurus(result.price);
    if (!Number.isInteger(expected) || paid !== expected || price !== expected) {
        throw new PaymentCallbackError("Tahsil edilen tutar beklenen tutarla eşleşmiyor.", "AMOUNT_MISMATCH", "AMOUNT_MISMATCH");
    }
    return { conversationId, paymentId: result.paymentId, expectedKurus: expected };
}

async function finalizePayment({ firestore, FieldValue, conversationId, paymentId }) {
    return firestore.runTransaction(async (transaction) => {
        const paymentRef = firestore.collection("odemeler").doc(conversationId);
        const lockRef = firestore.collection("paymentFinalizations").doc(paymentId);
        const paymentSnapshot = await transaction.get(paymentRef);
        if (!paymentSnapshot.exists) throw new PaymentCallbackError("Ödeme kaydı bulunamadı.", "PAYMENT_NOT_FOUND");
        const payment = { id: paymentSnapshot.id, ...paymentSnapshot.data() };

        if (payment.paymentStatus === "SUCCESS") {
            if (payment.paymentId !== paymentId) throw new PaymentCallbackError("Ödeme farklı bir kimlikle tamamlanmış.", "PAYMENT_ID_CONFLICT");
            return { alreadyFinalized: true, sponsor: Boolean(payment.sponsor) };
        }

        const lockSnapshot = await transaction.get(lockRef);
        if (lockSnapshot.exists && lockSnapshot.data().conversationId !== conversationId) {
            throw new PaymentCallbackError("Ödeme kimliği başka bir işlemde kullanılmış.", "PAYMENT_ID_CONFLICT");
        }

        if (payment.sponsor) {
            const sponsorRef = firestore.collection("sponsorBasvurular").doc(payment.sponsorBasvuruId);
            const sponsorSnapshot = await transaction.get(sponsorRef);
            if (!sponsorSnapshot.exists) throw new PaymentCallbackError("Sponsor başvurusu bulunamadı.", "SPONSOR_NOT_FOUND");
            const sponsorBaslangic = new Date();
            const sponsorBitis = new Date(sponsorBaslangic.getTime() + Number(payment.sponsorSuresi || 0) * 86400000);
            transaction.update(sponsorRef, {
                durum: "Ödendi", odemeDurumu: true, paymentStatus: "SUCCESS", paymentId,
                odemeTarihi: FieldValue.serverTimestamp(), sponsorAktif: true,
                sponsorBaslangic, sponsorBitis, sponsorPaket: payment.paketAdi || "",
                sponsorPaketId: payment.paketId || "", sponsorSuresi: Number(payment.sponsorSuresi || 0),
                sponsorTutar: Number(payment.toplamTutar || 0),
                guncellenmeTarihi: FieldValue.serverTimestamp()
            });
        } else {
            const orderRefs = (payment.siparisIds || []).map((id) => firestore.collection("siparisler").doc(id));
            const orderSnapshots = await Promise.all(orderRefs.map((ref) => transaction.get(ref)));
            const orders = orderSnapshots.map((snapshot, index) => {
                if (!snapshot.exists) throw new PaymentCallbackError("Sipariş bulunamadı.", "ORDER_NOT_FOUND");
                return { id: snapshot.id, ref: orderRefs[index], ...snapshot.data() };
            });
            for (const order of orders) {
                if (order.odemeDurumu === true && order.paymentId !== paymentId) {
                    throw new PaymentCallbackError("Sipariş başka bir ödeme ile tamamlanmış.", "ORDER_PAYMENT_CONFLICT");
                }
            }

            const movementRefs = orders.map((order) => firestore.collection("bakiyeHareketleri").doc(`${paymentId}_${order.id}`));
            const movementSnapshots = await Promise.all(movementRefs.map((ref) => transaction.get(ref)));
            const walletEmails = [...new Set(orders.map((order) => order.satici))];
            if (walletEmails.some((email) => !email)) throw new PaymentCallbackError("Siparişte satıcı bilgisi yok.", "SELLER_MISSING");
            const walletRefs = new Map(walletEmails.map((email) => [email, firestore.collection("wallets").doc(email)]));
            const walletSnapshots = await Promise.all(walletEmails.map((email) => transaction.get(walletRefs.get(email))));
            const walletData = new Map(walletEmails.map((email, index) => [email, walletSnapshots[index].exists ? walletSnapshots[index].data() : {}]));
            const stockOrders = orders.filter((order) => order.odemeDurumu !== true && order.urunId);
            const listingIds = [...new Set(stockOrders.map((order) => order.urunId))];
            const listingRefs = new Map(listingIds.map((id) => [id, firestore.collection("ilanlar").doc(id)]));
            const listingSnapshots = await Promise.all(listingIds.map((id) => transaction.get(listingRefs.get(id))));
            const listingData = new Map(listingIds.map((id, index) => [id, listingSnapshots[index]]));
            const walletAdds = new Map();

            orders.forEach((order, index) => {
                if (!movementSnapshots[index].exists) {
                    const hesap = calculateOrderEarnings(order);
                    walletAdds.set(order.satici, Number(((walletAdds.get(order.satici) || 0) + hesap.netTutar).toFixed(2)));
                    transaction.set(movementRefs[index], {
                        siparisId: order.id, satici: order.satici, alici: order.alici || "",
                        toplamTutar: hesap.toplamTutar, komisyon: hesap.komisyon, netTutar: hesap.netTutar,
                        komisyonOrani: hesap.komisyonOrani, blockageResolvedDate: null,
                        tip: "Satış", durum: "Bekliyor", paymentId, conversationId,
                        tarih: FieldValue.serverTimestamp()
                    });
                }
                if (order.odemeDurumu !== true) {
                    transaction.update(order.ref, {
                        odemeDurumu: true, durum: "Ödendi", paymentId, conversationId,
                        odemeTarihi: FieldValue.serverTimestamp(), guncellenmeTarihi: FieldValue.serverTimestamp()
                    });
                }
            });

            walletAdds.forEach((amount, email) => {
                const current = walletData.get(email);
                transaction.set(walletRefs.get(email), {
                    email, balance: Number(current.balance || 0),
                    pending: Number((Number(current.pending || 0) + amount).toFixed(2)),
                    withdrawalPending: Number(current.withdrawalPending || 0), paid: Number(current.paid || 0),
                    iban: current.iban || "", bankaAdi: current.bankaAdi || "", hesapSahibi: current.hesapSahibi || "",
                    guncellenmeTarihi: FieldValue.serverTimestamp()
                }, { merge: true });
            });

            listingIds.forEach((listingId) => {
                const snapshot = listingData.get(listingId);
                if (!snapshot.exists || snapshot.data().urunTipi === "dijital") return;
                const decrement = stockOrders
                    .filter((order) => order.urunId === listingId)
                    .reduce((sum, order) => sum + Number(order.adet || 1), 0);
                const nextStock = Math.max(0, Number(snapshot.data().stok || 0) - decrement);
                transaction.update(listingRefs.get(listingId), {
                    stok: nextStock,
                    ...(nextStock <= 0 ? { aktif: false } : {})
                });
            });
        }

        transaction.set(lockRef, { conversationId, paymentId, createdAt: FieldValue.serverTimestamp() });
        transaction.update(paymentRef, {
            odemeDurumu: true, paymentStatus: "SUCCESS", callbackStatus: "SUCCESS", paymentId,
            guncellenmeTarihi: FieldValue.serverTimestamp()
        });
        return { alreadyFinalized: false, sponsor: Boolean(payment.sponsor) };
    });
}

module.exports = { PaymentCallbackError, validateRetrievedPayment, finalizePayment, calculateOrderEarnings, toKurus };
