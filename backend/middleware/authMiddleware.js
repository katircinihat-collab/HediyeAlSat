const admin = require("../config/firebase").admin;

/*
==================================================
FIREBASE TOKEN DOĞRULAMA
==================================================
*/

async function authMiddleware(req, res, next) {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {

            return res.status(401).json({

                success: false,

                message: "Token bulunamadı."

            });

        }

        const token = authHeader.replace("Bearer ", "");

        const decodedToken =
            await admin.auth().verifyIdToken(token);

        req.user = decodedToken;

        next();

    } catch (err) {

        console.log(err);

        return res.status(401).json({

            success: false,

            message: "Geçersiz Token."

        });

    }

}

module.exports = authMiddleware;