function normalizeIyzicoGsmNumber(value) {
    const digits = String(value || "").replace(/\D/g, "");

    if (/^05\d{9}$/.test(digits)) return `+9${digits}`;
    if (/^5\d{9}$/.test(digits)) return `+90${digits}`;
    if (/^905\d{9}$/.test(digits)) return `+${digits}`;

    return null;
}

module.exports = { normalizeIyzicoGsmNumber };
