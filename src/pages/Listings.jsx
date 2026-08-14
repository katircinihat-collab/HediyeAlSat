import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import Footer from "../components/Footer";

import "../styles/pages/product.css";

function Listings() {

  const [ilanlar, setIlanlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {

    async function getir() {

      try {

        const snap = await getDocs(
          collection(db, "ilanlar")
        );

        const veriler = snap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter((ilan) => ilan.onay === true);

        setIlanlar(veriler);

      } catch (error) {

        console.error(
          "İlanlar alınamadı:",
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

      <main
        style={{
          maxWidth: "1850px",
          margin: "40px auto",
          padding: "0 20px"
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px"
          }}
        >

          <div>

            <h1
              style={{
                margin: 0,
                fontSize: "34px"
              }}
            >
              📦 Tüm İlanlar
            </h1>

            <p
              style={{
                color: "#777",
                marginTop: "8px"
              }}
            >
              HediyeAlSat'taki güncel ürünleri keşfet
            </p>

          </div>

          <strong>
            {ilanlar.length} İlan
          </strong>

        </div>


        {yukleniyor ? (

          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              fontSize: "20px"
            }}
          >
            ⏳ İlanlar yükleniyor...
          </div>

        ) : ilanlar.length === 0 ? (

          <div
            style={{
              textAlign: "center",
              padding: "80px 20px"
            }}
          >

            <h2>
              📦 Henüz ilan bulunmuyor
            </h2>

            <p>
              Onaylanmış ilanlar burada görünecek.
            </p>

          </div>

        ) : (

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "25px"
            }}
          >

            {ilanlar.map((ilan) => (

              <ProductCard
                key={ilan.id}
                ilan={ilan}
              />

            ))}

          </div>

        )}

      </main>

      <Footer />

    </>

  );

}

export default Listings;