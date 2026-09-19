const { firestore, FieldValue } = require("../config/firebase");
const { recordAdminAction } = require("../services/adminAuditService");
const { updateSystemStatus } = require("../services/systemStatusService");

exports.update = async (req, res) => {
    try {
        const settings = await updateSystemStatus({ firestore, FieldValue, input: req.body });
        await recordAdminAction({ adminUser: req.user, action: "SYSTEM_STATUS_UPDATED", targetType: "systemSettings", targetId: "public", details: { announcementEnabled: settings.announcement.enabled, announcementType: settings.announcement.type, maintenanceEnabled: settings.maintenance.enabled } });
        return res.json({ success: true, settings });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, code: error.code || "SYSTEM_STATUS_UPDATE_FAILED", message: error.status ? error.message : "Sistem durumu kaydedilemedi." });
    }
};
