const test = require("node:test");
const assert = require("node:assert/strict");
const { hasPublicContactInfo, validatePublicContent } = require("../backend/services/publicContentModerationService");
const { runPublicPrivacyMigration } = require("../backend/services/publicPrivacyMigrationService");

function fakeFirestore(seed) {
    const writes = [];
    return {
        writes,
        collection(name) {
            return {
                async get() { return { docs: (seed[name] || []).map((data) => ({ id: data.id, data: () => data })) }; },
                doc(id) { return { async update(update) { writes.push({ collection: name, id, update }); } }; }
            };
        }
    };
}

test("public içerik iletişim bilgisini reddeder normal açıklamayı kabul eder", () => {
    assert.equal(hasPublicContactInfo("El yapımı seramik kupa"), false);
    assert.equal(validatePublicContent("El yapımı seramik kupa"), "El yapımı seramik kupa");
    assert.equal(hasPublicContactInfo("Bana test@example.com adresinden yazın"), true);
    assert.equal(hasPublicContactInfo("WhatsApp 0532 111 22 33"), true);
    assert.throws(() => validatePublicContent("instagram: hediyem"), /Güvenliğiniz/);
});

test("migration dry-run değişiklikleri sayar ve yazma yapmaz", async () => {
    const firestore = fakeFirestore({ ilanlar: [{ id: "i1", sahip: "owner@example.com" }], yorumlar: [{ id: "y1", kullanici: "unknown@example.com" }] });
    const result = await runPublicPrivacyMigration({ firestore, FieldValue: { delete: () => "DELETE" }, dryRun: true, resolveUidByEmail: async (email) => email === "owner@example.com" ? "owner-uid" : null });
    assert.equal(result.changeCount, 2);
    assert.equal(result.unresolvedCount, 1);
    assert.equal(result.appliedCount, 0);
    assert.deepEqual(firestore.writes, []);
});

test("migration çözülen UID'yi yazar ve public email alanını kaldırır", async () => {
    const firestore = fakeFirestore({ magazalar: [{ id: "m1", sahip: "owner@example.com" }] });
    const result = await runPublicPrivacyMigration({ firestore, FieldValue: { delete: () => "DELETE" }, dryRun: false, resolveUidByEmail: async () => "owner-uid" });
    assert.equal(result.appliedCount, 1);
    assert.deepEqual(firestore.writes[0], { collection: "magazalar", id: "m1", update: { sahip: "DELETE", sahipUid: "owner-uid" } });
});

test("migration çözülemeyen kaydı yanlış UID'ye bağlamaz", async () => {
    const firestore = fakeFirestore({ magazaYorumlari: [{ id: "y1", kullanici: "unknown@example.com" }] });
    await runPublicPrivacyMigration({ firestore, FieldValue: { delete: () => "DELETE" }, dryRun: false, resolveUidByEmail: async () => null });
    assert.deepEqual(firestore.writes[0].update, { kullanici: "DELETE" });
});
