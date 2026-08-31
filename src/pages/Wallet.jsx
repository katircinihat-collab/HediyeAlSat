import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { apiUrl } from "../config/api";
import "../styles/pages/wallet.css";

function Wallet() {
    const [wallet, setWallet] = useState(null);
    const [miktar, setMiktar] = useState("");
    const [loading, setLoading] = useState(false);
    const [mesaj, setMesaj] = useState("");
    const [hata, setHata] = useState("");
    const [cekmeTalepleri, setCekmeTalepleri] = useState([]);

    // ==========================================
    // CÜZDANI GETİR
    // ==========================================

    async function walletGetir() {
        try {
            if (!auth.currentUser) {
                return;
            }

            const user = auth.currentUser;

            // Firebase giriş tokenını al
            const token = await user.getIdToken();

            // GEÇİCİ TEST:
            // Tarayıcı konsolunda token ve email görünecek.
            console.log("=================================");
            console.log("FIREBASE TOKEN:", token);
            console.log("GİRİŞ YAPAN EMAIL:", user.email);
            console.log("=================================");

            const response = await fetch(
                apiUrl(`/api/wallet/${encodeURIComponent(
                    user.email
                )}`),
                {
                    method: "GET",

                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error ||
                        data.message ||
                        "Cüzdan bilgileri alınamadı."
                );
            }

            setWallet(data.wallet);
        } catch (error) {
            console.error("Cüzdan getirme hatası:", error);

            setHata(
                error.message ||
                    "Cüzdan bilgileri alınamadı."
            );
        }
    }

    // ==========================================
    // PARA ÇEKME TALEPLERİ
    // ==========================================

    async function talepleriGetir() {
        try {
            if (!auth.currentUser) {
                return;
            }

            const user = auth.currentUser;

            const token = await user.getIdToken();

            const response = await fetch(
                apiUrl(`/api/wallet/withdraw/${encodeURIComponent(
                    user.email
                )}`),
                {
                    method: "GET",

                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                return;
            }

            setCekmeTalepleri(data.talepler || []);
        } catch (error) {
            console.error(
                "Çekme talepleri hatası:",
                error
            );
        }
    }

    // ==========================================
    // SAYFA AÇILINCA
    // ==========================================

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(
            async (user) => {
                if (!user) {
                    setWallet(null);
                    setCekmeTalepleri([]);
                    return;
                }

                console.log(
                    "Giriş yapan kullanıcı:",
                    user.email
                );

                try {
                    await walletGetir();
                    await talepleriGetir();
                } catch (error) {
                    console.error(
                        "Wallet başlangıç hatası:",
                        error
                    );
                }
            }
        );

        return () => unsubscribe();
    }, []);

    // ==========================================
    // PARA ÇEK
    // ==========================================

    async function paraCek() {
        setMesaj("");
        setHata("");

        const sayi = Number(miktar);

        if (
            !Number.isFinite(sayi) ||
            sayi <= 0
        ) {
            setHata(
                "Geçerli bir tutar giriniz."
            );
            return;
        }

        if (sayi < 50) {
            setHata(
                "Minimum para çekme tutarı 50 TL'dir."
            );
            return;
        }

        if (!auth.currentUser) {
            setHata(
                "Önce giriş yapmalısınız."
            );
            return;
        }

        const balance = Number(
            wallet?.balance || 0
        );

        if (sayi > balance) {
            setHata(
                `Kullanılabilir bakiyeniz ${balance.toFixed(
                    2
                )} TL.`
            );
            return;
        }

        if (!wallet?.iban) {
            setHata(
                "Para çekebilmek için önce IBAN bilgilerinizi kaydedin."
            );
            return;
        }

        setLoading(true);

        try {
            const user = auth.currentUser;

            // Firebase tokenını al
            const token = await user.getIdToken();

            console.log(
                "PARA ÇEKME TOKEN:",
                token
            );

            console.log(
                "PARA ÇEKEN EMAIL:",
                user.email
            );

            const response = await fetch(
                apiUrl("/api/withdraw"),
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        email: user.email,
                        tutar: sayi,
                    }),
                }
            );

            const data = await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.error ||
                        data.message ||
                        "Para çekme işlemi başarısız."
                );
            }

            setMesaj(
                "✅ Para çekme talebiniz oluşturuldu."
            );

            setMiktar("");

            await walletGetir();
            await talepleriGetir();
        } catch (error) {
            console.error(
                "Para çekme hatası:",
                error
            );

            setHata(
                error.message ||
                    "Bir hata oluştu."
            );
        } finally {
            setLoading(false);
        }
    }

    // ==========================================
    // TARİH
    // ==========================================

    function tarihFormatla(tarih) {
        if (!tarih) {
            return "-";
        }

        let date;

        if (tarih._seconds) {
            date = new Date(
                tarih._seconds * 1000
            );
        } else if (tarih.seconds) {
            date = new Date(
                tarih.seconds * 1000
            );
        } else {
            date = new Date(tarih);
        }

        if (isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleDateString(
            "tr-TR"
        );
    }

    // ==========================================
    // GİRİŞ YOK
    // ==========================================

    if (!auth.currentUser) {
        return (
            <div className="wallet-page">
                <h1>
                    💰 Satıcı Cüzdanım
                </h1>

                <p>
                    Cüzdanınızı görmek için
                    giriş yapmalısınız.
                </p>
            </div>
        );
    }

    // ==========================================
    // BAKİYELER
    // ==========================================

    const balance = Number(
        wallet?.balance || 0
    );

    const pending = Number(
        wallet?.pending || 0
    );

    const paid = Number(
        wallet?.paid || 0
    );

    const withdrawalPending = Number(
        wallet?.withdrawalPending || 0
    );

    // ==========================================
    // SAYFA
    // ==========================================

    return (
        <div className="wallet-page">
            <h1>
                💰 Satıcı Cüzdanım
            </h1>

            {/* ==================================
                BAKİYE KARTLARI
            ================================== */}

            <div className="wallet-summary">
                <div className="wallet-box">
                    <h3>
                        💰 Çekilebilir Bakiye
                    </h3>

                    <strong>
                        ₺
                        {balance.toLocaleString(
                            "tr-TR",
                            {
                                minimumFractionDigits: 2,
                            }
                        )}
                    </strong>

                    <p>
                        Banka hesabınıza
                        aktarabilirsiniz.
                    </p>
                </div>

                <div className="wallet-box">
                    <h3>
                        ⏳ Bekleyen Bakiye
                    </h3>

                    <strong>
                        ₺
                        {pending.toLocaleString(
                            "tr-TR",
                            {
                                minimumFractionDigits: 2,
                            }
                        )}
                    </strong>

                    <p>
                        Blokaj süresi dolunca
                        aktarılır.
                    </p>
                </div>

                <div className="wallet-box">
                    <h3>
                        🏦 İşlemde
                    </h3>

                    <strong>
                        ₺
                        {withdrawalPending.toLocaleString(
                            "tr-TR",
                            {
                                minimumFractionDigits: 2,
                            }
                        )}
                    </strong>

                    <p>
                        Para çekme
                        işlemleriniz.
                    </p>
                </div>

                <div className="wallet-box">
                    <h3>
                        ✅ Toplam Ödenen
                    </h3>

                    <strong>
                        ₺
                        {paid.toLocaleString(
                            "tr-TR",
                            {
                                minimumFractionDigits: 2,
                            }
                        )}
                    </strong>

                    <p>
                        Bugüne kadar ödenen
                        toplam.
                    </p>
                </div>
            </div>

            {/* ==================================
                BANKA BİLGİLERİ
            ================================== */}

            <div className="wallet-bank">
                <h2>
                    🏦 Banka Bilgileri
                </h2>

                <p>
                    <b>Banka:</b>{" "}
                    {wallet?.bankaAdi ||
                        "Banka kayıtlı değil"}
                </p>

                <p>
                    <b>Hesap Sahibi:</b>{" "}
                    {wallet?.hesapSahibi ||
                        "-"}
                </p>

                <p>
                    <b>IBAN:</b>{" "}
                    {wallet?.iban ||
                        "IBAN kayıtlı değil"}
                </p>
            </div>

            {/* ==================================
                PARA ÇEKME
            ================================== */}

            <div className="wallet-withdraw">
                <h2>
                    💸 Para Çek
                </h2>

                <p>
                    Kullanılabilir Bakiye:{" "}
                    <b>
                        ₺
                        {balance.toLocaleString(
                            "tr-TR",
                            {
                                minimumFractionDigits: 2,
                            }
                        )}
                    </b>
                </p>

                <div className="withdraw-form">
                    <input
                        type="number"
                        min="50"
                        step="0.01"
                        placeholder="Çekmek istediğiniz tutar"
                        value={miktar}
                        onChange={(e) =>
                            setMiktar(
                                e.target.value
                            )
                        }
                    />

                    <button
                        onClick={paraCek}
                        disabled={
                            loading ||
                            balance < 50 ||
                            !wallet?.iban
                        }
                    >
                        {loading
                            ? "⏳ İşleniyor..."
                            : "💸 Para Çek"}
                    </button>
                </div>

                <small>
                    Minimum çekim tutarı: ₺50
                </small>

                {mesaj && (
                    <div className="wallet-success">
                        {mesaj}
                    </div>
                )}

                {hata && (
                    <div className="wallet-error">
                        ❌ {hata}
                    </div>
                )}
            </div>

            {/* ==================================
                PARA ÇEKME GEÇMİŞİ
            ================================== */}

            <div className="wallet-history">
                <h2>
                    📋 Para Çekme Geçmişi
                </h2>

                {cekmeTalepleri.length ===
                0 ? (
                    <p>
                        Henüz para çekme
                        talebiniz bulunmuyor.
                    </p>
                ) : (
                    cekmeTalepleri.map(
                        (talep) => (
                            <div
                                className="wallet-item"
                                key={talep.id}
                            >
                                <div>
                                    <strong>
                                        ₺
                                        {Number(
                                            talep.tutar ||
                                                0
                                        ).toLocaleString(
                                            "tr-TR",
                                            {
                                                minimumFractionDigits: 2,
                                            }
                                        )}
                                    </strong>

                                    <div>
                                        {talep.iban ||
                                            "-"}
                                    </div>
                                </div>

                                <div>
                                    <span
                                        className={
                                            talep.durum ===
                                            "ODENDI"
                                                ? "ready"
                                                : talep.durum ===
                                                  "REDDEDILDI"
                                                ? "danger"
                                                : "waiting"
                                        }
                                    >
                                        {talep.durum ===
                                        "ODENDI"
                                            ? "Ödendi"
                                            : talep.durum ===
                                              "REDDEDILDI"
                                            ? "Reddedildi"
                                            : "Bekliyor"}
                                    </span>

                                    <div>
                                        {tarihFormatla(
                                            talep.tarih
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    )
                )}
            </div>
        </div>
    );
}

export default Wallet;
