const TYPES = new Set(["info", "warning", "maintenance", "payment", "order"]);

function text(value, field, max, fallback = "") {
    const result = String(value ?? fallback).trim();
    if (result.length > max) throw Object.assign(new Error(`${field} çok uzun.`), { status: 400, code: "INVALID_SYSTEM_STATUS" });
    return result;
}

function validateSystemStatus(input = {}) {
    const announcement = input.announcement || {};
    const maintenance = input.maintenance || {};
    const result = {
        announcement: {
            enabled: announcement.enabled === true,
            message: text(announcement.message, "Duyuru metni", 500),
            type: TYPES.has(announcement.type) ? announcement.type : "info",
            dismissible: announcement.dismissible !== false
        },
        maintenance: {
            enabled: maintenance.enabled === true,
            title: text(maintenance.title, "Bakım başlığı", 120, "Kısa Bir Bakımdayız"),
            message: text(maintenance.message, "Bakım açıklaması", 1000, "Sana daha iyi bir HediyeAlSat deneyimi hazırlıyoruz. Kısa süre sonra tekrar buradayız.")
        }
    };
    if (result.announcement.enabled && !result.announcement.message) throw Object.assign(new Error("Aktif duyuru için metin zorunludur."), { status: 400, code: "ANNOUNCEMENT_MESSAGE_REQUIRED" });
    if (result.maintenance.enabled && (!result.maintenance.title || !result.maintenance.message)) throw Object.assign(new Error("Aktif bakım modu için başlık ve açıklama zorunludur."), { status: 400, code: "MAINTENANCE_CONTENT_REQUIRED" });
    return result;
}

async function updateSystemStatus({ firestore, FieldValue, input }) {
    const settings = validateSystemStatus(input);
    await firestore.collection("systemSettings").doc("public").set({ ...settings, updatedAt: FieldValue.serverTimestamp() }, { merge: false });
    return settings;
}

module.exports = { validateSystemStatus, updateSystemStatus };
