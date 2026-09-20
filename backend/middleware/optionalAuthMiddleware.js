const { admin } = require("../config/firebase");

module.exports = async function optionalAuthMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return next();
  try {
    req.user = await admin.auth().verifyIdToken(header.replace(/^Bearer\s+/i, ""));
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Geçersiz Token." });
  }
};
