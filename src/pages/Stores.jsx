import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

import { db } from "../firebase";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "../styles/pages/stores.css";

function Stores() {
  const [stores, setStores] = useState([]);
  const [arama, setArama] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    getirMagazalar();
  }, []);

  async function getirMagazalar() {
    try {
      setYukleniyor(true);

      const snap = await getDocs(
        collection(db, "magazalar")
      );

      const liste = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setStores(liste);
    } catch (error) {
      console.error(
        "Mağazalar alınamadı:",
        error
      );
    } finally {
      setYukleniyor(false);
    }
  }

  const filtreliMagazalar = stores.filter((store) => {
    const metin = (
      (store.magazaAdi || "") +
      " " +
      (store.sehir || "") +
      " " +
      (store.aciklama || "")
    ).toLowerCase();

    return metin.includes(
      arama.toLowerCase()
    );
  });

  return (
    <div className="stores-page">

      <Navbar />

      <main className="stores-container">

        {/* ANA SAYFA */}

        <Link
          to="/"
          className="stores-home-link"
        >
          ← Ana Sayfa
        </Link>


        {/* BAŞLIK */}

        <div className="stores-header">

          <div>

            <span className="stores-badge">
              🏪 HEDİYE ALSAT
            </span>

            <h1>
              Tüm Mağazalar
            </h1>

            <p>
              HediyeAlSat'taki birbirinden güzel
              mağazaları keşfet.
            </p>

          </div>

          <div className="stores-count">

            <strong>
              {stores.length}
            </strong>

            <span>
              Mağaza
            </span>

          </div>

        </div>


        {/* ARAMA */}

        <div className="stores-search">

          <span>🔍</span>

          <input
            type="text"
            placeholder="Mağaza ara..."
            value={arama}
            onChange={(e) =>
              setArama(e.target.value)
            }
          />

        </div>


        {/* YÜKLENİYOR */}

        {yukleniyor ? (

          <div className="stores-loading">

            <div className="stores-loading-icon">
              ⏳
            </div>

            <h3>
              Mağazalar yükleniyor...
            </h3>

          </div>

        ) : filtreliMagazalar.length === 0 ? (

          <div className="stores-empty">

            <div className="stores-empty-icon">
              🏪
            </div>

            <h3>
              Mağaza bulunamadı
            </h3>

            <p>
              Arama kriterlerinizi değiştirmeyi
              deneyin.
            </p>

          </div>

        ) : (

          <div className="stores-grid">

            {filtreliMagazalar.map((store) => (

              <Link
                key={store.id}
                to={`/magaza/${store.id}`}
                className="stores-card"
              >

                {/* LOGO */}

                <div className="stores-card-logo">

                  {store.logo || store.kapak ? (

                    <img
                      src={
                        store.logo ||
                        store.kapak
                      }
                      alt={
                        store.magazaAdi ||
                        "Mağaza"
                      }
                    />

                  ) : (

                    <div className="stores-card-no-logo">
                      🏪
                    </div>

                  )}

                </div>


                {/* İÇERİK */}

                <div className="stores-card-content">

                  <h2>
                    {store.magazaAdi ||
                      "Mağaza"}
                  </h2>

                  <p className="stores-card-city">
                    📍{" "}
                    {store.sehir ||
                      "Türkiye"}
                  </p>


                  {store.aciklama && (

                    <p className="stores-card-description">

                      {store.aciklama.length > 80
                        ? store.aciklama.slice(0, 80) + "..."
                        : store.aciklama}

                    </p>

                  )}


                  {/* BİLGİLER */}

                  <div className="stores-card-info">

                    <span>
                      {Number(store.oySayisi || 0) > 0 && Number(store.puan || 0) > 0
                        ? `⭐ ${store.puan}`
                        : "Yeni Mağaza"}
                    </span>

                    <span>
                      👥 {store.takipci || 0}
                    </span>

                    <span>
                      👁 {store.goruntulenme || 0}
                    </span>

                  </div>


                  {/* MAĞAZAYA GİT */}

                  <div className="stores-card-button">

                    <span>
                      🏪 Mağazaya Git
                    </span>

                    <span>
                      →
                    </span>

                  </div>

                </div>

              </Link>

            ))}

          </div>

        )}

      </main>

      <Footer />

    </div>
  );
}

export default Stores;
