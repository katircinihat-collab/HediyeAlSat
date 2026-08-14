import { useEffect, useState } from "react";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

function BankAccount() {

  const [banka, setBanka] = useState("");
  const [iban, setIban] = useState("");
  const [hesapSahibi, setHesapSahibi] = useState("");

  const [loading, setLoading] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);


  /*
  ====================================================
  KULLANICININ BANKA BİLGİLERİNİ GETİR
  ====================================================
  */

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {

        if (!user) {

          console.log(
            "❌ Giriş yapan kullanıcı bulunamadı."
          );

          setYukleniyor(false);

          return;
        }


        try {

          console.log(
            "🔐 Banka bilgileri için kullanıcı:",
            user.email
          );


          const token =
            await user.getIdToken();


          const url =
            `http://localhost:5000/api/wallet/${encodeURIComponent(
              user.email
            )}`;


          console.log(
            "🏦 Wallet okunuyor:",
            url
          );


          const response =
            await fetch(
              url,
              {
                method: "GET",

                headers: {
                  "Authorization":
                    `Bearer ${token}`
                }
              }
            );


          const data =
            await response.json();


          console.log(
            "🏦 Wallet banka bilgileri cevabı:",
            data
          );


          if (!response.ok) {

            console.error(
              "❌ Banka bilgileri alınamadı:",
              data
            );

            return;

          }


          /*
          ==================================================
          BACKEND ŞU ŞEKİLDE DÖNÜYOR:

          {
              success: true,
              wallet: {
                  balance: 12,
                  iban: "...",
                  bankaAdi: "...",
                  hesapSahibi: "..."
              }
          }

          Bu yüzden data.wallet kullanıyoruz.
          ==================================================
          */

          const wallet =
            data.wallet;


          if (!wallet) {

            console.error(
              "❌ Cevap içinde wallet bulunamadı:",
              data
            );

            return;

          }


          console.log(
            "💰 Wallet bulundu:",
            wallet
          );


          setBanka(
            wallet.bankaAdi || ""
          );


          setIban(
            wallet.iban || ""
          );


          setHesapSahibi(
            wallet.hesapSahibi || ""
          );

        }

        catch (error) {

          console.error(
            "❌ Banka bilgileri okuma hatası:",
            error
          );

        }

        finally {

          setYukleniyor(false);

        }

      }
    );


    return () => {

      unsubscribe();

    };

  }, []);


  /*
  ====================================================
  BANKA BİLGİLERİNİ KAYDET
  ====================================================
  */

  async function kaydet() {

    const user =
      auth.currentUser;


    if (!user) {

      alert(
        "Giriş yapınız."
      );

      return;

    }


    /*
    ==================================================
    KONTROLLER
    ==================================================
    */

    if (!banka.trim()) {

      alert(
        "Banka adını giriniz."
      );

      return;

    }


    if (!hesapSahibi.trim()) {

      alert(
        "Hesap sahibini giriniz."
      );

      return;

    }


    if (!iban.trim()) {

      alert(
        "IBAN bilgisini giriniz."
      );

      return;

    }


    setLoading(true);


    try {

      /*
      ==================================================
      FIREBASE ID TOKEN
      ==================================================
      */

      const token =
        await user.getIdToken();


      /*
      ==================================================
      BACKEND'E GÖNDER
      ==================================================
      */

      const response =
        await fetch(
          "http://localhost:5000/api/wallet/save-iban",
          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json",

              "Authorization":
                `Bearer ${token}`

            },

            body:
              JSON.stringify({

                email:
                  user.email,

                iban:
                  iban.trim(),

                bankaAdi:
                  banka.trim(),

                hesapSahibi:
                  hesapSahibi.trim()

              })

          }
        );


      const data =
        await response.json();


      console.log(
        "🏦 IBAN kayıt cevabı:",
        data
      );


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(

          data.error ||
          data.message ||
          "Banka bilgileri kaydedilemedi."

        );

      }


      /*
      ==================================================
      KAYIT BAŞARILIYSA EKRANI BACKEND'DEN GELEN
      VERİYLE GÜNCELLE
      ==================================================
      */

      if (data.wallet) {

        setBanka(
          data.wallet.bankaAdi || banka
        );

        setIban(
          data.wallet.iban || iban
        );

        setHesapSahibi(
          data.wallet.hesapSahibi || hesapSahibi
        );

      }


      alert(
        "✅ Banka bilgileri başarıyla kaydedildi."
      );

    }

    catch (error) {

      console.error(
        "❌ IBAN kayıt hatası:",
        error
      );


      alert(
        error.message ||
        "Banka bilgileri kaydedilemedi."
      );

    }

    finally {

      setLoading(false);

    }

  }


  /*
  ====================================================
  IBAN FORMATLA
  ====================================================
  */

  function ibanDegistir(deger) {

    const temiz =
      deger
        .replace(/\s/g, "")
        .toUpperCase();


    /*
    Türkiye IBAN'ı en fazla 26 karakter.
    */

    const sinirli =
      temiz.substring(
        0,
        26
      );


    /*
    4'er karakterlik gruplara ayır
    */

    const formatli =
      sinirli.match(/.{1,4}/g)?.join(" ") || "";


    setIban(
      formatli
    );

  }


  /*
  ====================================================
  EKRAN
  ====================================================
  */

  return (

    <>

      <hr />


      <h2>
        🏦 Banka Bilgileri
      </h2>


      <div className="wallet-box">


        <input

          type="text"

          placeholder="Banka Adı"

          value={
            banka
          }

          onChange={
            (e) =>
              setBanka(
                e.target.value
              )
          }

          disabled={
            loading ||
            yukleniyor
          }

        />


        <br />
        <br />


        <input

          type="text"

          placeholder="Hesap Sahibi"

          value={
            hesapSahibi
          }

          onChange={
            (e) =>
              setHesapSahibi(
                e.target.value
              )
          }

          disabled={
            loading ||
            yukleniyor
          }

        />


        <br />
        <br />


        <input

          type="text"

          placeholder="TR00 0000 0000 0000 0000 0000 00"

          value={
            iban
          }

          onChange={
            (e) =>
              ibanDegistir(
                e.target.value
              )
          }

          disabled={
            loading ||
            yukleniyor
          }

        />


        <br />
        <br />


        <button

          className="save-btn"

          onClick={
            kaydet
          }

          disabled={
            loading ||
            yukleniyor
          }

        >

          {loading

            ? "⏳ Kaydediliyor..."

            : "💾 Kaydet"

          }

        </button>


      </div>

    </>

  );

}


export default BankAccount;