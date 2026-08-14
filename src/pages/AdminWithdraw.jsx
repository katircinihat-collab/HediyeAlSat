import { useEffect, useState } from "react";
import { auth } from "../firebase";

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
    BLOKAJ TARİHİNİ BUL
    ==================================================
    */

    function blokajTarihiBul(talep) {
        return (
            talep.blockageResolvedDate ||
            talep.blokajBitisTarihi ||
            talep.serbestBirakmaTarihi ||
            talep.releaseDate ||
            null
        );
    }

    /*
    ==================================================
    BLOKAJ DURUMU
    ==================================================
    */

    function blokajDurumu(talep) {
        const tarih =
            tarihCevir(
                blokajTarihiBul(talep)
            );

        if (!tarih) {
            return {
                durum: "Bilinmiyor",
                renk: "#777",
                mesaj:
                    "Blokaj tarihi bulunamadı."
            };
        }

        const simdi = new Date();

        const fark =
            tarih.getTime() -
            simdi.getTime();

        if (fark <= 0) {
            return {
                durum: "Serbest",
                renk: "#16803c",
                mesaj:
                    "Blokaj süresi doldu. Ödeme yapılabilir."
            };
        }

        const gun =
            Math.ceil(
                fark /
                    (1000 * 60 * 60 * 24)
            );

        return {
            durum: "Blokajda",
            renk: "#d97706",
            mesaj:
                `${gun} gün sonra serbest.`
        };
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
                    "/api/withdraw/admin/pending",
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
    }, []);

    /*
    ==================================================
    ÖDENDİ YAP
    ==================================================
    */

    async function odendiYap(talepId) {
        if (!talepId) {
            setHata(
                "Talep ID bulunamadı."
            );

            return;
        }

        const onay =
            window.confirm(
                "Bu para çekme talebini ÖDENDİ olarak işaretlemek istediğinize emin misiniz?"
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
                    "/api/withdraw/admin/paid",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`
                        },

                        body:
                            JSON.stringify({
                                talepId
                            })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Ödeme işlemi başarısız."
                );
            }

            setMesaj(
                "✅ Para çekme talebi ödendi olarak işaretlendi."
            );

            await talepleriGetir();
        } catch (error) {
            console.error(
                "Ödeme işlemi:",
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
    REDDET
    ==================================================
    */

    async function reddet(talepId) {
        if (!talepId) {
            setHata(
                "Talep ID bulunamadı."
            );

            return;
        }

        const aciklamaMetni =
            aciklama[talepId] || "";

        const onay =
            window.confirm(
                "Bu para çekme talebini reddetmek istediğinize emin misiniz?"
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
                    "/api/withdraw/admin/reject",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`
                        },

                        body:
                            JSON.stringify({
                                talepId,
                                aciklama:
                                    aciklamaMetni
                            })
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    "Reddetme işlemi başarısız."
                );
            }

            setMesaj(
                "✅ Para çekme talebi reddedildi. Tutar satıcı bakiyesine iade edildi."
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
                "Reddetme işlemi:",
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
                return "#2563eb";

            case "ödendi":
                return "#16803c";

            case "reddedildi":
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
                        Satıcıların para çekme
                        taleplerini buradan
                        yönetebilirsiniz.
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

                            const blokaj =
                                blokajDurumu(
                                    talep
                                );

                            const durum =
                                talep.durum ||
                                "Bekliyor";

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
                                                {talep.iban ||
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

                                        <div>
                                            <small
                                                style={{
                                                    color:
                                                        "#777"
                                                }}
                                            >
                                                Blokaj
                                            </small>

                                            <div
                                                style={{
                                                    color:
                                                        blokaj.renk,
                                                    fontWeight:
                                                        "700"
                                                }}
                                            >
                                                {blokaj.durum}
                                            </div>

                                            <div
                                                style={{
                                                    fontSize:
                                                        "13px",
                                                    color:
                                                        blokaj.renk,
                                                    marginTop:
                                                        "3px"
                                                }}
                                            >
                                                {
                                                    blokaj.mesaj
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    {blokajTarihiBul(
                                        talep
                                    ) && (
                                        <div
                                            style={{
                                                marginTop:
                                                    "15px",
                                                padding:
                                                    "12px",
                                                borderRadius:
                                                    "8px",
                                                background:
                                                    "#f8fafc"
                                            }}
                                        >
                                            <strong>
                                                🔒 Blokaj
                                                bitişi:
                                            </strong>{" "}
                                            {tarihFormatla(
                                                blokajTarihiBul(
                                                    talep
                                                )
                                            )}
                                        </div>
                                    )}

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
                                            Red açıklaması
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
                                            placeholder="Talep reddedilecekse açıklama yazabilirsiniz..."
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
                                                odendiYap(
                                                    talepId
                                                )
                                            }
                                            disabled={
                                                islemLoading ||
                                                blokaj.durum !==
                                                    "Serbest"
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
                                                    blokaj.durum ===
                                                    "Serbest"
                                                        ? "#16803c"
                                                        : "#9ca3af",
                                                color:
                                                    "#fff",
                                                fontWeight:
                                                    "700",
                                                cursor:
                                                    blokaj.durum ===
                                                    "Serbest"
                                                        ? "pointer"
                                                        : "not-allowed"
                                            }}
                                        >
                                            {islemLoading
                                                ? "⏳ İşleniyor..."
                                                : blokaj.durum ===
                                                  "Serbest"
                                                ? "💸 Ödendi Yap"
                                                : "🔒 Blokaj Devam Ediyor"}
                                        </button>

                                        <button
                                            onClick={() =>
                                                reddet(
                                                    talepId
                                                )
                                            }
                                            disabled={
                                                islemLoading
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
                                            ❌ Reddet
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