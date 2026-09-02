import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import ProductCard from "./ProductCard";
import { isA4Listing, isLegacySecondHandListing } from "../data/categories";

function BestSellers() {

  const [urunler, setUrunler] = useState([]);

  useEffect(() => {

    async function getir() {

      const snap = await getDocs(
        query(collection(db, "ilanlar"), where("onay", "==", true))
      );

      const liste = snap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((item) => !isLegacySecondHandListing(item) && !isA4Listing(item))
        .sort((a, b) => (b.satisSayisi || 0) - (a.satisSayisi || 0))
        .slice(0, 8);

      setUrunler(liste);

    }

    getir();

  }, []);

  return (

    <section className="best-sellers">

      <h2>⭐ En Çok Satan Hediyeler</h2>

      <div className="best-grid">

        {urunler.map(item => (

          <ProductCard
            key={item.id}
            ilan={item}
          />

        ))}

      </div>

    </section>

  );

}

export default BestSellers;
