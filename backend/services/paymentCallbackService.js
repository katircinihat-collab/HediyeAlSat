const { HOLD_DURATION_MS } = require("./deliveryConfirmationService");
const { buildListingBoostPeriod, getListingBoostPackage, ownerMatches } = require("./listingBoostService");

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

function isDigitalListing(listing) {
    return listing?.urunTipi === "dijital"
        || listing?.fizikselKargo === false
        || listing?.dijitalTeslimat === true;
}

function buildDigitalDeliveryUpdate(finalizedAt, FieldValue) {
    return {
        durum: "Teslim Edildi",
        urunTipi: "dijital",
        fizikselKargo: false,
        dijitalTeslimat: true,
        teslimatTipi: "dijital",
        teslimatDogrulandi: true,
        teslimatDogrulamaTipi: "dijital_otomatik",
        teslimatDogrulamaTarihi: FieldValue.serverTimestamp(),
        dijitalTeslimatTarihi: FieldValue.serverTimestamp(),
        hakEdisBlokeBaslangic: FieldValue.serverTimestamp(),
        hakEdisBlokeBitis: new Date(finalizedAt.getTime() + HOLD_DURATION_MS),
        hakEdisDurumu: "Beklemede"
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

function mapPaymentItemTransactions(result, payment) {
    if (!Array.isArray(payment?.paymentItems) || payment.paymentItems.length === 0) {
        throw new PaymentCallbackError("Ödeme ürün eşlemesi bulunamadı.", "PAYMENT_ITEM_MAPPING_MISSING", "MANUAL_REVIEW");
    }
    if (!Array.isArray(result?.itemTransactions)) {
        throw new PaymentCallbackError("Iyzico ürün işlem bilgisi bulunamadı.", "ITEM_TRANSACTIONS_MISSING", "MANUAL_REVIEW");
    }
    const available = [...result.itemTransactions];
    return payment.paymentItems.map((item) => {
        const index = available.findIndex((entry) => String(entry.itemId) === String(item.listingId));
        if (index < 0) throw new PaymentCallbackError("Ödeme ürünü işlemle eşleştirilemedi.", "ITEM_TRANSACTION_MISMATCH", "MANUAL_REVIEW");
        const providerItem = available.splice(index, 1)[0];
        const expectedKurus = toKurus(item.expectedItemPrice);
        const priceKurus = toKurus(providerItem.price);
        const paidPriceKurus = toKurus(providerItem.paidPrice);
        if (!providerItem.paymentTransactionId || !Number.isInteger(expectedKurus)
            || priceKurus !== expectedKurus || paidPriceKurus !== expectedKurus) {
            throw new PaymentCallbackError("Ürün tahsilat dağılımı güvenli biçimde doğrulanamadı.", "ITEM_AMOUNT_MISMATCH", "MANUAL_REVIEW");
        }
        return { orderId: item.orderId, listingId: item.listingId, paymentTransactionId: String(providerItem.paymentTransactionId), itemPrice: fromKurus(priceKurus), itemPaidPrice: fromKurus(paidPriceKurus), currency: result.currency, quantity: item.quantity };
    });
}

async function finalizePayment({ firestore, FieldValue, conversationId, paymentId, itemTransactions = null, currency = "TRY", now = () => new Date() }) {
    const finalizedAt = now();
    return firestore.runTransaction(async (transaction) => {
        const paymentRef = firestore.collection("odemeler").doc(conversationId);
        const lockRef = firestore.collection("paymentFinalizations").doc(paymentId);
        const paymentSnapshot = await transaction.get(paymentRef);
        if (!paymentSnapshot.exists) throw new PaymentCallbackError("Ödeme kaydı bulunamadı.", "PAYMENT_NOT_FOUND");
        const payment = { id: paymentSnapshot.id, ...paymentSnapshot.data() };

        if (payment.paymentStatus === "SUCCESS") {
            if (payment.paymentId !== paymentId) throw new PaymentCallbackError("Ödeme farklı bir kimlikle tamamlanmış.", "PAYMENT_ID_CONFLICT");
            return { alreadyFinalized: true, sponsor: Boolean(payment.sponsor), listingBoost: Boolean(payment.listingBoost), listingId: payment.listingId || null };
        }

        const lockSnapshot = await transaction.get(lockRef);
        if (lockSnapshot.exists && lockSnapshot.data().conversationId !== conversationId) {
            throw new PaymentCallbackError("Ödeme kimliği başka bir işlemde kullanılmış.", "PAYMENT_ID_CONFLICT");
        }

        if (payment.listingBoost) {
            const selectedPackage = getListingBoostPackage(payment.boostPackageId);
            if (selectedPackage.days !== Number(payment.boostDays)
                || toKurus(selectedPackage.price) !== toKurus(payment.boostPrice ?? payment.toplamTutar)) {
                throw new PaymentCallbackError("Öne çıkarma paketi doğrulanamadı.", "LISTING_BOOST_PACKAGE_MISMATCH", "MANUAL_REVIEW");
            }
            const listingRef = firestore.collection("ilanlar").doc(payment.listingId);
            const promotionRef = firestore.collection("listingPromotions").doc(paymentId);
            const revenueRef = firestore.collection("platformRevenueEvents").doc(`listing_boost_${paymentId}`);
            const [listingSnapshot, promotionSnapshot] = await Promise.all([
                transaction.get(listingRef),
                transaction.get(promotionRef)
            ]);
            if (!listingSnapshot.exists) {
                throw new PaymentCallbackError("Öne çıkarılacak ilan bulunamadı.", "LISTING_NOT_FOUND", "MANUAL_REVIEW");
            }
            const listing = { id: listingSnapshot.id, ...listingSnapshot.data() };
            if (!ownerMatches(listing, { uid: payment.listingOwnerUid, email: payment.kullanici })) {
                throw new PaymentCallbackError("İlan sahipliği ödeme kaydıyla eşleşmiyor.", "LISTING_BOOST_OWNER_MISMATCH", "MANUAL_REVIEW");
            }
            if (promotionSnapshot.exists && promotionSnapshot.data().conversationId !== conversationId) {
                throw new PaymentCallbackError("Öne çıkarma ödemesi daha önce kullanılmış.", "LISTING_BOOST_PAYMENT_CONFLICT", "MANUAL_REVIEW");
            }
            const period = buildListingBoostPeriod(listing, selectedPackage, finalizedAt);
            transaction.update(listingRef, {
                boostActive: true,
                boostStartAt: period.benefitStartAt,
                boostEndAt: period.endAt,
                boostPackageId: selectedPackage.id,
                boostPaymentId: paymentId,
                boostUpdatedAt: FieldValue.serverTimestamp()
            });
            transaction.set(promotionRef, {
                listingId: listing.id,
                ownerUid: payment.listingOwnerUid,
                packageId: selectedPackage.id,
                days: selectedPackage.days,
                amount: selectedPackage.price,
                currency,
                conversationId,
                paymentId,
                status: "ACTIVE",
                purchasedAt: FieldValue.serverTimestamp(),
                benefitStartAt: period.benefitStartAt,
                endAt: period.endAt
            });
            transaction.set(revenueRef, {
                type: "LISTING_BOOST",
                amount: selectedPackage.price,
                currency,
                listingId: listing.id,
                ownerUid: payment.listingOwnerUid,
                conversationId,
                paymentId,
                createdAt: FieldValue.serverTimestamp()
            });
        } else if (payment.sponsor) {
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
            let reservationRef = null;
            let reservation = null;
            if (payment.stockReservationId) {
                reservationRef = firestore.collection("stockReservations").doc(payment.stockReservationId);
                const reservationSnapshot = await transaction.get(reservationRef);
                if (!reservationSnapshot.exists || reservationSnapshot.data().status !== "ACTIVE") {
                    throw new PaymentCallbackError(
                        "Ödeme alındı ancak stok rezervasyonu doğrulanamadı; manuel inceleme gerekli.",
                        "STOCK_RESERVATION_MISSING",
                        "MANUAL_REVIEW"
                    );
                }
                reservation = reservationSnapshot.data();
            }
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
            const stockOrders = orders.filter((order) => order.odemeDurumu !== true && (order.ilanId || order.urunId));
            const listingIds = [...new Set(orders.map((order) => order.ilanId || order.urunId).filter(Boolean))];
            const listingRefs = new Map(listingIds.map((id) => [id, firestore.collection("ilanlar").doc(id)]));
            const listingSnapshots = await Promise.all(listingIds.map((id) => transaction.get(listingRefs.get(id))));
            const listingData = new Map(listingIds.map((id, index) => [id, listingSnapshots[index]]));
            const walletAdds = new Map();

            orders.forEach((order, index) => {
                const itemTransaction = itemTransactions?.find((item) => item.orderId === order.id);
                const listingId = order.ilanId || order.urunId;
                const listing = listingId ? listingData.get(listingId)?.data?.() : null;
                const digital = isDigitalListing(listing);
                const digitalDelivery = digital ? buildDigitalDeliveryUpdate(finalizedAt, FieldValue) : null;
                if (!movementSnapshots[index].exists) {
                    const hesap = calculateOrderEarnings(order);
                    walletAdds.set(order.satici, Number(((walletAdds.get(order.satici) || 0) + hesap.netTutar).toFixed(2)));
                    transaction.set(movementRefs[index], {
                        siparisId: order.id, satici: order.satici, alici: order.alici || "",
                        toplamTutar: hesap.toplamTutar, komisyon: hesap.komisyon, netTutar: hesap.netTutar,
                        komisyonOrani: hesap.komisyonOrani,
                        blockageResolvedDate: digitalDelivery?.hakEdisBlokeBitis || null,
                        tip: "Satış", durum: "Bekliyor", paymentId, conversationId,
                        tarih: FieldValue.serverTimestamp()
                    });
                }
                if (order.odemeDurumu !== true) {
                    transaction.update(order.ref, {
                        odemeDurumu: true, durum: "Ödendi", paymentId, conversationId,
                        ...(digitalDelivery || {}),
                        ...(itemTransaction ? { paymentTransactionId: itemTransaction.paymentTransactionId, iyzicoItemPrice: itemTransaction.itemPrice, iyzicoItemPaidPrice: itemTransaction.itemPaidPrice, paymentCurrency: itemTransaction.currency || currency } : {}),
                        odemeTarihi: FieldValue.serverTimestamp(), guncellenmeTarihi: FieldValue.serverTimestamp()
                    });
                } else if (digitalDelivery && order.teslimatDogrulandi !== true) {
                    transaction.update(order.ref, {
                        ...digitalDelivery,
                        guncellenmeTarihi: FieldValue.serverTimestamp()
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

            if (reservation) {
                const expected = new Map();
                stockOrders.forEach((order) => {
                    const listingId = order.ilanId || order.urunId;
                    const listing = listingData.get(listingId)?.data?.();
                    if (listing?.urunTipi === "dijital" || listing?.fizikselKargo === false) return;
                    expected.set(listingId, (expected.get(listingId) || 0) + Number(order.adet || 1));
                });
                const reserved = new Map((reservation.items || []).map((item) => [item.listingId, Number(item.quantity)]));
                if (expected.size !== reserved.size || [...expected].some(([id, quantity]) => reserved.get(id) !== quantity)) {
                    throw new PaymentCallbackError(
                        "Stok rezervasyonu siparişle eşleşmiyor; manuel inceleme gerekli.",
                        "STOCK_RESERVATION_MISMATCH",
                        "MANUAL_REVIEW"
                    );
                }
                transaction.update(reservationRef, {
                    status: "FINALIZED",
                    paymentId,
                    finalizedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                });
            } else listingIds.forEach((listingId) => {
                const snapshot = listingData.get(listingId);
                if (!snapshot.exists || snapshot.data().urunTipi === "dijital") return;
                const decrement = stockOrders
                    .filter((order) => (order.ilanId || order.urunId) === listingId)
                    .reduce((sum, order) => sum + Number(order.adet || 1), 0);
                if (decrement <= 0) return;
                const currentStock = Number(snapshot.data().stok ?? snapshot.data().adet);
                if (!Number.isInteger(currentStock) || currentStock < decrement) {
                    throw new PaymentCallbackError(
                        "Ödeme alındı ancak stok güvenli biçimde ayrılamadı; manuel inceleme gerekli.",
                        "STOCK_ALLOCATION_FAILED",
                        "MANUAL_REVIEW"
                    );
                }
                const nextStock = currentStock - decrement;
                transaction.update(listingRefs.get(listingId), {
                    stok: nextStock,
                    ...(nextStock <= 0 ? { aktif: false } : {})
                });
            });
        }

        transaction.set(lockRef, { conversationId, paymentId, createdAt: FieldValue.serverTimestamp() });
        transaction.update(paymentRef, {
            odemeDurumu: true, paymentStatus: "SUCCESS", callbackStatus: "SUCCESS", paymentId,
            ...(itemTransactions ? { paymentItemTransactions: itemTransactions } : {}),
            guncellenmeTarihi: FieldValue.serverTimestamp()
        });
        return { alreadyFinalized: false, sponsor: Boolean(payment.sponsor), listingBoost: Boolean(payment.listingBoost), listingId: payment.listingId || null };
    });
}

module.exports = { PaymentCallbackError, validateRetrievedPayment, mapPaymentItemTransactions, finalizePayment, calculateOrderEarnings, isDigitalListing, buildDigitalDeliveryUpdate, toKurus };
