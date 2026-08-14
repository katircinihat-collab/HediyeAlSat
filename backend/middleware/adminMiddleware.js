const { firestore } = require("../config/firebase");

/*
==================================================
ADMİN YETKİ KONTROLÜ
==================================================
*/

async function adminMiddleware(req, res, next) {

    try {

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message: "Yetkisiz erişim."

            });

        }

        const email = req.user.email;

        const adminRef = firestore
            .collection("admins")
            .doc(email);

        const adminDoc = await adminRef.get();

        if (!adminDoc.exists) {

            return res.status(403).json({

                success: false,

                message: "Admin yetkiniz bulunmuyor."

            });

        }

        const adminData = adminDoc.data();

        if (adminData.aktif === false) {

            return res.status(403).json({

                success: false,

                message: "Admin hesabı pasif."

            });

        }

        req.admin = adminData;

        next();

    } catch (err) {

        console.log(err);

        return res.status(500).json({

            success: false,

            message: "Admin doğrulama hatası.",

            error: err.message

        });

    }

}

module.exports = adminMiddleware;