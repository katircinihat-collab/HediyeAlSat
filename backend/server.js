const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


// =====================================================
// ROUTERLAR
// =====================================================

const paymentRoutes =
    require("./routes/paymentRoutes");

const withdrawRoutes =
    require("./routes/withdrawRoutes");

// WALLET
const walletRoutes =
    require("./routes/walletRoutes");

// BLOKAJ / WALLET RELEASE
const walletReleaseRoutes =
    require("./routes/walletReleaseRoutes");

// AI HEDİYE ASİSTANI
const aiRoutes =
    require("./routes/aiRoutes");

const adminRoutes =
    require("./routes/adminRoutes");

const digitalAssetRoutes =
    require("./routes/digitalAssetRoutes");


// =====================================================
// API ROUTELARI
// =====================================================

// -----------------------------------------------------
// ÖDEME
// /api/payment
// -----------------------------------------------------

app.use(
    "/api/payment",
    paymentRoutes
);


// -----------------------------------------------------
// PARA ÇEKME
// /api/withdraw
// -----------------------------------------------------

app.use(
    "/api/withdraw",
    withdrawRoutes
);


// -----------------------------------------------------
// WALLET
// /api/wallet
// -----------------------------------------------------

app.use(
    "/api/wallet",
    walletRoutes
);


// -----------------------------------------------------
// WALLET RELEASE
// /api/wallet-release
// -----------------------------------------------------

app.use(
    "/api/wallet-release",
    walletReleaseRoutes
);


// -----------------------------------------------------
// AI HEDİYE ASİSTANI
// /api/ai
// -----------------------------------------------------

app.use(
    "/api/ai",
    aiRoutes
);

app.use(
    "/api/admin",
    adminRoutes
);

app.use(
    "/api/digital-assets",
    digitalAssetRoutes
);


// =====================================================
// TEST / HEALTH
// =====================================================

app.get("/", (req, res) => {

    res.json({

        success: true,

        message:
            "🎁 HediyeAlSat Backend çalışıyor.",

        port:
            process.env.PORT || 5000

    });

});


// =====================================================
// 404
// =====================================================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        error:
            "API endpoint bulunamadı.",

        path:
            req.originalUrl

    });

});


// =====================================================
// GENEL HATA
// =====================================================

app.use((err, req, res, _next) => {

    console.error(
        "SERVER HATASI:",
        err
    );

    res.status(500).json({

        success: false,

        error:
            err.message ||
            "Sunucu hatası."

    });

});


// =====================================================
// SERVER
// =====================================================

const PORT =
    process.env.PORT || 5000;


app.listen(
    PORT,
    () => {

        console.log(
            "================================="
        );

        console.log(
            "🎁 HediyeAlSat Backend"
        );

        console.log(
            `🚀 Server çalışıyor: ${PORT}`
        );

        console.log(
            "💳 Payment API: /api/payment"
        );

        console.log(
            "🏦 Withdraw API: /api/withdraw"
        );

        console.log(
            "👛 Wallet API: /api/wallet"
        );

        console.log(
            "🔓 Wallet Release API: /api/wallet-release"
        );

        console.log(
            "🤖 AI API: /api/ai"
        );

        console.log(
            "================================="
        );

    }
);
