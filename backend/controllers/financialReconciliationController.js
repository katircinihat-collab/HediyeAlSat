const { firestore } = require("../config/firebase");
const {
    FinancialReconciliationError, listFinancialReconciliations,
    getFinancialReconciliation, updateFinancialReconciliation
} = require("../services/financialReconciliationService");

function fail(res, error) {
    return res.status(error.status || 500).json({
        success: false,
        code: error.code || "FINANCIAL_RECONCILIATION_FAILED",
        message: error instanceof FinancialReconciliationError ? error.message : "Finansal inceleme işlemi tamamlanamadı."
    });
}

exports.list = async (req, res) => {
    try { return res.json({ success: true, reconciliations: await listFinancialReconciliations({ firestore, filters: req.query }) }); }
    catch (error) { return fail(res, error); }
};

exports.get = async (req, res) => {
    try { return res.json({ success: true, reconciliation: await getFinancialReconciliation({ firestore, id: req.params.id }) }); }
    catch (error) { return fail(res, error); }
};

exports.update = async (req, res) => {
    try {
        return res.json({ success: true, ...(await updateFinancialReconciliation({
            firestore, id: req.params.id, body: req.body, admin: req.user
        })) });
    } catch (error) { return fail(res, error); }
};
