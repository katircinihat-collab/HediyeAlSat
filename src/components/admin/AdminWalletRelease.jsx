import { useEffect, useState } from "react";

import { auth } from "../../firebase";

import "../../styles/components/admin-wallet-release.css";


function AdminWalletRelease() {

    const [hareketler, setHareketler] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    const [mesaj, setMesaj] =
        useState("");


    /*
    ==============================================
    TOKEN
    ==============================================
    */

    async function tokenGetir() {

        const user =
            auth.currentUser;


        if (!user) {

            throw new Error(
                "Giriş yapılması gerekiyor."
            );

        }


        return await user.getIdToken();

    }


    /*
    ==============================================
    BLOKAJI DOLANLARI GETİR
    ==============================================
    */

    async function getir() {

        try {

            setLoading(true);


            const token =
                await tokenGetir();


            const response =
                await fetch(
                    "/api/wallet-release/admin/pending",
                    {
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
                    "Liste alınamadı."
                );

            }


            setHareketler(
                data.hareketler || []
            );

        }

        catch (error) {

            console.error(error);

            setMesaj(
                "❌ " +
                error.message
            );

        }

        finally {

            setLoading(false);

        }

    }


    /*
    ==============================================
    TEK SATIŞI AKTAR
    ==============================================
    */

    async function aktar(hareketId) {

        try {

            const token =
                await tokenGetir();


            const response =
                await fetch(

                    "/api/wallet-release/admin/release",

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

                                hareketId

                            })

                        }

                    );

                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(

                        data.error ||
                        data.neden ||
                        "Aktarma başarısız."

                    );

                }


                setMesaj(
                    "✅ Satış kullanılabilir bakiyeye aktarıldı."
                );


                await getir();

            }

            catch (error) {

                setMesaj(
                    "❌ " +
                    error.message
                );

            }

        }


        /*
        ==============================================
        TÜMÜNÜ AKTAR
        ==============================================
        */

        async function tumunuAktar() {

            try {

                const token =
                    await tokenGetir();


                const response =
                    await fetch(

                        "/api/wallet-release/admin/release-all",

                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

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
                        "Toplu aktarım başarısız."

                    );

                }


                setMesaj(

                    `✅ ${data.basarili || 0} satış kullanılabilir bakiyeye aktarıldı.`

                );


                await getir();

            }

            catch (error) {

                setMesaj(
                    "❌ " +
                    error.message
                );

            }

        }


        /*
        ==============================================
        İLK AÇILIŞ
        ==============================================
        */

        useEffect(() => {

            if (auth.currentUser) {

                getir();

            }

        // Initial load only; `getir` is intentionally not a reactive dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);


        /*
        ==============================================
        FORMAT
        ==============================================
        */

        function para(value) {

            return Number(
                value || 0
            ).toLocaleString(

                "tr-TR",

                {

                    minimumFractionDigits: 2,

                    maximumFractionDigits: 2

                }

            );

        }


        function tarih(value) {

            if (!value) {
                return "-";
            }


            const date =
                new Date(value);


            if (
                isNaN(
                    date.getTime()
                )
            ) {

                return value;

            }


            return date.toLocaleString(
                "tr-TR"
            );

        }


        return (

            <section className="admin-wallet-release">

                <div className="admin-wallet-header">

                    <div>

                        <span>
                            🏦 Satıcı Finans
                        </span>

                        <h2>
                            Blokajı Çözülen Satışlar
                        </h2>

                        <p>
                            Blokaj süresi dolan satışları
                            satıcının kullanılabilir
                            bakiyesine aktarın.
                        </p>

                    </div>


                    <button
                        type="button"
                        onClick={tumunuAktar}
                        disabled={
                            loading ||
                            hareketler.length === 0
                        }
                    >

                        💰 Tümünü Aktar

                    </button>

                </div>


                {mesaj && (

                    <div className="admin-wallet-message">

                        {mesaj}

                    </div>

                )}


                {loading ? (

                    <div className="admin-wallet-empty">

                        ⏳ Yükleniyor...

                    </div>

                ) : hareketler.length === 0 ? (

                    <div className="admin-wallet-empty">

                        <strong>
                            🎉 Aktarılacak satış yok
                        </strong>

                        <span>
                            Şu anda blokaj süresi
                            dolmuş bekleyen satış
                            bulunmuyor.
                        </span>

                    </div>

                ) : (

                    <div className="admin-wallet-list">

                        {hareketler.map(
                            (hareket) => (

                                <div
                                    className="admin-wallet-item"
                                    key={hareket.id}
                                >

                                    <div>

                                        <strong>
                                            {hareket.satici}
                                        </strong>

                                        <span>
                                            Sipariş:
                                            {" "}
                                            {hareket.siparisId}
                                        </span>

                                    </div>


                                    <div>

                                        <span>
                                            Net Kazanç
                                        </span>

                                        <strong>
                                            ₺
                                            {para(
                                                hareket.netTutar
                                            )}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Blokaj Çözülme
                                        </span>

                                        <strong>
                                            {tarih(
                                                hareket.blockageResolvedDate
                                            )}
                                        </strong>

                                    </div>


                                    <button

                                        type="button"

                                        onClick={() =>
                                            aktar(
                                                hareket.id
                                            )
                                        }

                                    >

                                        ✅ Bakiyeye Aktar

                                    </button>

                                </div>

                            )
                        )}

                    </div>

                )}

            </section>

        );

}

export default AdminWalletRelease;
