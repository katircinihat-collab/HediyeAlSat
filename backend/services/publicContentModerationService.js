const policy = require("../../shared/publicContentPolicy.json");

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?:\+?90|0)?\s*5\d{2}(?:[\s().-]*\d){7}\b/;

function hasPublicContactInfo(value) {
    const text = String(value || "");
    const normalized = text.toLocaleLowerCase("tr-TR");
    return EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text)
        || policy.keywords.some((keyword) => normalized.includes(keyword));
}

function validatePublicContent(value) {
    if (hasPublicContactInfo(value)) {
        const error = new Error(policy.message);
        error.status = 400;
        error.code = "PUBLIC_CONTACT_INFO_NOT_ALLOWED";
        throw error;
    }
    return String(value || "").trim();
}

module.exports = { hasPublicContactInfo, validatePublicContent, message: policy.message };
