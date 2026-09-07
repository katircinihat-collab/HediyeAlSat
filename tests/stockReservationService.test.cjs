const test = require("node:test");
const assert = require("node:assert/strict");
const {
    reserveStock,
    releaseReservation,
    releaseExpiredReservations
} = require("../backend/services/stockReservationService");

function memoryFirestore(seed = {}) {
    const data = new Map(Object.entries(seed));
    const ref = (path) => ({ path, id: path.split("/").pop() });
    const database = {
        data,
        collection(name) {
            return {
                doc(id) { return ref(`${name}/${id}`); },
                where(field, operator, value) {
                    assert.equal(operator, "==");
                    return {
                        async get() {
                            const docs = [...data.entries()]
                                .filter(([path, item]) => path.startsWith(`${name}/`) && item[field] === value)
                                .map(([path, item]) => ({ id: path.split("/").pop(), data: () => item }));
                            return { docs, size: docs.length };
                        }
                    };
                }
            };
        },
        async runTransaction(handler) {
            const writes = [];
            const tx = {
                async get(reference) {
                    const value = data.get(reference.path);
                    return { id: reference.id, exists: value !== undefined, data: () => value };
                },
                set(reference, value) { writes.push({ reference, value, replace: true }); },
                update(reference, value) { writes.push({ reference, value, replace: false }); }
            };
            const result = await handler(tx);
            writes.forEach(({ reference, value, replace }) => {
                data.set(reference.path, replace ? value : { ...(data.get(reference.path) || {}), ...value });
            });
            return result;
        }
    };
    return database;
}

const FieldValue = { serverTimestamp: () => "server-time" };
const physical = (listingId, quantity = 1) => ({ listingId, quantity, isDigital: false });

test("son stok ilk ödeme oturumuna rezerve edilir, ikincisi reddedilir", async () => {
    const db = memoryFirestore({ "ilanlar/item-1": { stok: 1, urunTipi: "fiziksel", aktif: true } });
    await reserveStock({ firestore: db, FieldValue, conversationId: "conv-1", verifiedItems: [physical("item-1")] });
    await assert.rejects(
        reserveStock({ firestore: db, FieldValue, conversationId: "conv-2", verifiedItems: [physical("item-1")] }),
        (error) => error.code === "INSUFFICIENT_STOCK"
    );
    assert.equal(db.data.get("ilanlar/item-1").stok, 0);
});

test("aynı ödeme rezervasyonu stoktan ikinci kez düşmez", async () => {
    const db = memoryFirestore({ "ilanlar/item-1": { stok: 3, urunTipi: "fiziksel" } });
    const first = await reserveStock({ firestore: db, FieldValue, conversationId: "conv-1", verifiedItems: [physical("item-1", 2)] });
    const second = await reserveStock({ firestore: db, FieldValue, conversationId: "conv-1", verifiedItems: [physical("item-1", 2)] });
    assert.equal(first.id, second.id);
    assert.equal(second.idempotent, true);
    assert.equal(db.data.get("ilanlar/item-1").stok, 1);
});

test("süresi dolan rezervasyon stoğu bir kez serbest bırakır", async () => {
    const now = new Date("2026-09-07T12:00:00Z");
    const db = memoryFirestore({ "ilanlar/item-1": { stok: 1, urunTipi: "fiziksel", aktif: true } });
    const reservation = await reserveStock({ firestore: db, FieldValue, conversationId: "conv-1", verifiedItems: [physical("item-1")], now });
    const expiry = new Date(now.getTime() + 16 * 60 * 1000);
    await releaseExpiredReservations({ firestore: db, FieldValue, now: expiry });
    await releaseExpiredReservations({ firestore: db, FieldValue, now: expiry });
    assert.equal(db.data.get("ilanlar/item-1").stok, 1);
    assert.equal(db.data.get(`stockReservations/${reservation.id}`).status, "RELEASED");
});

test("finalize edilmiş rezervasyon cleanup sırasında stoğa geri eklenmez", async () => {
    const now = new Date("2026-09-07T12:00:00Z");
    const db = memoryFirestore({
        "ilanlar/item-1": { stok: 0, urunTipi: "fiziksel", aktif: false },
        "stockReservations/finalized": {
            status: "FINALIZED",
            expiresAt: new Date(now.getTime() - 1000),
            items: [{ listingId: "item-1", quantity: 1 }]
        }
    });
    const result = await releaseExpiredReservations({ firestore: db, FieldValue, now });
    assert.equal(result.released, 0);
    assert.equal(db.data.get("ilanlar/item-1").stok, 0);
});

test("başarısız ödeme rezervasyonu serbest bırakabilir", async () => {
    const db = memoryFirestore({ "ilanlar/item-1": { stok: 2, urunTipi: "fiziksel" } });
    const reservation = await reserveStock({ firestore: db, FieldValue, conversationId: "conv-1", verifiedItems: [physical("item-1")] });
    await releaseReservation({ firestore: db, FieldValue, reservationId: reservation.id, reason: "PAYMENT_FAILED" });
    assert.equal(db.data.get("ilanlar/item-1").stok, 2);
});

test("dijital ürün rezervasyon belgesi ve stok değişikliği oluşturmaz", async () => {
    const db = memoryFirestore({ "ilanlar/digital-1": { stok: 1, urunTipi: "dijital" } });
    const result = await reserveStock({ firestore: db, FieldValue, conversationId: "conv-1", verifiedItems: [{ listingId: "digital-1", quantity: 1, isDigital: true }] });
    assert.equal(result, null);
    assert.equal(db.data.get("ilanlar/digital-1").stok, 1);
    assert.equal([...db.data.keys()].some((key) => key.startsWith("stockReservations/")), false);
});

test("çoklu ürün ve adet tek transaction sonucuna yansır", async () => {
    const db = memoryFirestore({
        "ilanlar/item-1": { stok: 5, urunTipi: "fiziksel" },
        "ilanlar/item-2": { stok: 4, urunTipi: "fiziksel" }
    });
    const result = await reserveStock({ firestore: db, FieldValue, conversationId: "conv-1", verifiedItems: [physical("item-1", 2), physical("item-1", 1), physical("item-2", 3)] });
    assert.deepEqual(result.items, [{ listingId: "item-1", quantity: 3 }, { listingId: "item-2", quantity: 3 }]);
    assert.equal(db.data.get("ilanlar/item-1").stok, 2);
    assert.equal(db.data.get("ilanlar/item-2").stok, 1);
});
