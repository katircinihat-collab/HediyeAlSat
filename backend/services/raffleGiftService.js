const { PaymentValidationError } = require("./paymentValidationService");

function assertPhysicalItems(items) {
    if (items.some((item) => item.isDigital)) {
        throw new PaymentValidationError("Kura hediyesi teslimatı şu anda fiziksel ürünler için kullanılabilir.", 409, "RAFFLE_DIGITAL_UNSUPPORTED");
    }
}

async function prepareRaffleGift({ firestore, FieldValue, eventId, giverUid, verifiedItems, conversationId }) {
    if (!eventId) return null;
    assertPhysicalItems(verifiedItems);
    const eventRef = firestore.collection("raffleEvents").doc(eventId);
    const matchRef = firestore.collection("raffleMatches").doc(`${eventId}_${giverUid}`);
    let recipient;
    let recipientUid;
    await firestore.runTransaction(async (transaction) => {
        const eventSnapshot = await transaction.get(eventRef);
        const matchSnapshot = await transaction.get(matchRef);
        if (!eventSnapshot.exists || !["MATCHED", "COMPLETED"].includes(eventSnapshot.data().status) || !matchSnapshot.exists) {
            throw new PaymentValidationError("Kura hediye eşleşmesi doğrulanamadı.", 403, "RAFFLE_GIFT_FORBIDDEN");
        }
        const match = matchSnapshot.data();
        if (match.giverUid !== giverUid || !match.recipientUid) throw new PaymentValidationError("Kura hediye eşleşmesi doğrulanamadı.", 403, "RAFFLE_GIFT_FORBIDDEN");
        if (match.giftOrderPaid === true) throw new PaymentValidationError("Bu eşleşme için Kura hediyesi daha önce satın alındı.", 409, "RAFFLE_GIFT_ALREADY_PAID");
        const reservedUntil = match.giftPaymentReservedUntil?.toDate?.() || (match.giftPaymentReservedUntil ? new Date(match.giftPaymentReservedUntil) : null);
        if (match.giftOrderStatus === "PAYMENT_INITIALIZING" && match.giftPaymentConversationId !== conversationId && reservedUntil?.getTime() > Date.now()) {
            throw new PaymentValidationError("Bu Kura hediyesi için ödeme işlemi devam ediyor.", 409, "RAFFLE_GIFT_PAYMENT_IN_PROGRESS");
        }
        recipientUid = match.recipientUid;
        const recipientRef = firestore.collection("raffleParticipants").doc(`${eventId}_${recipientUid}`);
        const recipientSnapshot = await transaction.get(recipientRef);
        if (!recipientSnapshot.exists || recipientSnapshot.data().status !== "ACTIVE") throw new PaymentValidationError("Kura alıcısı doğrulanamadı.", 409, "RAFFLE_RECIPIENT_INVALID");
        recipient = recipientSnapshot.data();
        const delivery = recipient.deliveryAddress;
        if (!recipient.deliveryReady || !delivery?.address || !delivery?.city || !delivery?.phone) {
            throw new PaymentValidationError("Kura alıcısının teslimat adresi henüz hazır değil.", 409, "RAFFLE_RECIPIENT_DELIVERY_MISSING");
        }
        transaction.set(matchRef, {
            giftPaymentConversationId: conversationId,
            giftPaymentReservedUntil: new Date(Date.now() + 15 * 60 * 1000),
            giftOrderStatus: "PAYMENT_INITIALIZING",
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
    });
    const delivery = recipient.deliveryAddress;
    const batch = firestore.batch();
    for (const item of verifiedItems) {
        batch.set(firestore.collection("raffleOrderDeliveries").doc(item.siparisId), {
            orderId: item.siparisId, eventId, giverUid, recipientUid,
            recipientDisplayName: recipient.displayName || "HediyeAlSat Üyesi",
            ...delivery, conversationId, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        batch.update(firestore.collection("siparisler").doc(item.siparisId), {
            isRaffleGift: true, raffleEventId: eventId,
            raffleRecipientDisplayName: recipient.displayName || "HediyeAlSat Üyesi",
            adres: "Kura sistemi tarafından güvenle iletilecek", telefon: "", il: "", ilce: "",
            guncellenmeTarihi: FieldValue.serverTimestamp()
        });
    }
    batch.set(matchRef, {
        giftOrderIds: verifiedItems.map((item) => item.siparisId),
        giftOrderStatus: "PAYMENT_PENDING",
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    try {
        await batch.commit();
    } catch (error) {
        await releaseRaffleGiftReservation({ firestore, FieldValue, eventId, giverUid, conversationId }).catch(() => undefined);
        throw error;
    }
    return {
        recipientDisplayName: recipient.displayName || "HediyeAlSat Üyesi",
        buyer: { fullName: delivery.fullName, phone: delivery.phone, address: delivery.address, city: delivery.city, district: delivery.district }
    };
}

async function releaseRaffleGiftReservation({ firestore, FieldValue, eventId, giverUid, conversationId }) {
    if (!eventId || !giverUid || !conversationId) return;
    const matchRef = firestore.collection("raffleMatches").doc(`${eventId}_${giverUid}`);
    await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(matchRef);
        if (!snapshot.exists) return;
        const match = snapshot.data();
        if (match.giftOrderPaid === true || match.giftPaymentConversationId !== conversationId) return;
        transaction.set(matchRef, {
            giftOrderStatus: "RETRY_ALLOWED",
            giftPaymentReservedUntil: null,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
    });
}

module.exports = { prepareRaffleGift, releaseRaffleGiftReservation, assertPhysicalItems };
