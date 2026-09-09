function normalizeTurkishIban(value) {
    return String(value || "").replace(/\s+/g, "").toUpperCase();
}

function isValidTurkishIban(value) {
    const iban = normalizeTurkishIban(value);
    if (!/^TR\d{24}$/.test(iban)) return false;

    const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
    const numeric = rearranged.replace(/[A-Z]/g, (letter) =>
        String(letter.charCodeAt(0) - 55)
    );

    let remainder = 0;
    for (const digit of numeric) {
        remainder = (remainder * 10 + Number(digit)) % 97;
    }
    return remainder === 1;
}

function maskIban(value) {
    const iban = normalizeTurkishIban(value);
    if (!iban) return "";
    return `${iban.slice(0, 4)} **** **** **** **** **${iban.slice(-2)}`;
}

module.exports = { normalizeTurkishIban, isValidTurkishIban, maskIban };
