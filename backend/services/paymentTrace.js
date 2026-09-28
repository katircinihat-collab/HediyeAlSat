const { AsyncLocalStorage } = require("node:async_hooks");
const { createHash, randomUUID } = require("node:crypto");
const context = new AsyncLocalStorage();
const id = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(value) ? value : undefined;
const fingerprint = (value) => typeof value === "string" && value ? createHash("sha256").update(value).digest("hex").slice(0, 12) : undefined;
const secretValues = () => [process.env.IYZIPAY_API_KEY, process.env.IYZIPAY_SECRET_KEY].filter(Boolean);
const identifierKeys = new Set(["traceId", "requestId", "previousTraceId", "conversationId", "basketId", "paymentId", "reservationId", "orderId", "commit"]);
const codeKeys = new Set(["stage", "failedStage", "status", "paymentStatus", "errorCode", "errorGroup", "errorName", "method", "reservationStatus", "reason"]);
const numberKeys = new Set(["amount", "itemCount", "itemTransactionsCount", "systemTime", "httpStatus", "durationMs", "attempt", "maxAttempts", "fraudStatus"]);
const boolKeys = new Set(["mdStatusPresent", "tokenPresent", "paymentVerified", "alreadyFinalized", "redirectAvailable", "messagePresent"]);

function safeUrl(value) {
    try { const url = new URL(value); return `${url.origin}${url.pathname}`; } catch { return undefined; }
}

function sanitize(fields = {}) {
    const out = {};
    for (const [key, value] of Object.entries(fields)) {
        if (typeof value === "string" && secretValues().some((secret) => value.includes(secret))) continue;
        if (identifierKeys.has(key)) { const clean = id(String(value ?? "")); if (clean) out[key] = clean; }
        else if (codeKeys.has(key) && typeof value === "string" && /^[A-Za-z0-9_.-]{1,80}$/.test(value)) out[key] = value;
        else if (numberKeys.has(key) && (typeof value === "number" || typeof value === "string") && value !== "" && Number.isFinite(Number(value))) out[key] = Number(value);
        else if (boolKeys.has(key) && typeof value === "boolean") out[key] = value;
        else if (key === "currency" && ["TRY", "USD", "EUR", "GBP"].includes(value)) out[key] = value;
        else if (key === "mdStatus" && /^[0-9]{1,2}$/.test(String(value))) out[key] = String(value);
        else if (key === "tokenFingerprint" && /^[a-f0-9]{12}$/.test(value)) out[key] = value;
        else if (key === "callbackUrl") { const clean = safeUrl(value); if (clean && !/@/.test(clean)) out[key] = clean; }
        else if (key === "contentType" && ["application/json", "application/x-www-form-urlencoded", "multipart/form-data", "text/plain"].includes(value)) out[key] = value;
        else if (key === "path" && ["/api/payment", "/api/payment/callback"].includes(value)) out[key] = value;
        // Never echo provider/exception free text; it may embed credentials, card data or PII.
        else if (key === "errorMessage" && value) out[key] = "Message withheld; consult errorCode with provider.";
    }
    return out;
}

function trace(stage, fields = {}) {
    try {
        const state = context.getStore() || {};
        console.info("[PAYMENT_TRACE] " + JSON.stringify({ timestamp: new Date().toISOString(), environment: process.env.NODE_ENV === "production" ? "production" : "non-production", ...sanitize({ ...state, ...fields, stage }) }));
    } catch { /* Logging must never affect payment behavior. */ }
}

function bindConversation(conversationId) {
    const clean = id(conversationId);
    if (!clean) return;
    const state = context.getStore();
    if (state) { const previousTraceId = state.traceId; state.traceId = clean; state.conversationId = clean; trace("TRACE_CORRELATION", { previousTraceId }); }
}

function providerFields(result = {}) {
    return sanitize({ status: result?.status, paymentStatus: result?.paymentStatus, paymentId: result?.paymentId,
        conversationId: result?.conversationId, errorCode: result?.errorCode, errorGroup: result?.errorGroup,
        errorMessage: result?.errorMessage, messagePresent: Boolean(result?.errorMessage), systemTime: result?.systemTime,
        mdStatusPresent: result?.mdStatus !== undefined, mdStatus: result?.mdStatus, fraudStatus: result?.fraudStatus,
        tokenFingerprint: fingerprint(result?.token), itemTransactionsCount: Array.isArray(result?.itemTransactions) ? result.itemTransactions.length : undefined });
}

function failure(failedStage, error) {
    trace("PAYMENT_FAILURE", { failedStage, errorName: error?.name, errorCode: error?.code, errorMessage: error?.message,
        reason: error?.message === "CORS origin reddedildi." ? "CORS_REJECTED" : ["entity.parse.failed", "entity.too.large", "encoding.unsupported"].includes(error?.type) ? error.type : undefined });
}

function ingress(req, res, next) {
    const path = req.path?.replace(/\/$/, "");
    if (!["/api/payment", "/api/payment/callback"].includes(path)) return next();
    const requestId = randomUUID();
    return context.run({ requestId, traceId: requestId }, () => {
        req.paymentTrace = true;
        const started = Date.now();
        trace(path.endsWith("/callback") ? "CALLBACK_REQUEST_RECEIVED" : "PAYMENT_REQUEST_RECEIVED", { method: req.method, path, contentType: req.headers["content-type"]?.split(";")[0] });
        res.once("finish", () => trace("HTTP_RESPONSE_FINISHED", { httpStatus: res.statusCode, durationMs: Date.now() - started }));
        res.once("close", () => { if (!res.writableFinished) trace("HTTP_CONNECTION_CLOSED", { durationMs: Date.now() - started }); });
        next();
    });
}

function callbackParsed(body) {
    // Incoming callback identifiers are untrusted. Correlate with the provider's retrieve response instead.
    trace("CALLBACK_PARSE_RESULT", { tokenPresent: Boolean(body?.token), tokenFingerprint: fingerprint(body?.token),
        mdStatusPresent: body?.mdStatus !== undefined, mdStatus: body?.mdStatus,
        status: ["success", "failure", "SUCCESS", "FAILURE"].includes(body?.status) ? body.status : undefined });
}

module.exports = { trace, sanitize, fingerprint, providerFields, failure, ingress, callbackParsed, bindConversation, context };
