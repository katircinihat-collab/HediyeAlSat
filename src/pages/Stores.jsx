import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";

import { db } from "../firebase";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "../styles/pages/stores.css";
import { activeStoreSponsorMap, sortStoresBySponsor, sponsorTierLabel } from "../utils/sponsoredContent";

function Stores() {
  const [stores, setStores] = useState([]);
  const [arama, setArama] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [sponsors, setSponsors] = useState(new Map());

  useEffect(() => {
    getirMagazalar();
  }, []);

  async function getirMagazalar() {
    try {
      setYukleniyor(true);

      const [snap, sponsorSnap] = await Promise.all([
        getDocs(collection(db, "magazalar")),
        getDocs(query(collection(db, "sponsoredContent"), where("active", "==", true), limit(50)))
      ]);

      const liste = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((store) => store.aktif !== false);

      const sponsorMap = activeStoreSponsorMap(sponsorSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setSponsors(sponsorMap);
      setStores(sortStoresBySponsor(liste, sponsorMap));
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
                className={`stores-card ${sponsors.has(store.id) ? `stores-card--sponsor stores-card--sponsor-${sponsors.get(store.id).tier}` : ""}`}
              >
                {sponsors.has(store.id) && <span className="stores-sponsor-badge">{sponsorTierLabel(sponsors.get(store.id).tier)}</span>}

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
