const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const indexConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "firestore.indexes.json"), "utf8"));

test("mesajlar sorguları için gereken dört composite index eksiksiz ve benzersizdir", () => {
  const messageIndexes = indexConfig.indexes.filter((index) => index.collectionGroup === "mesajlar");
  assert.equal(messageIndexes.length, 4);

  const signatures = messageIndexes.map((index) => {
    assert.equal(index.queryScope, "COLLECTION");
    assert.equal(index.fields.length, 2);
    assert.deepEqual(index.fields[1], { fieldPath: "tarih", order: "DESCENDING" });
    return `${index.fields[0].fieldPath}:${index.fields[0].order}`;
  });

  assert.deepEqual(new Set(signatures), new Set([
    "gonderen:ASCENDING",
    "alan:ASCENDING",
    "gonderenUid:ASCENDING",
    "alanUid:ASCENDING"
  ]));
});

test("firebase yapılandırması composite index dosyasını kullanır", () => {
  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "firebase.json"), "utf8"));
  assert.equal(firebaseConfig.firestore.indexes, "firestore.indexes.json");
});
