import "../styles/components/featured-stores.css";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";

function FeaturedStores() {

  const [stores, setStores] = useState([]);

  useEffect(() => {

    async function getir() {

      const snap = await getDocs(collection(db, "magazalar"));

      setStores(
        snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((store) => store.aktif !== false)
      );

    }

    getir();

  }, []);

  return (

    <section className="featured-stores">

      <div className="section-header">

        <h2>🏪 Öne Çıkan Mağazalar</h2>

        <Link to="/magazalar" className="see-all">

          Tümünü Gör →

        </Link>

      </div>

      <div className="stores-grid">

        {stores.map(store => (

          <Link

            key={store.id}

            to={`/magaza/${store.id}`}

            className="store-card"

          >

            <img
              className="store-logo"
              src={store.logo || store.kapak}
              alt={store.magazaAdi}
            />

            <h3>{store.magazaAdi}</h3>

            <p>📍 {store.sehir}</p>

            <div className="store-info">

              <span>
                {Number(store.oySayisi || 0) > 0 && Number(store.puan || 0) > 0
                  ? `⭐ ${store.puan}`
                  : "Yeni Mağaza"}
              </span>

              <span>👥 {store.takipci || 0}</span>

              <span>👁 {store.goruntulenme || 0}</span>

            </div>

            <button>🏪 Mağazaya Git</button>

          </Link>

        ))}

      </div>

    </section>

  );

}

export default FeaturedStores;
