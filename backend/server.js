const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.set("trust proxy", 1);


// =====================================================
// MIDDLEWARE
// =====================================================

const allowedOrigins = new Set(
    [process.env.FRONTEND_URL, ...(process.env.CORS_ORIGINS || "").split(",")]
        .map((value) => String(value || "").trim().replace(/\/$/, ""))
        .filter(Boolean)
);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin.replace(/\/$/, "")) || (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) {
            return callback(null, true);
        }
        return callback(new Error("CORS origin reddedildi."));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

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

const designVoteRoutes =
    require("./routes/designVoteRoutes");

const giftBattleRoutes =
    require("./routes/giftBattleRoutes");
const orderStatusRoutes =
    require("./routes/orderStatusRoutes");
const orderClaimRoutes =
    require("./routes/orderClaimRoutes");
const maintenanceRoutes =
    require("./routes/maintenanceRoutes");
const buyerIdentityRoutes =
    require("./routes/buyerIdentityRoutes");
const { startWalletReleaseJob } =
    require("./jobs/walletReleaseJob");


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

app.use(
    "/api/buyer-identity",
    buyerIdentityRoutes
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

app.use(
    "/api/design-votes",
    designVoteRoutes
);

app.use(
    "/api/gift-battle",
    giftBattleRoutes
);

app.use(
    "/api/orders",
    orderStatusRoutes
);
app.use(
    "/api/order-claims",
    orderClaimRoutes
);
app.use(
    "/api/internal/maintenance",
    maintenanceRoutes
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

        error: "Sunucu hatası."

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

        startWalletReleaseJob();

    }
);
