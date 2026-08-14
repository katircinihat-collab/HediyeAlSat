import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";

import {
  doc,
  onSnapshot
} from "firebase/firestore";

import {
  onAuthStateChanged
} from "firebase/auth";

import "../../styles/pages/seller-wallet.css";


function SellerWallet() {

  const [wallet, setWallet] = useState({
    balance: 0,
    pending: 0,
    paid: 0,
    iban: "",
    bankaAdi: "",
    hesapSahibi: ""
  });

  const [loading, setLoading] = useState(true);


  useEffect(() => {

    let walletUnsubscribe = null;

    const authUnsubscribe = onAuthStateChanged(
      auth,
      (user) => {

        console.log(
          "🔐 Giriş yapan kullanıcı:",
          user?.email
        );


        // Kullanıcı giriş yapmamışsa
        if (!user) {

          setWallet({
            balance: 0,
            pending: 0,
            paid: 0,
            iban: "",
            bankaAdi: "",
            hesapSahibi: ""
          });

          setLoading(false);

          return;
        }


        const email = user.email;

        console.log(
          "💳 Wallet okunuyor:",
          email
        );


        /*
        =================================
        FIREBASE WALLET
        =================================

        wallets
          └── yusuf@gmail.com
                balance: 32
        */

        const walletRef = doc(
          db,
          "wallets",
          email
        );


        // Önceki listener varsa kapat
        if (walletUnsubscribe) {
          walletUnsubscribe();
        }


        walletUnsubscribe = onSnapshot(

          walletRef,

          (snap) => {

            console.log(
              "📦 Wallet bulundu:",
              snap.exists()
            );


            if (!snap.exists()) {

              console.log(
                "❌ Wallet bulunamadı:",
                email
              );

              setWallet({
                balance: 0,
                pending: 0,
                paid: 0,
                iban: "",
                bankaAdi: "",
                hesapSahibi: ""
              });

              setLoading(false);

              return;
            }


            const data = snap.data();


            console.log(
              "💰 Firebase wallet verisi:",
              data
            );

            console.log(
              "💰 Firebase balance:",
              data.balance
            );


            setWallet({

              balance:
                Number(data.balance || 0),

              pending:
                Number(data.pending || 0),

              paid:
                Number(data.paid || 0),

              iban:
                data.iban || "",

              bankaAdi:
                data.bankaAdi || "",

              hesapSahibi:
                data.hesapSahibi || ""

            });


            setLoading(false);

          },

          (error) => {

            console.error(
              "❌ Wallet okuma hatası:",
              error
            );

            setLoading(false);

          }

        );

      }
    );


    return () => {

      authUnsubscribe();

      if (walletUnsubscribe) {
        walletUnsubscribe();
      }

    };

  }, []);


  return (

    <>

      <hr />

      <h2>
        💳 Satıcı Cüzdanı
      </h2>


      <div className="wallet-cards">


        {/* ÇEKİLEBİLİR BAKİYE */}

        <div className="wallet-card green">

          <h3>
            💰 Çekilebilir Bakiye
          </h3>

          <h1>

            ₺

            {loading

              ? "..."

              : Number(
                  wallet.balance || 0
                ).toLocaleString("tr-TR")

            }

          </h1>

          <p>
            Hemen banka hesabınıza aktarabilirsiniz.
          </p>

        </div>


        {/* BEKLEYEN */}

        <div className="wallet-card orange">

          <h3>
            ⌛ Bekleyen Bakiye
          </h3>

          <h1>

            ₺
            {Number(
              wallet.pending || 0
            ).toLocaleString("tr-TR")}

          </h1>

          <p>
            Kargo teslim edilince aktarılır.
          </p>

        </div>


        {/* ÖDENEN */}

        <div className="wallet-card blue">

          <h3>
            🏦 Toplam Ödenen
          </h3>

          <h1>

            ₺
            {Number(
              wallet.paid || 0
            ).toLocaleString("tr-TR")}

          </h1>

          <p>
            Hesabınıza aktarılan toplam tutar.
          </p>

        </div>


        {/* IBAN */}

        <div className="wallet-card purple">

          <h3>
            🏛 IBAN
          </h3>

          <h2>

            {wallet.iban
              ? wallet.iban
              : "Tanımlı değil"
            }

          </h2>

          <p>

            {wallet.hesapSahibi
              || "Hesap sahibi tanımlanmadı"
            }

          </p>

        </div>

      </div>


      {/* BANKA BİLGİLERİ */}

      <div className="wallet-info">

        <table>

          <tbody>

            <tr>

              <td>
                🏦 Banka
              </td>

              <td>
                {wallet.bankaAdi || "-"}
              </td>

            </tr>


            <tr>

              <td>
                👤 Hesap Sahibi
              </td>

              <td>
                {wallet.hesapSahibi || "-"}
              </td>

            </tr>


            <tr>

              <td>
                💳 IBAN
              </td>

              <td>
                {wallet.iban || "-"}
              </td>

            </tr>

          </tbody>

        </table>

      </div>

    </>

  );

}


export default SellerWallet;