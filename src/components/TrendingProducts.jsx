import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import ProductCard from "./ProductCard";
import { isA4Listing, isLegacySecondHandListing } from "../data/categories";

function TrendingProducts() {

  const [urunler, setUrunler] = useState([]);

  useEffect(() => {

    async function getir() {

      const snap = await getDocs(
        query(collection(db, "ilanlar"), where("onay", "==", true))
      );

      const trend = snap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(item => item.oneCikan === true && !isLegacySecondHandListing(item) && !isA4Listing(item));

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
