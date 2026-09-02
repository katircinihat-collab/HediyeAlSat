import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { db } from "../firebase";

import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import { isA4Listing, isLegacySecondHandListing } from "../data/categories";

import "../styles/pages/special-day.css";


/* =====================================================
   ÖZEL GÜNLER
===================================================== */

const ozelGunler = {

  "Sevgililer Günü": {
    emoji: "❤️",
    baslik: "Sevgililer Günü",
    aciklama:
      "Sevgilinize özel en güzel hediye fikirlerini keşfedin."
  },

  "Anneler Günü": {
    emoji: "🌷",
    baslik: "Anneler Günü",
    aciklama:
      "Annelerinizi mutlu edecek özel hediyeleri keşfedin."
  },

  "Babalar Günü": {
    emoji: "👔",
    baslik: "Babalar Günü",
    aciklama:
      "Babanız için birbirinden güzel hediye seçeneklerini keşfedin."
  },

  "Doğum Günü": {
    emoji: "🎂",
    baslik: "Doğum Günü",
    aciklama:
      "Doğum günlerine özel en güzel hediye fikirlerini keşfedin."
  },

  "Yılbaşı": {
    emoji: "🎄",
    baslik: "Yılbaşı",
    aciklama:
      "Yeni yıla özel hediye seçeneklerini keşfedin."
  },

  "Mezuniyet": {
    emoji: "🎓",
    baslik: "Mezuniyet",
    aciklama:
      "Mezuniyet için unutulmaz hediye fikirlerini keşfedin."
  },

  "Yıldönümü": {
    emoji: "💍",
    baslik: "Yıldönümü",
    aciklama:
      "Yıldönümünüze özel romantik hediyeleri keşfedin."
  },

  "Sürpriz": {
    emoji: "🎉",
    baslik: "Sürpriz",
    aciklama:
      "Sevdiklerinize sürpriz yapmak için özel hediyeleri keşfedin."
  }

};


/* =====================================================
   SAYFA
===================================================== */

function SpecialDay() {

  const { gun } = useParams();

  const [ilanlar, setIlanlar] = useState([]);

  const [yukleniyor, setYukleniyor] =
    useState(true);


  /* ===================================================
     URL'DEKİ ÖZEL GÜN
  =================================================== */

  const ozelGun =
    decodeURIComponent(gun || "");


  const bilgi =
    ozelGunler[ozelGun];


  /* ===================================================
     FIREBASE'DEN ÜRÜNLERİ GETİR
  =================================================== */

  useEffect(() => {

    async function getir() {

      try {

        setYukleniyor(true);

        const snap =
          await getDocs(
            query(
              collection(db, "ilanlar"),
              where("onay", "==", true)
            )
          );


        const liste =
          snap.docs.map(
            (item) => ({

              id: item.id,

              ...item.data()

            })
          );


        /* ---------------------------------------------
           SADECE ONAYLI + ÖZEL GÜNE AİT İLANLAR
        --------------------------------------------- */

        const filtreli =
          liste.filter(
            (ilan) => {

              if (isLegacySecondHandListing(ilan)) return false;
              if (isA4Listing(ilan)) return false;

              if (
                !Array.isArray(
                  ilan.ozelGunler
                )
              ) {
                return false;
              }


              return ilan.ozelGunler.includes(
                ozelGun
              );

            }
          );


        setIlanlar(
          filtreli
        );


      } catch (error) {

        console.error(
          "Özel gün ürünleri alınamadı:",
          error
        );

      } finally {

        setYukleniyor(false);

      }

    }


    if (bilgi) {

      getir();

    } else {

      setYukleniyor(false);

    }

  }, [ozelGun, bilgi]);


  /* ===================================================
     ÖZEL GÜN BULUNAMADI
  =================================================== */

  if (!bilgi) {

    return (

      <>

        <Navbar />

        <main className="special-day-page">

          <div className="special-day-empty">

            <div className="special-day-empty-icon">
              😕
            </div>

            <h2>
              Özel gün bulunamadı
            </h2>

            <p>
              Aradığınız özel gün mevcut değil.
            </p>

            <Link
              to="/"
              className="special-day-card-button"
            >
              ← Ana Sayfaya Dön
            </Link>

          </div>

        </main>

      </>

    );

  }


  /* ===================================================
     SAYFA
  =================================================== */

  return (

    <>

      <Navbar />


      <main className="special-day-page">


        {/* ============================================
           GERİ DÖN
        ============================================ */}

        <div className="special-day-back">

          <Link
            to="/"
            style={{
              textDecoration: "none"
            }}
          >

            <button type="button">
              ← Ana Sayfaya Dön
            </button>

          </Link>

        </div>


        {/* ============================================
           BAŞLIK
        ============================================ */}

        <header className="special-day-header">

          <h1>

            {bilgi.emoji}{" "}

            {bilgi.baslik}

          </h1>

          <p>
            {bilgi.aciklama}
          </p>

        </header>


        {/* ============================================
           ÜRÜNLER
        ============================================ */}

        <section className="special-day-products">


          {/* ==========================================
             YÜKLENİYOR
          ========================================== */}

          {yukleniyor && (

            <div className="special-day-loading">

              <div className="special-day-loading-icon">
                ⏳
              </div>

              Ürünler yükleniyor...

            </div>

          )}


          {/* ==========================================
             ÜRÜN YOK
          ========================================== */}

          {!yukleniyor &&
            ilanlar.length === 0 && (

              <div className="special-day-empty">

                <div className="special-day-empty-icon">
                  🎁
                </div>

                <h2>
                  Henüz ürün bulunamadı
                </h2>

                <p>
                  Bu özel gün için şu anda
                  uygun ürün bulunmuyor.
                </p>

                <br />

                <Link
                  to="/"
                  style={{
                    textDecoration: "none"
                  }}
                >

                  <button
                    className="special-day-card-button"
                    type="button"
                  >
                    ← Diğer Hediyelere Bak
                  </button>

                </Link>

              </div>

            )}


          {/* ==========================================
             ÜRÜNLER
          ========================================== */}

          {!yukleniyor &&
            ilanlar.length > 0 && (

              <div className="special-day-grid">

                {ilanlar.map(
                  (ilan) => (

                    <ProductCard
                      key={ilan.id}
                      ilan={ilan}
                    />

                  )
                )}

              </div>

            )}

        </section>

      </main>

    </>

  );

}


export default SpecialDay;
