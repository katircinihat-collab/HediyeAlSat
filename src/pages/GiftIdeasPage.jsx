
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";

import { db } from "../firebase";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";

import "../styles/pages/gift-ideas-page.css";

function GiftIdeasPage() {

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
          }));

        setIlanlar(liste);

      } catch (error) {

        console.error(
          "Hediye fikirleri alınamadı:",
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

      <main className="gift-ideas-page">

        <div className="gift-ideas-container">

          <Link
            to="/"
            className="gift-ideas-back"
          >
            ← Ana Sayfaya Dön
          </Link>

          <header className="gift-ideas-header">

            <div className="gift-ideas-icon">
              🎁
            </div>

            <div>
              <h1>
                Hediye Fikirleri
              </h1>

              <p>
                Sevdiklerinize en güzel hediyeleri keşfedin.
              </p>
            </div>

          </header>

          {yukleniyor ? (

            <div className="gift-ideas-loading">
              ⏳ Hediyeler yükleniyor...
            </div>

          ) : (

            <div className="gift-ideas-grid">

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

export default GiftIdeasPage;
