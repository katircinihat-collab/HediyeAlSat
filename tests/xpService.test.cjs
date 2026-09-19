const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applyXpEvent,
  levelForXP,
  progressForXP,
  istanbulDateKey,
  awardXP,
  spendXP
} = require("../backend/services/xpService");

const FieldValue = { serverTimestamp: () => "server-time" };

function memoryFirestore(seed = {}) {
  const data = new Map(Object.entries(seed));
  let chain = Promise.resolve();
  const ref = (path) => ({ path });
  return {
    data,
    collection(name) { return { doc(id) { return ref(`${name}/${id}`); } }; },
    runTransaction(handler) {
      const run = chain.then(async () => {
        const writes = [];
        const transaction = {
          async get(reference) {
            const value = data.get(reference.path);
            return { exists: value !== undefined, data: () => value };
          },
          set(reference, value, options) { writes.push({ operation: "set", reference, value, options }); },
          create(reference, value) { writes.push({ operation: "create", reference, value }); }
        };
        const result = await handler(transaction);
        for (const write of writes) {
          if (write.operation === "create" && data.has(write.reference.path)) throw new Error("already exists");
          const current = data.get(write.reference.path) || {};
          data.set(write.reference.path, write.options?.merge ? { ...current, ...write.value } : write.value);
        }
        return result;
      });
      chain = run.catch(() => undefined);
      return run;
    }
  };
}

function apply(database, reason, sourceId, now) {
  return applyXpEvent({ firestore: database, FieldValue, uid: "user-1", reason, sourceId, now });
}

test("hoş geldin bonusu lifetimeXP ve availableXP değerlerini yalnız bir kez artırır", async () => {
  const database = memoryFirestore();
  const first = await apply(database, "WELCOME_BONUS", "user-1");
  const duplicate = await apply(database, "WELCOME_BONUS", "user-1");
  assert.deepEqual([first.lifetimeXP, first.availableXP, first.amount], [25, 25, 25]);
  assert.equal(duplicate.duplicate, true);
  assert.deepEqual([duplicate.lifetimeXP, duplicate.availableXP], [25, 25]);
});

test("harcama yalnız availableXP değerini azaltır ve yetersiz bakiye reddedilir", async () => {
  const database = memoryFirestore();
  await apply(database, "WELCOME_BONUS", "user-1");
  const spent = await apply(database, "BATTLE_CREATE", "battle-1");
  assert.deepEqual([spent.lifetimeXP, spent.availableXP], [25, 0]);
  await assert.rejects(apply(database, "RAFFLE_JOIN", "raffle-1"), (error) => error.code === "XP_INSUFFICIENT");
});

test("refund availableXP değerini geri verir, lifetimeXP değerini artırmaz ve idempotenttir", async () => {
  const database = memoryFirestore({ "userXpBalances/user-1": { lifetimeXP: 125, availableXP: 125 } });
  await apply(database, "RAFFLE_JOIN", "raffle-1");
  const refunded = await apply(database, "RAFFLE_REFUND", "raffle-1");
  const duplicate = await apply(database, "RAFFLE_REFUND", "raffle-1");
  assert.deepEqual([refunded.lifetimeXP, refunded.availableXP], [125, 125]);
  assert.equal(duplicate.duplicate, true);
});

test("aynı event için paralel istek çift XP üretmez", async () => {
  const database = memoryFirestore();
  const results = await Promise.all([
    apply(database, "WELCOME_BONUS", "user-1"),
    apply(database, "WELCOME_BONUS", "user-1")
  ]);
  assert.equal(results.filter((result) => result.applied).length, 1);
  assert.equal(database.data.get("userXpBalances/user-1").availableXP, 25);
});

test("kapışma oyları İstanbul gününde 25 XP ile sınırlanır, altıncı oy geçerli ama XP vermez", async () => {
  const database = memoryFirestore();
  const now = new Date("2026-09-19T12:00:00.000Z");
  const results = [];
  for (let index = 1; index <= 6; index += 1) results.push(await apply(database, "GIFT_BATTLE_VOTE", `vote-${index}`, now));
  assert.deepEqual(results.map((result) => result.amount), [5, 5, 5, 5, 5, 0]);
  assert.equal(results[5].capped, true);
  assert.deepEqual([results[5].lifetimeXP, results[5].availableXP], [25, 25]);
});

test("Europe/Istanbul gün anahtarı gece sınırını client saatinden bağımsız hesaplar", () => {
  assert.equal(istanbulDateKey(new Date("2026-09-19T20:59:59.000Z")), "2026-09-19");
  assert.equal(istanbulDateKey(new Date("2026-09-19T21:00:00.000Z")), "2026-09-20");
});

test("seviye sınırları ve progress hesabı tanımlanan eşiklerle uyumludur", () => {
  const expected = [[0, 1], [99, 1], [100, 2], [299, 2], [300, 3], [749, 3], [750, 4], [1499, 4], [1500, 5]];
  expected.forEach(([xp, level]) => assert.equal(levelForXP(xp).level, level));
  assert.deepEqual(progressForXP(1500), { percent: 100, remaining: 0, next: null });
  assert.equal(progressForXP(480).remaining, 270);
});

test("alanları olmayan eski kullanıcı güvenli biçimde 0 XP ile başlar", async () => {
  const database = memoryFirestore({ "userXpBalances/user-1": { updatedAt: "legacy" } });
  const result = await apply(database, "WELCOME_BONUS", "new-event");
  assert.deepEqual([result.lifetimeXP, result.availableXP], [25, 25]);
});

test("award ve spend servisleri yanlış event türüyle çağrılamaz", async () => {
  const database = memoryFirestore();
  await assert.rejects(
    awardXP({ firestore: database, FieldValue, uid: "user-1", reason: "RAFFLE_JOIN", sourceId: "r1" }),
    (error) => error.code === "XP_TYPE_MISMATCH"
  );
  await assert.rejects(
    spendXP({ firestore: database, FieldValue, uid: "user-1", reason: "WELCOME_BONUS", sourceId: "w1" }),
    (error) => error.code === "XP_TYPE_MISMATCH"
  );
});
