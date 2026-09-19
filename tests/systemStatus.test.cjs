const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { validateSystemStatus, updateSystemStatus } = require("../backend/services/systemStatusService");

test("ilk kurulum ve eksik değerler bakım modunu varsayılan olarak açmaz", () => {
  const value = validateSystemStatus({});
  assert.equal(value.announcement.enabled, false);
  assert.equal(value.maintenance.enabled, false);
  assert.equal(value.maintenance.title, "Kısa Bir Bakımdayız");
});

test("aktif duyuru metinsiz kaydedilemez ve yalnız izinli türler kullanılır", () => {
  assert.throws(() => validateSystemStatus({ announcement: { enabled: true, message: "" } }), /metin zorunludur/);
  assert.equal(validateSystemStatus({ announcement: { type: "spoofed" } }).announcement.type, "info");
});

test("admin güncellemesi tek merkezi public belgeyi server timestamp ile yazar", async () => {
  let write = null;
  const firestore = { collection: (name) => ({ doc: (id) => ({ set: async (data, options) => { write = { name, id, data, options }; } }) }) };
  const FieldValue = { serverTimestamp: () => "SERVER_TIME" };
  const result = await updateSystemStatus({ firestore, FieldValue, input: { announcement: { enabled: true, message: "Planlı bilgilendirme", type: "info", dismissible: true }, maintenance: { enabled: false, title: "Kısa Bir Bakımdayız", message: "Yakında buradayız." } } });
  assert.equal(result.maintenance.enabled, false);
  assert.deepEqual({ name: write.name, id: write.id, timestamp: write.data.updatedAt }, { name: "systemSettings", id: "public", timestamp: "SERVER_TIME" });
});

test("sistem durumu endpointi mevcut auth ve admin middleware zinciri arkasındadır", () => {
  const routes = fs.readFileSync("backend/routes/adminRoutes.js", "utf8");
  const controller = fs.readFileSync("backend/controllers/systemStatusController.js", "utf8");
  assert.match(routes, /router\.use\(authMiddleware, adminMiddleware\)/);
  assert.match(routes, /router\.put\("\/system-status", systemStatusController\.update\)/);
  assert.match(controller, /SYSTEM_STATUS_UPDATED/);
});

test("bakım gate admin ve login erişimini korur, normal kullanıcıyı bakım ekranına alır", () => {
  const layer = fs.readFileSync("src/components/SystemStatusLayer.jsx", "utf8");
  assert.match(layer, /pathname === "\/login" \|\| pathname\.startsWith\("\/admin"\)/);
  assert.match(layer, /!managementRoute && status\.maintenance\.enabled/);
  assert.match(layer, /<MaintenanceScreen/);
});

test("duyuru, fail-open listener ve responsive bakım yapısı mevcuttur", () => {
  const context = fs.readFileSync("src/context/SystemStatusProvider.jsx", "utf8");
  const layer = fs.readFileSync("src/components/SystemStatusLayer.jsx", "utf8");
  const css = fs.readFileSync("src/styles/components/system-status.css", "utf8");
  assert.match(context, /onSnapshot\(doc\(db, "systemSettings", "public"\)/);
  assert.match(context, /DEFAULT_SYSTEM_STATUS, loading: false, error: true/);
  assert.match(layer, /announcement\.enabled/);
  assert.match(layer, /announcement\.dismissible/);
  assert.match(css, /100dvh/);
  assert.match(css, /@media \(max-width:480px\)/);
});
