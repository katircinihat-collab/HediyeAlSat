import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { apiUrl } from "../config/api";
import "../styles/pages/withdraw.css";

import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
} from "firebase/firestore";

function Withdraw() {

  console.log("🔥 YENİ WITHDRAW DOSYASI ÇALIŞIYOR");

  const [iban, setIban] = useState("");
  const [adSoyad, setAdSoyad] = useState("");
  const [tutar, setTutar] = useState("");

  const [bakiye, setBakiye] = useState(0);
  const [talepler, setTalepler] = useState([]);

  const [loading, setLoading] = useState(false);

  // ==============================
  // SAYI FORMATLAMA
  // ==============================

  function formatNumber(value) {

    if (!value) return "";

    return Number(value).toLocaleString("tr-TR");
  }

  // ==============================
  // WALLET BAKİYESİ
  // ==============================

  useEffect(() => {

    const kullanici = auth.currentUser;

    if (!kullanici) {
      console.log("❌ Kullanıcı bulunamadı.");
      return;
    }

    const email = kullanici.email;

    console.log("👤 Giriş yapan kullanıcı:", email);

    // ÖNEMLİ:
    // Backend wallet kaydını doğrudan
    // wallets/email şeklinde tutuyor.

    const walletRef = doc(
      db,
      "wallets",
      email
    );

    console.log(
      "🔎 Okunan wallet:",
      `wallets/${email}`
    );

    const unsub = onSnapshot(
      walletRef,
      (snap) => {

        if (!snap.exists()) {

          console.log(
            "❌ Wallet bulunamadı!"
          );

          setBakiye(0);

          return;
        }

        const data = snap.data();

        console.log(
          "========== WALLET =========="
        );

        console.log(
          "Wallet ID:",
          snap.id
        );

        console.log(
          "Wallet verisi:",
          data
        );

        console.log(
          "Firebase balance:",
          data.balance
        );

        console.log(
          "Ekrana yazılacak:",
          Number(data.balance || 0)
        );

        console.log(
          "============================="
        );

        setBakiye(
          Number(data.balance || 0)
        );
      },
      (error) => {

        console.error(
          "❌ Wallet okuma hatası:",
          error
        );

      }
    );

    return () => unsub();

  }, []);

  // ==============================
  // PARA ÇEKME GEÇMİŞİ
  // ==============================

  useEffect(() => {

    const kullanici = auth.currentUser;

    if (!kullanici) return;

    const email = kullanici.email;

    const q = query(
      collection(db, "geriCekmeTalepleri"),
      where(
        "email",
        "==",
        email
      )
    );

    const unsub = onSnapshot(
      q,
      (snap) => {

        const liste =
          snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));

        setTalepler(liste);

      },
      (error) => {

        console.error(
          "Para çekme geçmişi hatası:",
          error
        );

      }
    );

    return () => unsub();

  }, []);

  // ==============================
  // PARA ÇEKME TALEBİ
  // ==============================

  async function talepOlustur() {

    const gercekTutar = Number(
      String(tutar).replace(/\D/g, "")
    );

    console.log(
      "💸 Çekim tutarı:",
      gercekTutar
    );

    if (!auth.currentUser) {

      alert(
        "Para çekmek için giriş yapmalısınız."
      );

      return;
    }

    if (!iban || !adSoyad) {

      alert(
        "Ad Soyad ve IBAN bilgilerini giriniz."
      );

      return;
    }

    if (!gercekTutar || gercekTutar <= 0) {

      alert(
        "Geçerli bir çekim tutarı giriniz."
      );

      return;
    }

    if (gercekTutar > bakiye) {

      alert(
        `Çekilebilir bakiyeniz ${bakiye.toFixed(2)} TL.`
      );

      return;
    }

    setLoading(true);

    try {

      const token =
        await auth.currentUser.getIdToken();

      const response = await fetch(
        apiUrl("/api/withdraw"),
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${token}`
          },

          body: JSON.stringify({
            email:
              auth.currentUser.email,

            miktar:
              gercekTutar
          })
        }
      );

      const data =
        await response.json();

      console.log(
        "💰 BACKEND CEVABI:",
        data
      );

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

      alert(
        "✅ Para çekme talebiniz oluşturuldu."
      );

      setTutar("");

    } catch (error) {

      console.error(
        "❌ Para çekme hatası:",
        error
      );

      alert(
        error.message ||
        "Bir hata oluştu."
      );

    } finally {

      setLoading(false);

    }
  }

  // ==============================
  // TARİH
  // ==============================

  function tarihFormatla(tarih) {

    if (!tarih) return "-";

    try {

      if (tarih.seconds) {

        return new Date(
          tarih.seconds * 1000
        ).toLocaleString("tr-TR");

      }

      return new Date(
        tarih
      ).toLocaleString("tr-TR");

    } catch {

      return "-";

    }
  }

  // ==============================
  // EKRAN
  // ==============================

  return (

    <div className="withdraw-page">

      <h1>
        💸 Para Çekme
      </h1>

      <div className="withdraw-box">

        <h2>
          Çekilebilir Bakiye
        </h2>

        <h1>
          ₺{bakiye.toLocaleString("tr-TR")}
        </h1>

        <h2>
          Banka Bilgileri
        </h2>

        <input
          placeholder="Ad Soyad"
          value={adSoyad}
          onChange={(e) =>
            setAdSoyad(e.target.value)
          }
        />

        <input
          placeholder="IBAN"
          value={iban}
          onChange={(e) =>
            setIban(
              e.target.value.toUpperCase()
            )
          }
        />

        <input
          type="text"
          inputMode="numeric"
          placeholder="Çekmek İstediğiniz Tutar"
          value={formatNumber(tutar)}
          onChange={(e) => {

            const temiz =
              e.target.value.replace(
                /\D/g,
                ""
              );

            setTutar(temiz);

          }}
        />

        <div className="withdraw-info">

          <p>
            💰 Çekilebilir bakiye:
            <b>
              {" "}
              ₺{bakiye.toLocaleString("tr-TR")}
            </b>
          </p>

          <p>
            🏦 Ödemeler admin onayından sonra yapılır.
          </p>

          <p>
            📌 Para çekme talebiniz güvenli şekilde kayıt altına alınır.
          </p>

        </div>

        <button
          className="withdraw-btn"
          disabled={
            loading ||
            !tutar ||
            Number(tutar) > bakiye
          }
          onClick={talepOlustur}
        >

          {loading
            ? "⏳ Talep Oluşturuluyor..."
            : `💸 ${
                formatNumber(
                  tutar || "0"
                )
              } TL Para Çekme Talebi Oluştur`
          }

        </button>

      </div>

      <h2>
        📋 Para Çekme Geçmişi
      </h2>

      <div className="withdraw-history">

        {talepler.length === 0 ? (

          <p>
            Henüz para çekme talebiniz bulunmuyor.
          </p>

        ) : (

          talepler.map((talep) => (

            <div
              className="withdraw-history-item"
              key={talep.id}
            >

              <div>

                <strong>
                  ₺{Number(
                    talep.miktar || 0
                  ).toLocaleString("tr-TR")}
                </strong>

              </div>

              <div>

                {talep.durum === "Bekliyor" && (
                  <span>
                    ⏳ Bekliyor
                  </span>
                )}

                {talep.durum === "Ödendi" && (
                  <span>
                    ✅ Ödendi
                  </span>
                )}

                {talep.durum === "Reddedildi" && (
                  <span>
                    ❌ Reddedildi
                  </span>
                )}

              </div>

              <div>

                {tarihFormatla(
                  talep.talepTarihi
                )}

              </div>

            </div>

          ))

        )}

      </div>

    </div>

  );
}

export default Withdraw;
