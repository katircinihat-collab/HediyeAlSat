
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";

import { db } from "../firebase";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import { isA4Listing, isLegacySecondHandListing } from "../data/categories";

import "../styles/pages/flash-sale-page.css";

function FlashSalePage() {

  const [ilanlar, setIlanlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {

    async function getir() {

      try {

        const snap = await getDocs(
          query(collection(db, "ilanlar"), where("onay", "==", true))
        );

        const liste = snap.docs
          .map((d) => ({
            id: d.id,
            ...d.data()
          }))
          .filter((ilan) =>
            ilan.trend === true &&
            !isLegacySecondHandListing(ilan) &&
            !isA4Listing(ilan)
          );

        setIlanlar(liste);

      } catch (error) {

        console.error(
          "Günün fırsatları alınamadı:",
          error
        );

      } finally {

        setYukleniyor(false);

      }

    }

    getir();

  }, []);

  return (
    <>
      <Navbar />

      <main className="flash-sale-page">

        <div className="flash-sale-page-container">

          <Link
            to="/"
            className="flash-sale-back"
          >
            ← Ana Sayfaya Dön
          </Link>

          <header className="flash-sale-page-header">

            <div className="flash-sale-page-icon">
              ⚡
            </div>

            <div>
              <h1>
                Günün Fırsatları
              </h1>

              <p>
                Bugüne özel fırsatları kaçırmayın.
              </p>
            </div>

          </header>

          {yukleniyor ? (

            <div className="flash-sale-loading">
              ⏳ Ürünler yükleniyor...
            </div>

          ) : ilanlar.length === 0 ? (

            <div className="flash-sale-empty">

              <div>🎁</div>

              <h2>
                Şu anda fırsat bulunmuyor
              </h2>

              <p>
                Günün fırsatları yakında burada olacak.
              </p>

            </div>

          ) : (

            <div className="flash-sale-grid">

              {ilanlar.map((ilan) => (

                <ProductCard
                  key={ilan.id}
                  ilan={ilan}
                />

              ))}

            </div>

          )}

        </div>

      </main>
    </>
  );
}

export default FlashSalePage;
