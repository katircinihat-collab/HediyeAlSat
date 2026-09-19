const test = require("node:test");
const assert = require("node:assert/strict");
const {
  joinRaffle, cancelParticipation, deterministicOrder, drawRaffle, publicEvent, safeDisplayName
} = require("../backend/services/raffleService");
const { validateEventInput } = require("../backend/controllers/raffleController");

const FieldValue = {
  serverTimestamp: () => "server-time",
  increment: (value) => ({ __increment: value })
};

function memoryFirestore(seed = {}) {
  const data = new Map(Object.entries(seed));
  let chain = Promise.resolve();
  const collectionApi = (name, filters = [], limitValue = Infinity) => ({
    __query: true, name, filters, limitValue,
    doc(id) { return { path: `${name}/${id}` }; },
    where(field, operator, value) { return collectionApi(name, [...filters, [field, operator, value]], limitValue); },
    limit(value) { return collectionApi(name, filters, value); }
  });
  const snapshotFor = (reference) => {
    if (!reference.__query) {
      const value = data.get(reference.path);
      return { id: reference.path.split("/").pop(), exists: value !== undefined, data: () => value };
    }
    const prefix = `${reference.name}/`;
    const docs = [...data.entries()].filter(([key, value]) => key.startsWith(prefix) && reference.filters.every(([field, operator, expected]) => operator === "==" && value[field] === expected)).slice(0, reference.limitValue).map(([key, value]) => ({ id: key.slice(prefix.length), data: () => value }));
    return { docs, size: docs.length, empty: docs.length === 0 };
  };
  return {
    data,
    collection: collectionApi,
    runTransaction(handler) {
      const run = chain.then(async () => {
        const writes = [];
        const transaction = {
          get: async (reference) => snapshotFor(reference),
          create: (reference, value) => writes.push({ type: "create", reference, value }),
          set: (reference, value, options) => writes.push({ type: "set", reference, value, options }),
          update: (reference, value) => writes.push({ type: "update", reference, value })
        };
        const result = await handler(transaction);
        writes.forEach((write) => {
          if (write.type === "create" && data.has(write.reference.path)) throw new Error("already exists");
          const current = data.get(write.reference.path) || {};
          const next = write.type === "create" || (write.type === "set" && !write.options?.merge) ? {} : { ...current };
          Object.entries(write.value).forEach(([field, value]) => { next[field] = value?.__increment !== undefined ? (Number(current[field]) || 0) + value.__increment : value; });
          data.set(write.reference.path, next);
        });
        return result;
      });
      chain = run.catch(() => undefined);
      return run;
    }
  };
}

function openSeed(balance = 100) {
  return {
    "raffleEvents/r1": { title: "Kura", status: "OPEN", participantCount: 0, joinStartAt: new Date("2026-09-01"), joinEndAt: new Date("2026-09-20"), drawAt: new Date("2026-09-21") },
    "userXpBalances/u1": { lifetimeXP: 250, availableXP: balance }
  };
}

const user = { uid: "u1", name: "Ayşe" };
const now = new Date("2026-09-19T12:00:00Z");

const eventInput = (overrides = {}) => ({
  title: "Topluluk Kurası", description: "", status: "UPCOMING",
  joinStartAt: "2026-09-20", joinEndAt: "2026-09-21", drawAt: "2026-09-22",
  ...overrides
});

test("Kura bütçesiz veya tek opsiyonel önerilen bütçeyle oluşturulabilir", () => {
  assert.equal(validateEventInput(eventInput()).suggestedGiftBudget, null);
  assert.equal(validateEventInput(eventInput({ suggestedGiftBudget: "500" })).suggestedGiftBudget, 500);
  assert.equal(validateEventInput(eventInput({ suggestedGiftBudget: "" })).suggestedGiftBudget, null);
});

test("geçersiz veya negatif önerilen bütçe reddedilir", () => {
  for (const suggestedGiftBudget of [-1, 0, "geçersiz", 1000001]) {
    assert.throws(() => validateEventInput(eventInput({ suggestedGiftBudget })), (error) => error.code === "RAFFLE_INVALID_SUGGESTED_BUDGET");
  }
});

test("eski min bütçe alanları yalnız güvenli öneri fallback'i olarak okunur", () => {
  assert.equal(publicEvent("legacy", { giftBudgetMin: 350, giftBudgetMax: 800 }).suggestedGiftBudget, 350);
  assert.equal(publicEvent("legacy-2", { minGiftBudget: 400, maxGiftBudget: 900 }).suggestedGiftBudget, 400);
  assert.equal(publicEvent("new", { suggestedGiftBudget: 500, giftBudgetMin: 350 }).suggestedGiftBudget, 500);
});

test("Kura katılımı 100 availableXP düşürür, lifetimeXP değişmez ve ipucunu kaydeder", async () => {
  const db = memoryFirestore(openSeed());
  await joinRaffle({ firestore: db, FieldValue, eventId: "r1", user, giftHint: "Kitap ve kahve severim", now });
  assert.deepEqual(db.data.get("userXpBalances/u1"), { uid: "u1", lifetimeXP: 250, availableXP: 0, updatedAt: "server-time" });
  assert.equal(db.data.get("raffleParticipants/r1_u1").giftHint, "Kitap ve kahve severim");
  assert.equal(db.data.get("raffleEvents/r1").participantCount, 1);
});

test("yetersiz XP katılımı reddeder ve participant oluşturmaz", async () => {
  const db = memoryFirestore(openSeed(99));
  await assert.rejects(joinRaffle({ firestore: db, FieldValue, eventId: "r1", user, now }), (error) => error.code === "XP_INSUFFICIENT");
  assert.equal(db.data.has("raffleParticipants/r1_u1"), false);
});

test("duplicate ve paralel join ikinci kez XP düşürmez", async () => {
  const db = memoryFirestore(openSeed());
  const results = await Promise.all([
    joinRaffle({ firestore: db, FieldValue, eventId: "r1", user, now }),
    joinRaffle({ firestore: db, FieldValue, eventId: "r1", user, now })
  ]);
  assert.equal(results.filter((result) => result.duplicate).length, 1);
  assert.equal(db.data.get("userXpBalances/u1").availableXP, 0);
  assert.equal(db.data.get("raffleEvents/r1").participantCount, 1);
});

test("draw öncesi iptal 100 availableXP iade eder, lifetimeXP artmaz ve duplicate güvenlidir", async () => {
  const db = memoryFirestore(openSeed());
  await joinRaffle({ firestore: db, FieldValue, eventId: "r1", user, now });
  const first = await cancelParticipation({ firestore: db, FieldValue, eventId: "r1", uid: "u1", now });
  const second = await cancelParticipation({ firestore: db, FieldValue, eventId: "r1", uid: "u1", now });
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.deepEqual([db.data.get("userXpBalances/u1").lifetimeXP, db.data.get("userXpBalances/u1").availableXP], [250, 100]);
  assert.equal(db.data.get("raffleEvents/r1").participantCount, 0);
});

test("paralel join ve cancel bakiyeyi veya katılımcı sayısını bozmaz", async () => {
  const db = memoryFirestore(openSeed());
  const joinPromise = joinRaffle({ firestore: db, FieldValue, eventId: "r1", user, now });
  const cancelPromise = cancelParticipation({ firestore: db, FieldValue, eventId: "r1", uid: "u1", now });
  await Promise.all([joinPromise, cancelPromise]);
  assert.equal(db.data.get("userXpBalances/u1").availableXP, 100);
  assert.equal(db.data.get("raffleParticipants/r1_u1").status, "CANCELLED");
  assert.equal(db.data.get("raffleEvents/r1").participantCount, 0);
});

test("iptal edilmiş etkinlikte katılım iadesi idempotent çalışır", async () => {
  const db = memoryFirestore(openSeed());
  await joinRaffle({ firestore: db, FieldValue, eventId: "r1", user, now });
  db.data.get("raffleEvents/r1").status = "CANCELLED";
  await cancelParticipation({ firestore: db, FieldValue, eventId: "r1", uid: "u1", now });
  const duplicate = await cancelParticipation({ firestore: db, FieldValue, eventId: "r1", uid: "u1", now });
  assert.equal(duplicate.duplicate, true);
  assert.equal(db.data.get("userXpBalances/u1").availableXP, 100);
});

test("draw sonrası katılım iptali ve yeni join reddedilir", async () => {
  const seed = openSeed(); seed["raffleEvents/r1"].status = "MATCHED";
  seed["raffleParticipants/r1_u1"] = { eventId: "r1", userUid: "u1", status: "ACTIVE" };
  const db = memoryFirestore(seed);
  await assert.rejects(cancelParticipation({ firestore: db, FieldValue, eventId: "r1", uid: "u1", now }), (error) => error.code === "RAFFLE_ALREADY_DRAWN");
  await assert.rejects(joinRaffle({ firestore: db, FieldValue, eventId: "r1", user, now }), (error) => error.code === "RAFFLE_NOT_OPEN");
});

test("deterministik circular eşleştirme self-match üretmez ve herkes bir kez alıcı olur", () => {
  const participants = ["a", "b", "c", "d"].map((userUid) => ({ userUid }));
  const order = deterministicOrder(participants, "r1", "fixed-seed");
  const pairs = order.map((giver, index) => [giver.userUid, order[(index + 1) % order.length].userUid]);
  assert.equal(pairs.every(([giver, recipient]) => giver !== recipient), true);
  assert.equal(new Set(pairs.map((pair) => pair[0])).size, 4);
  assert.equal(new Set(pairs.map((pair) => pair[1])).size, 4);
  assert.deepEqual(deterministicOrder(participants, "r1", "fixed-seed"), order);
});

test("iki katılımcı karşılıklı eşleşir; tek katılımcıyla draw reddedilir", async () => {
  const twoSeed = { "raffleEvents/r1": { status: "OPEN", participantCount: 2, drawAt: new Date("2026-09-18") }, "raffleParticipants/r1_a": { eventId: "r1", userUid: "a", status: "ACTIVE" }, "raffleParticipants/r1_b": { eventId: "r1", userUid: "b", status: "ACTIVE" } };
  const twoDb = memoryFirestore(twoSeed);
  const drawn = await drawRaffle({ firestore: twoDb, FieldValue, eventId: "r1", adminUid: "admin", now, seed: "fixed" });
  assert.equal(drawn.count, 2);
  assert.equal(twoDb.data.get("raffleMatches/r1_a").recipientUid, "b");
  assert.equal(twoDb.data.get("raffleMatches/r1_b").recipientUid, "a");
  const duplicate = await drawRaffle({ firestore: twoDb, FieldValue, eventId: "r1", adminUid: "admin", now, seed: "different" });
  assert.equal(duplicate.duplicate, true);
  assert.equal(twoDb.data.get("raffleMatches/r1_a").recipientUid, "b");

  const oneDb = memoryFirestore({ "raffleEvents/r1": { status: "OPEN", participantCount: 1, drawAt: new Date("2026-09-18") }, "raffleParticipants/r1_a": { eventId: "r1", userUid: "a", status: "ACTIVE" } });
  await assert.rejects(drawRaffle({ firestore: oneDb, FieldValue, eventId: "r1", adminUid: "admin", now }), (error) => error.code === "RAFFLE_NOT_ENOUGH_PARTICIPANTS");
});

test("üçten fazla katılımcıda herkes tam bir kişiye verir ve tam bir kişiden alır", async () => {
  const seed = { "raffleEvents/r-many": { status: "OPEN", participantCount: 5, drawAt: new Date("2026-09-18") } };
  for (const userUid of ["a", "b", "c", "d", "e"]) seed[`raffleParticipants/r-many_${userUid}`] = { eventId: "r-many", userUid, status: "ACTIVE" };
  const db = memoryFirestore(seed);
  const result = await drawRaffle({ firestore: db, FieldValue, eventId: "r-many", adminUid: "admin", now, seed: "fixed" });
  const matches = [...db.data.entries()].filter(([key]) => key.startsWith("raffleMatches/r-many_" )).map(([, value]) => value);
  assert.equal(result.count, 5);
  assert.equal(new Set(matches.map((match) => match.giverUid)).size, 5);
  assert.equal(new Set(matches.map((match) => match.recipientUid)).size, 5);
  assert.equal(matches.every((match) => match.giverUid !== match.recipientUid), true);
});

test("draw zamanı gelmeden eşleştirme yapılamaz", async () => {
  const db = memoryFirestore({ "raffleEvents/r1": { status: "OPEN", participantCount: 2, drawAt: new Date("2026-09-20") }, "raffleParticipants/r1_a": { eventId: "r1", userUid: "a", status: "ACTIVE" }, "raffleParticipants/r1_b": { eventId: "r1", userUid: "b", status: "ACTIVE" } });
  await assert.rejects(drawRaffle({ firestore: db, FieldValue, eventId: "r1", adminUid: "admin", now }), (error) => error.code === "RAFFLE_DRAW_TOO_EARLY");
});

test("iki paralel draw aynı eşleşmeyi korur", async () => {
  const db = memoryFirestore({ "raffleEvents/r1": { status: "OPEN", participantCount: 2, drawAt: new Date("2026-09-18") }, "raffleParticipants/r1_a": { eventId: "r1", userUid: "a", status: "ACTIVE" }, "raffleParticipants/r1_b": { eventId: "r1", userUid: "b", status: "ACTIVE" } });
  const results = await Promise.all([
    drawRaffle({ firestore: db, FieldValue, eventId: "r1", adminUid: "admin", now, seed: "first" }),
    drawRaffle({ firestore: db, FieldValue, eventId: "r1", adminUid: "admin", now, seed: "second" })
  ]);
  assert.equal(results.filter((result) => result.duplicate).length, 1);
  assert.equal(db.data.get("raffleMatches/r1_a").recipientUid, "b");
});

test("hediye ipucu ve sohbet metni iletişim bilgisi sızdırmaz", async () => {
  const db = memoryFirestore(openSeed());
  await assert.rejects(joinRaffle({ firestore: db, FieldValue, eventId: "r1", user, giftHint: "Beni 0532 111 22 33 ara", now }), (error) => error.code === "RAFFLE_PRIVATE_DATA");
  await assert.rejects(joinRaffle({ firestore: memoryFirestore(openSeed()), FieldValue, eventId: "r1", user, giftHint: "Bana @kullanici hesabından ulaş", now }), (error) => error.code === "RAFFLE_PRIVATE_DATA");
  assert.equal(safeDisplayName("uye@example.com"), "HediyeAlSat Üyesi");
  assert.equal(safeDisplayName("Ayşe T."), "Ayşe T.");
});
