import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { apiUrl } from "../config/api";

function AdminWithdraw() {
    const [talepler, setTalepler] = useState([]);
    const [loading, setLoading] = useState(true);
    const [islemLoading, setIslemLoading] = useState(false);
    const [mesaj, setMesaj] = useState("");
    const [hata, setHata] = useState("");
    const [aciklama, setAciklama] = useState({});

    /*
    ==================================================
    TOKEN AL
    ==================================================
    */

    async function tokenGetir() {
        const user = auth.currentUser;

        if (!user) {
            throw new Error("Admin girişi yapılmamış.");
        }

        return await user.getIdToken();
    }

    /*
    ==================================================
    TARİH ÇEVİR
    ==================================================
    */

    function tarihCevir(tarih) {
        if (!tarih) return null;

        try {
            if (tarih._seconds) {
                return new Date(
                    tarih._seconds * 1000
                );
            }

            if (
                typeof tarih === "object" &&
                typeof tarih.seconds === "number"
            ) {
                return new Date(
                    tarih.seconds * 1000
                );
            }

            const date = new Date(tarih);

            if (isNaN(date.getTime())) {
                return null;
            }

            return date;
        } catch {
            return null;
        }
    }

    /*
    ==================================================
    PARA FORMAT
    ==================================================
    */

    function paraFormatla(tutar) {
        return Number(tutar || 0).toLocaleString(
            "tr-TR",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
    }

    /*
    ==================================================
    TARİH FORMAT
    ==================================================
    */

    function tarihFormatla(tarih) {
        const date = tarihCevir(tarih);

        if (!date) {
            return "-";
        }

        return date.toLocaleString(
            "tr-TR"
        );
    }

    /*
    ==================================================
    TALEPLERİ GETİR
    ==================================================
    */

    async function talepleriGetir() {
        setLoading(true);
        setHata("");

        try {
            const token =
                await tokenGetir();

            const response =
                await fetch(
                    apiUrl("/api/withdraw/admin"),
                    {
                        method: "GET",

                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        }
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Para çekme talepleri alınamadı."
                );
            }

            setTalepler(
                data.talepler || []
            );
        } catch (error) {
            console.error(
                "Admin withdraw listesi:",
                error
            );

            setHata(
                error.message
            );
        } finally {
            setLoading(false);
        }
    }

    /*
    ==================================================
    SAYFA AÇILINCA
    ==================================================
    */

        useEffect(() => {
        const kontrol = setTimeout(() => {
            talepleriGetir();
        }, 100);

        return () =>
            clearTimeout(kontrol);
    // Initial load only; `talepleriGetir` is intentionally not reactive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /*
    ==================================================
    İPTAL / BLOKE ET
    ==================================================
    */

    async function iptalEt(talepId) {
        if (!talepId) {
            setHata(
                "Talep ID bulunamadı."
            );

            return;
        }

        const aciklamaMetni =
            (aciklama[talepId] || "").trim();

        if (aciklamaMetni.length < 3) {
            setHata("İptal / bloke gerekçesi zorunludur.");
            return;
        }

        const onay =
            window.confirm(
                "Bu para çekme talebini iptal edip ayrılan tutarı satıcının çekilebilir bakiyesine iade etmek istediğinize emin misiniz?"
            );

        if (!onay) {
            return;
        }

        setIslemLoading(true);
        setMesaj("");
        setHata("");

        try {
            const token =
                await tokenGetir();

            const response =
                await fetch(
                    apiUrl(`/api/withdraw/cancel/${talepId}`),
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`
                        },

                        body:
                            JSON.stringify({
                                neden:
                                    aciklamaMetni
                            })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "İptal işlemi başarısız."
                );
            }

            setMesaj(
                "✅ Para çekme talebi iptal edildi. Ayrılan tutar satıcının çekilebilir bakiyesine iade edildi."
            );

            setAciklama(
                (eski) => {
                    const yeni = {
                        ...eski
                    };

                    delete yeni[talepId];

                    return yeni;
                }
            );

            await talepleriGetir();
        } catch (error) {
            console.error(
                "İptal işlemi:",
                error
            );

            setHata(
                "❌ " +
                error.message
            );
        } finally {
            setIslemLoading(false);
        }
    }

    /*
    ==================================================
    AÇIKLAMA DEĞİŞTİR
    ==================================================
    */

    function aciklamaDegistir(
        talepId,
        value
    ) {
        setAciklama(
            (eski) => ({
                ...eski,
                [talepId]: value
            })
        );
    }

    /*
    ==================================================
    TALEP DURUMU
    ==================================================
    */

    function durumRengi(durum) {
        switch (
            String(durum || "")
                .toLowerCase()
        ) {
            case "bekliyor":
                return "#d97706";

            case "işlemde":
            case "processing":
                return "#2563eb";

            case "ödendi":
                return "#16803c";

            case "reddedildi":
            case "iptal_edildi":
                return "#dc2626";

            default:
                return "#666";
        }
    }

    /*
    ==================================================
    RENDER
    ==================================================
    */

    return (
        <div
            style={{
                maxWidth: "1200px",
                margin: "0 auto",
                padding: "30px 20px"
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent:
                        "space-between",
                    alignItems: "center",
                    marginBottom: "25px"
                }}
            >
                <div>
                    <h1
                        style={{
                            margin: 0
                        }}
                    >
                        💸 Para Çekme Talepleri
                    </h1>

                    <p
                        style={{
                            color: "#666",
                            marginTop: "8px"
                        }}
                    >
                        Talepler otomatik işleme alınır. Yalnız riskli bir talebi gerekçeyle iptal edebilir veya bloke edebilirsiniz.
                    </p>
                </div>

                <button
                    onClick={
                        talepleriGetir
                    }
                    disabled={loading}
                    style={{
                        padding:
                            "10px 18px",
                        border: "none",
                        borderRadius:
                            "8px",
                        cursor:
                            "pointer",
                        background:
                            "#2563eb",
                        color: "#fff",
                        fontWeight:
                            "600"
                    }}
                >
                    🔄 Yenile
                </button>
            </div>

            {mesaj && (
                <div
                    style={{
                        padding: "14px",
                        marginBottom:
                            "15px",
                        borderRadius:
                            "8px",
                        background:
                            "#dcfce7",
                        color:
                            "#166534"
                    }}
                >
                    {mesaj}
                </div>
            )}

            {hata && (
                <div
                    style={{
                        padding: "14px",
                        marginBottom:
                            "15px",
                        borderRadius:
                            "8px",
                        background:
                            "#fee2e2",
                        color:
                            "#991b1b"
                    }}
                >
                    {hata}
                </div>
            )}

            {loading ? (
                <div
                    style={{
                        padding: "50px",
                        textAlign:
                            "center"
                    }}
                >
                    ⏳ Talepler yükleniyor...
                </div>
            ) : talepler.length === 0 ? (
                <div
                    style={{
                        padding: "50px",
                        textAlign:
                            "center",
                        background:
                            "#f8fafc",
                        borderRadius:
                            "12px"
                    }}
                >
                    <div
                        style={{
                            fontSize:
                                "40px"
                        }}
                    >
                        📭
                    </div>

                    <h3>
                        Bekleyen para çekme
                        talebi yok
                    </h3>

                    <p
                        style={{
                            color: "#666"
                        }}
                    >
                        Şu anda işlem
                        bekleyen talep
                        bulunmuyor.
                    </p>
                </div>
            ) : (
                <div
                    style={{
                        display: "grid",
                        gap: "20px"
                    }}
                >
                    {talepler.map(
                        (talep, index) => {
                            const talepId =
                                talep.id ||
                                talep.talepId ||
                                `talep-${index}`;

                            const miktar =
                                Number(
                                    talep.miktar ||
                                    talep.tutar ||
                                    0
                                );

                            const durum =
                                talep.durum ||
                                "Bekliyor";
                            const islemde = ["BEKLIYOR", "Bekliyor", "PROCESSING"].includes(durum);

                            return (
                                <div
                                    key={
                                        talepId
                                    }
                                    style={{
                                        background:
                                            "#fff",
                                        border:
                                            "1px solid #e5e7eb",
                                        borderRadius:
                                            "14px",
                                        padding:
                                            "22px",
                                        boxShadow:
                                            "0 3px 12px rgba(0,0,0,0.06)"
                                    }}
                                >
                                    <div
                                        style={{
                                            display:
                                                "flex",
                                            justifyContent:
                                                "space-between",
                                            alignItems:
                                                "flex-start",
                                            gap:
                                                "15px"
                                        }}
                                    >
                                        <div>
                                            <h3
                                                style={{
                                                    marginTop:
                                                        0,
                                                    marginBottom:
                                                        "8px"
                                                }}
                                            >
                                                💰 ₺
                                                {paraFormatla(
                                                    miktar
                                                )}
                                            </h3>

                                            <div
                                                style={{
                                                    color:
                                                        "#555",
                                                    fontSize:
                                                        "14px"
                                                }}
                                            >
                                                <strong>
                                                    Satıcı:
                                                </strong>{" "}
                                                {talep.email ||
                                                    talep.satici ||
                                                    "-"}
                                            </div>
                                        </div>

                                        <span
                                            style={{
                                                padding:
                                                    "7px 12px",
                                                borderRadius:
                                                    "20px",
                                                background:
                                                    `${durumRengi(
                                                        durum
                                                    )}20`,
                                                color:
                                                    durumRengi(
                                                        durum
                                                    ),
                                                fontWeight:
                                                    "700",
                                                fontSize:
                                                    "13px"
                                            }}
                                        >
                                            {durum}
                                        </span>
                                    </div>

                                    <hr
                                        style={{
                                            border:
                                                0,
                                            borderTop:
                                                "1px solid #eee",
                                            margin:
                                                "18px 0"
                                        }}
                                    />

                                    <div
                                        style={{
                                            display:
                                                "grid",
                                            gridTemplateColumns:
                                                "repeat(auto-fit, minmax(220px, 1fr))",
                                            gap:
                                                "15px"
                                        }}
                                    >
                                        <div>
                                            <small
                                                style={{
                                                    color:
                                                        "#777"
                                                }}
                                            >
                                                Talep Tarihi
                                            </small>

                                            <div
                                                style={{
                                                    fontWeight:
                                                        "600"
                                                }}
                                            >
                                                {tarihFormatla(
                                                    talep.tarih ||
                                                        talep.olusturmaTarihi ||
                                                        talep.createdAt
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <small
                                                style={{
                                                    color:
                                                        "#777"
                                                }}
                                            >
                                                IBAN
                                            </small>

                                            <div
                                                style={{
                                                    fontWeight:
                                                        "600",
                                                    wordBreak:
                                                        "break-all"
                                                }}
                                            >
                                                {talep.ibanMasked ||
                                                    "-"}
                                            </div>
                                        </div>

                                        <div>
                                            <small
                                                style={{
                                                    color:
                                                        "#777"
                                                }}
                                            >
                                                Hesap Sahibi
                                            </small>

                                            <div
                                                style={{
                                                    fontWeight:
                                                        "600"
                                                }}
                                            >
                                                {talep.hesapSahibi ||
                                                    "-"}
                                            </div>
                                        </div>

                                    </div>

                                    <div
                                        style={{
                                            marginTop:
                                                "20px"
                                        }}
                                    >
                                        <label
                                            style={{
                                                display:
                                                    "block",
                                                marginBottom:
                                                    "7px",
                                                fontWeight:
                                                    "600"
                                            }}
                                        >
                                            İptal / bloke gerekçesi
                                        </label>

                                        <textarea
                                            value={
                                                aciklama[
                                                    talepId
                                                ] ||
                                                ""
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                aciklamaDegistir(
                                                    talepId,
                                                    e.target
                                                        .value
                                                )
                                            }
                                            placeholder="İptal veya bloke gerekçesini yazın (zorunlu)..."
                                            rows={3}
                                            style={{
                                                width:
                                                    "100%",
                                                boxSizing:
                                                    "border-box",
                                                padding:
                                                    "10px",
                                                border:
                                                    "1px solid #d1d5db",
                                                borderRadius:
                                                    "8px",
                                                resize:
                                                    "vertical"
                                            }}
                                        />
                                    </div>

                                    <div
                                        style={{
                                            display:
                                                "flex",
                                            gap:
                                                "10px",
                                            marginTop:
                                                "15px",
                                            flexWrap:
                                                "wrap"
                                        }}
                                    >
                                        <button
                                            onClick={() =>
                                                iptalEt(
                                                    talepId
                                                )
                                            }
                                            disabled={
                                                islemLoading || !islemde
                                            }
                                            style={{
                                                flex:
                                                    "1",
                                                minWidth:
                                                    "180px",
                                                padding:
                                                    "12px 18px",
                                                border:
                                                    "none",
                                                borderRadius:
                                                    "8px",
                                                background:
                                                    "#dc2626",
                                                color:
                                                    "#fff",
                                                fontWeight:
                                                    "700",
                                                cursor:
                                                    "pointer"
                                            }}
                                        >
                                            ⛔ İptal / Bloke Et
                                        </button>
                                    </div>
                                </div>
                            );
                        }
                    )}
                </div>
            )}
        </div>
    );
}

export default AdminWithdraw;
