const buckets = new Map();

function createRateLimit({ windowMs, max, message }) {
    return (req, res, next) => {
        const now = Date.now();
        const identity = req.user?.uid || req.ip || "unknown";
        const key = `${req.baseUrl}:${identity}`;
        const current = buckets.get(key);
        if (!current || current.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        current.count += 1;
        if (current.count > max) {
            res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
            return res.status(429).json({ success: false, message });
        }
        return next();
    };
}

const financialRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: "Çok fazla finansal işlem isteği gönderildi. Lütfen daha sonra tekrar deneyin."
});

const downloadRateLimit = createRateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: "Çok fazla indirme isteği gönderildi. Lütfen kısa süre sonra tekrar deneyin."
});

module.exports = { createRateLimit, financialRateLimit, downloadRateLimit };
