const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { taskId, collectOperationalIssues, TASK_STATUS } = require("../backend/services/adminAutonomyService");

function doc(id, data) { return { id, data: () => data, get: (key) => data[key] }; }
function snapshot(rows) { return { size: rows.length, docs: rows, forEach: (callback) => rows.forEach(callback) }; }
function fakeFirestore(data) {
  return { collection(name) { return {
    limit() { return this; }, orderBy() { return this; },
    async get() { return snapshot(data[name] || []); }
  }; } };
}

test("operasyon görev kimliği aynı kaynak ve neden için deterministiktir", () => {
  assert.equal(taskId("payment:p1", "WAITING_PAYMENT"), taskId("payment:p1", "WAITING_PAYMENT"));
  assert.notEqual(taskId("payment:p1", "WAITING_PAYMENT"), taskId("payment:p2", "WAITING_PAYMENT"));
});

test("yalnız gerçek insan müdahalesi gereken kayıtlar aktif görev olur", async () => {
  const result = await collectOperationalIssues({ firestore: fakeFirestore({
    odemeler: [doc("p1", { paymentStatus: "WAITING", createdAt: new Date("2020-01-01") }), doc("p2", { paymentStatus: "SUCCESS" })],
    orderClaims: [doc("c1", { durum: "inceleniyor", orderId: "o1" }), doc("c2", { durum: "cozuldu" })],
    financialReconciliations: [doc("r1", { status: "incelemede", reasonCode: "AMOUNT" }), doc("r2", { status: "manuel_cozuldu" })],
    siparisler: [doc("o1", { odemeDurumu: true, paymentId: "pay", durum: "Hazırlanıyor" })]
  }) });
  assert.deepEqual(result.issues.map((item) => item.sourceKey).sort(), ["claim:c1", "payment:p1", "reconciliation:r1"]);
  assert.equal(result.issues.some((item) => item.sourceKey === "order:o1"), false);
});

test("çözülmüş görevler silinmeden RESOLVED ve ARCHIVED durumlarında tutulur", () => {
  assert.deepEqual(TASK_STATUS, { ACTIVE: "ACTIVE", RESOLVED: "RESOLVED", ARCHIVED: "ARCHIVED" });
  const service = fs.readFileSync("backend/services/adminAutonomyService.js", "utf8");
  assert.match(service, /status: TASK_STATUS\.RESOLVED/);
  assert.match(service, /status: TASK_STATUS\.ARCHIVED/);
  assert.doesNotMatch(service, /\.delete\(/);
});

test("bakım görevi 48 saat release ve operasyon senkronizasyonunu aynı runnerda çağırır", () => {
  const source = fs.readFileSync("backend/services/maintenanceService.js", "utf8");
  assert.match(source, /releaseWallets/);
  assert.match(source, /syncAdminTasks/);
  assert.match(source, /recordHealth/);
});

test("operasyon ve bakım kayıtları client erişimine kapalıdır", () => {
  const rules = fs.readFileSync("firestore.rules", "utf8");
  assert.match(rules, /match \/adminOperationTasks\/\{taskId\}[\s\S]*allow read, create, update, delete: if false/);
  assert.match(rules, /match \/systemMaintenance\/\{documentId\}[\s\S]*allow read, create, update, delete: if false/);
});
