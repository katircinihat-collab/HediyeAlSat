const test = require("node:test");
const assert = require("node:assert/strict");
const { assertPhysicalItems, prepareRaffleGift, releaseRaffleGiftReservation } = require("../backend/services/raffleGiftService");

function fakeFirestore(seed) {
  const values = new Map(Object.entries(seed));
  const ref = (collection, id) => ({ key: `${collection}/${id}` });
  const snapshot = (reference) => ({ exists: values.has(reference.key), data: () => values.get(reference.key) });
  const merge = (reference, data) => values.set(reference.key, { ...(values.get(reference.key) || {}), ...data });
  return {
    values,
    collection(name) { return { doc(id) { return ref(name, id); } }; },
    async runTransaction(handler) {
      return handler({ get: async (reference) => snapshot(reference), set: merge, update: merge });
    },
    batch() {
      const operations = [];
      return {
        set(reference, data) { operations.push(() => merge(reference, data)); },
        update(reference, data) { operations.push(() => merge(reference, data)); },
        async commit() { operations.forEach((operation) => operation()); }
      };
    }
  };
}

const fieldValue = { serverTimestamp: () => "SERVER_TIME" };
const physicalItem = { isDigital: false, siparisId: "order-1" };
function giftSeed(match = {}, participant = {}) {
  return {
    "raffleEvents/event-1": { status: "MATCHED" },
    "raffleMatches/event-1_giver-1": { giverUid: "giver-1", recipientUid: "receiver-1", ...match },
    "raffleParticipants/event-1_receiver-1": {
      status: "ACTIVE", displayName: "Alıcı",
      deliveryReady: true,
      deliveryAddress: { fullName: "Alıcı Kişi", phone: "05555555555", address: "Örnek Mahallesi No 10", city: "İstanbul", district: "Kadıköy" },
      ...participant
    },
    "siparisler/order-1": { aliciUid: "giver-1" }
  };
}

test("Kura hediyesi yalnız fiziksel ürün kabul eder", () => {
  assert.doesNotThrow(() => assertPhysicalItems([{ isDigital: false }]));
  assert.throws(() => assertPhysicalItems([{ isDigital: true }]), (error) => error.code === "RAFFLE_DIGITAL_UNSUPPORTED");
});

test("Kura teslimat koleksiyonu client erişimine kapalı ve seller endpointi auth korumalıdır", () => {
  const fs = require("node:fs");
  const rules = fs.readFileSync("firestore.rules", "utf8");
  const routes = fs.readFileSync("backend/routes/raffleRoutes.js", "utf8");
  const controller = fs.readFileSync("backend/controllers/raffleController.js", "utf8");
  assert.match(rules, /match \/raffleOrderDeliveries\/\{deliveryId\}[\s\S]*allow read, create, update, delete: if false/);
  assert.match(routes, /\/orders\/:orderId\/fulfillment", authMiddleware/);
  assert.match(controller, /sellerOwns/);
  assert.doesNotMatch(controller, /recipientUid:\s*value\.recipientUid/);
});

test("checkout yalnız event bağlamını yollar; receiver ve adres client-authoritative değildir", () => {
  const fs = require("node:fs");
  const checkout = fs.readFileSync("src/pages/Checkout.jsx", "utf8");
  const payment = fs.readFileSync("backend/services/paymentService.js", "utf8");
  const gift = fs.readFileSync("backend/services/raffleGiftService.js", "utf8");
  assert.match(checkout, /raffleEventId: raffleGift \? raffleEventId : ""/);
  assert.doesNotMatch(checkout, /receiverUid/);
  assert.match(payment, /prepareRaffleGift/);
  assert.match(payment, /isRaffleGift: Boolean\(trustedRaffleGift\)/);
  assert.match(payment, /raffleEventId: trustedRaffleGift \?/);
  assert.match(gift, /match\.giverUid !== giverUid/);
  assert.match(gift, /recipient\.deliveryAddress/);
});

test("Kura hediye receiver ve teslimatı yalnız server-side eşleşmeden çözülür", async () => {
  const db = fakeFirestore(giftSeed());
  const result = await prepareRaffleGift({
    firestore: db, FieldValue: fieldValue, eventId: "event-1", giverUid: "giver-1",
    verifiedItems: [physicalItem], conversationId: "conversation-1"
  });
  assert.equal(result.recipientDisplayName, "Alıcı");
  assert.equal(result.buyer.address, "Örnek Mahallesi No 10");
  assert.equal(db.values.get("siparisler/order-1").adres, "Kura sistemi tarafından güvenle iletilecek");
  assert.equal(db.values.get("raffleOrderDeliveries/order-1").recipientUid, "receiver-1");
  assert.deepEqual(db.values.get("raffleMatches/event-1_giver-1").giftOrderIds, ["order-1"]);
});

test("aktif Kura hediye ödeme rezervasyonu paralel ikinci başlatmayı engeller", async () => {
  const db = fakeFirestore(giftSeed({
    giftOrderStatus: "PAYMENT_INITIALIZING",
    giftPaymentConversationId: "other-conversation",
    giftPaymentReservedUntil: new Date(Date.now() + 60_000)
  }));
  await assert.rejects(() => prepareRaffleGift({
    firestore: db, FieldValue: fieldValue, eventId: "event-1", giverUid: "giver-1",
    verifiedItems: [physicalItem], conversationId: "conversation-2"
  }), (error) => error.code === "RAFFLE_GIFT_PAYMENT_IN_PROGRESS");
});

test("başlatma hatası sonrası rezervasyon idempotent şekilde retry durumuna alınır", async () => {
  const db = fakeFirestore(giftSeed({
    giftOrderStatus: "PAYMENT_PENDING", giftPaymentConversationId: "conversation-1"
  }));
  await releaseRaffleGiftReservation({
    firestore: db, FieldValue: fieldValue, eventId: "event-1", giverUid: "giver-1", conversationId: "conversation-1"
  });
  assert.equal(db.values.get("raffleMatches/event-1_giver-1").giftOrderStatus, "RETRY_ALLOWED");
  await releaseRaffleGiftReservation({
    firestore: db, FieldValue: fieldValue, eventId: "event-1", giverUid: "giver-1", conversationId: "old-conversation"
  });
  assert.equal(db.values.get("raffleMatches/event-1_giver-1").giftPaymentConversationId, "conversation-1");
});

test("adres doğrulanmadan Kura ödeme rezervasyonu veya sipariş mutationı oluşmaz", async () => {
  const db = fakeFirestore(giftSeed({}, { deliveryReady: false, deliveryAddress: null }));
  await assert.rejects(() => prepareRaffleGift({
    firestore: db, FieldValue: fieldValue, eventId: "event-1", giverUid: "giver-1",
    verifiedItems: [physicalItem], conversationId: "conversation-1"
  }), (error) => error.code === "RAFFLE_RECIPIENT_DELIVERY_MISSING");
  assert.equal(db.values.get("raffleMatches/event-1_giver-1").giftOrderStatus, undefined);
  assert.equal(db.values.has("raffleOrderDeliveries/order-1"), false);
});
