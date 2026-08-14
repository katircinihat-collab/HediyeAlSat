import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import ProductCard from "./ProductCard";

function TrendingProducts() {

  const [urunler, setUrunler] = useState([]);

  useEffect(() => {

    async function getir() {

      const snap = await getDocs(collection(db, "ilanlar"));

      const trend = snap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(
          item => item.onay === true && item.oneCikan === true
        );

      setUrunler(trend);

    }

    getir();

  }, []);

  return (

    <section className="trending-products">

      <div className="section-header">

        <h2>🔥 Trend Ürünler</h2>

        <button className="see-all">
          Tümünü Gör →
        </button>

      </div>

      <div className="trending-grid">

        {urunler.map(item => (

          <div key={item.id}>

            <ProductCard ilan={item} />

          </div>

        ))}

      </div>

    </section>

  );

}

export default TrendingProducts;