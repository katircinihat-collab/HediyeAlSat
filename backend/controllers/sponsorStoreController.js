const { firestore, FieldValue } = require("../config/firebase");
const service = require("../services/sponsorStoreService");

function fail(res, error) {
    return res.status(error.status || 500).json({ success: false, code: error.code || "SPONSOR_STORE_ERROR", message: error.status ? error.message : "İşlem tamamlanamadı." });
}

exports.create = async (req, res) => {
    try { return res.status(201).json({ success: true, application: await service.createApplication({ firestore, FieldValue, user: req.user, input: req.body || {} }) }); }
    catch (error) { return fail(res, error); }
};
exports.mine = async (req, res) => {
    try { return res.json({ success: true, applications: await service.listOwnApplications({ firestore, user: req.user }) }); }
    catch (error) { return fail(res, error); }
};
exports.adminList = async (_req, res) => {
    try { return res.json({ success: true, applications: await service.listApplications({ firestore }) }); }
    catch (error) { return fail(res, error); }
};
exports.approve = async (req, res) => {
    try { return res.json({ success: true, result: await service.approveApplication({ firestore, FieldValue, applicationId: req.params.id, packageId: req.body?.packageId, adminUser: req.user }) }); }
    catch (error) { return fail(res, error); }
};
exports.reject = async (req, res) => {
    try { return res.json({ success: true, result: await service.rejectApplication({ firestore, FieldValue, applicationId: req.params.id, adminUser: req.user }) }); }
    catch (error) { return fail(res, error); }
};
