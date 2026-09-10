// Platformun kendi envanteri için kullanılan hesaplar açık ve server-side tutulur.
// PLATFORM_SELLER_UIDS ek platform hesaplarını virgülle ayrılmış biçimde ekleyebilir.
const CANONICAL_PLATFORM_SELLER_UIDS = Object.freeze([
    "VyMaxebniicENgXpDYYhoAUAew63"
]);

function getPlatformSellerUids(environment = process.env) {
    const configured = String(environment.PLATFORM_SELLER_UIDS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    return new Set([...CANONICAL_PLATFORM_SELLER_UIDS, ...configured]);
}

module.exports = { CANONICAL_PLATFORM_SELLER_UIDS, getPlatformSellerUids };
