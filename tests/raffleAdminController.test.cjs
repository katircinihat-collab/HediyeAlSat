const test = require("node:test");
const assert = require("node:assert/strict");
const { firestore } = require("../backend/config/firebase");
const controller = require("../backend/controllers/raffleController");

const doc = (id, data) => ({ id, data: () => data });
const response = () => ({
  statusCode: 200,
  payload: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.payload = payload; return this; }
});

function adminFirestore() {
  const participants = [
    doc("r1_u1", { eventId: "r1", userUid: "u1", displayName: "Ayşe T.", status: "ACTIVE", giftHint: "Kitap severim", joinedAt: new Date("2026-09-19") }),
    doc("r1_u2", { eventId: "r1", userUid: "u2", displayName: "Mehmet D.", status: "ACTIVE", giftHint: "", joinedAt: new Date("2026-09-19") })
  ];
  const matches = [
    doc("r1_u1", { eventId: "r1", giverUid: "u1", recipientUid: "u2" }),
    doc("r1_u2", { eventId: "r1", giverUid: "u2", recipientUid: "u1" })
  ];
  return (name) => ({
    doc: () => ({ get: async () => ({ exists: true, data: () => ({ status: "MATCHED" }) }) }),
    where: () => ({ limit: () => ({ get: async () => ({ docs: name === "raffleMatches" ? matches : participants }) }) })
  });
}

test("admin katılımcı listesi yalnız güvenli yönetim alanlarını döndürür", async () => {
  const original = firestore.collection;
  firestore.collection = adminFirestore();
  try {
    const res = response();
    await controller.adminParticipants({ params: { eventId: "r1" } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(Object.keys(res.payload.participants[0]).sort(), ["deliveryReady", "displayName", "giftHint", "joinedAt", "status"]);
    assert.equal(JSON.stringify(res.payload).includes("userUid"), false);
  } finally { firestore.collection = original; }
});

test("admin sonuç özeti güvenli adlarla tam circular sonucu döndürür", async () => {
  const original = firestore.collection;
  firestore.collection = adminFirestore();
  try {
    const res = response();
    await controller.adminResults({ params: { eventId: "r1" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.matchedCount, 2);
    assert.deepEqual(res.payload.matches[0], { giverDisplayName: "Ayşe T.", recipientDisplayName: "Mehmet D." });
    assert.equal(JSON.stringify(res.payload).match(/Uid|email|phone|address|token/i), null);
  } finally { firestore.collection = original; }
});
