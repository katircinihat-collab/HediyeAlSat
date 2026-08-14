import { useEffect, useState } from "react";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import "../../styles/components/withdraw-request.css";

function WithdrawRequest() {

    const [wallet, setWallet] = useState(null);
    const [tutar, setTutar] = useState("");
    const [loading, setLoading] = useState(false);
    const [yukleniyor, setYukleniyor] = useState(true);
    const [mesaj, setMesaj] = useState("");

    /*
    ==================================================
    CÜZDANI GETİR
    ==================================================
    */

    async function walletGetir() {

        const user = auth.currentUser;

        if (!user) {

            setYukleniyor(false);

            setMesaj(
                "❌ Önce giriş yapmalısınız."
            );

            return;
        }

        try {

            setYukleniyor(true);

            const token =
                await user.getIdToken();

            const response =
                await fetch(
                    `http://localhost:5000/api/wallet/${encodeURIComponent(user.email)}`,
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

            console.log(
                "👛 Wallet cevabı:",
                data
            );

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    "Cüzdan bilgisi alınamadı."
                );
            }

            const walletData =
                data.wallet || data;

            console.log(
                "👛 Kullanılan wallet:",
                walletData
            );

            setWallet({

                ...walletData,

                balance:
                    Number(
                        walletData.balance || 0
                    ),

                pending:
                    Number(
                        walletData.pending || 0
                    ),

                withdrawalPending:
                    Number(
                        walletData.withdrawalPending || 0
                    ),

                paid:
                    Number(
                        walletData.paid || 0
                    )

            });

        }

        catch (error) {

            console.error(
                "❌ Cüzdan getirme hatası:",
                error
            );

            setMesaj(
                "❌ Cüzdan bilgileri alınamadı."
            );

        }

        finally {

            setYukleniyor(false);

        }

    }


    /*
    ==================================================
    SAYFA AÇILINCA CÜZDANI GETİR
    ==================================================
    */

    useEffect(() => {

        const unsubscribe =
            onAuthStateChanged(
                auth,
                async (user) => {

                    if (user) {

                        await walletGetir();

                    } else {

                        setYukleniyor(false);

                        setMesaj(
                            "❌ Önce giriş yapmalısınız."
                        );

                    }

                }
            );

        return () => {

            unsubscribe();

        };

    }, []);


    /*
    ==================================================
    PARA ÇEK
    ==================================================
    */

    async function paraCek() {

        const user =
            auth.currentUser;

        if (!user) {

            setMesaj(
                "❌ Önce giriş yapmalısınız."
            );

            return;

        }


        const miktar =
            Number(tutar);


        if (
            !tutar ||
            !Number.isFinite(miktar)
        ) {

            setMesaj(
                "❌ Çekmek istediğiniz tutarı girin."
            );

            return;

        }


        if (miktar < 50) {

            setMesaj(
                "❌ Minimum para çekme tutarı ₺50."
            );

            return;

        }


        const balance =
            Number(
                wallet?.balance || 0
            );


        if (miktar > balance) {

            setMesaj(
                "❌ Kullanılabilir bakiye yetersiz. " +
                "Mevcut bakiye: ₺" +
                paraFormatla(balance)
            );

            return;

        }


        if (!wallet?.iban) {

            setMesaj(
                "❌ Önce IBAN bilgilerinizi kaydedin."
            );

            return;

        }


        setLoading(true);

        setMesaj("");


        try {

            const token =
                await user.getIdToken();


            console.log(
                "💸 Para çekme gönderiliyor:",
                {
                    miktar,
                    email: user.email
                }
            );


            const response =
                await fetch(
                    "http://localhost:5000/api/withdraw",
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

                                miktar

                            })

                    }
                );


            const data =
                await response.json();


            console.log(
                "💸 Para çekme cevabı:",
                data
            );


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    "Para çekme işlemi başarısız."
                );

            }


            setMesaj(
                "✅ Para çekme talebiniz oluşturuldu."
            );


            setTutar("");


            await walletGetir();

        }

        catch (error) {

            console.error(
                "❌ Para çekme hatası:",
                error
            );


            setMesaj(
                "❌ " +
                (
                    error.message ||
                    "İşlem başarısız."
                )
            );

        }

        finally {

            setLoading(false);

        }

    }


    /*
    ==================================================
    CÜZDAN DEĞERLERİ
    ==================================================
    */

    const balance =
        Number(
            wallet?.balance || 0
        );


    const pending =
        Number(
            wallet?.pending || 0
        );


    const withdrawalPending =
        Number(
            wallet?.withdrawalPending || 0
        );


    const paid =
        Number(
            wallet?.paid || 0
        );


    /*
    ==================================================
    PARA FORMATLA
    ==================================================
    */

    function paraFormatla(deger) {

        return Number(
            deger || 0
        ).toLocaleString(
            "tr-TR",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

    }


    /*
    ==================================================
    YÜKLENİYOR
    ==================================================
    */

    if (yukleniyor) {

        return (

            <section className="withdraw-card">

                <div className="withdraw-header">

                    <div>

                        <span>
                            💸 Satıcı Cüzdanı
                        </span>

                        <h2>
                            Para Çekme
                        </h2>

                    </div>

                    <div className="wallet-icon">
                        💰
                    </div>

                </div>

                <div className="withdraw-message">

                    ⏳ Cüzdan bilgileri yükleniyor...

                </div>

            </section>

        );

    }


    /*
    ==================================================
    EKRAN
    ==================================================
    */

    return (

        <section className="withdraw-card">

            <div className="withdraw-header">

                <div>

                    <span>
                        💸 Satıcı Cüzdanı
                    </span>

                    <h2>
                        Para Çekme
                    </h2>

                </div>

                <div className="wallet-icon">
                    💰
                </div>

            </div>


            {/* KULLANILABİLİR BAKİYE */}

            <div className="wallet-balance">

                <span>
                    Kullanılabilir Bakiye
                </span>

                <strong>
                    ₺{paraFormatla(balance)}
                </strong>

            </div>


            {/* İSTATİSTİKLER */}

            <div className="wallet-stats">

                <div>

                    <span>
                        Bekleyen
                    </span>

                    <b>
                        ₺{paraFormatla(pending)}
                    </b>

                </div>


                <div>

                    <span>
                        İşlemde
                    </span>

                    <b>
                        ₺{paraFormatla(withdrawalPending)}
                    </b>

                </div>


                <div>

                    <span>
                        Çekilen
                    </span>

                    <b>
                        ₺{paraFormatla(paid)}
                    </b>

                </div>

            </div>


            {/* PARA ÇEKME FORMU */}

            <div className="withdraw-form">

                <label>
                    Çekilecek Tutar
                </label>


                <div className="amount-input">

                    <span>
                        ₺
                    </span>


                    <input
                        type="number"
                        min="50"
                        step="0.01"
                        placeholder="50.00"
                        value={tutar}
                        onChange={(e) =>
                            setTutar(
                                e.target.value
                            )
                        }
                        disabled={loading}
                    />

                </div>


                <p className="withdraw-info">

                    Minimum çekim tutarı: ₺50

                </p>


                <button
                    type="button"
                    onClick={paraCek}
                    disabled={
                        loading ||
                        balance < 50 ||
                        !wallet?.iban
                    }
                >

                    {loading
                        ? "⏳ İşleniyor..."
                        : "💸 Para Çek"
                    }

                </button>


                {mesaj && (

                    <div className="withdraw-message">

                        {mesaj}

                    </div>

                )}

            </div>


            {/* IBAN */}

            <div className="withdraw-bank">

                <span>
                    🏦 Kayıtlı IBAN
                </span>


                <strong>

                    {wallet?.iban
                        ? wallet.iban
                        : "IBAN kayıtlı değil"
                    }

                </strong>

            </div>


        </section>

    );

}


export default WithdrawRequest;