import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import Footer from "../components/Footer";
import CategoryBar from "../components/CategoryBar";
import categories, {
  getListingSubcategory,
  isLegacySecondHandListing,
  matchesMainCategory
} from "../data/categories";

import "../styles/pages/product.css";

function Listings() {

  const [ilanlar, setIlanlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Seçilen kategori
  const [kategori, setKategori] = useState("");
  const [altKategori, setAltKategori] = useState("");

  // Favoriler
  const [favoriler, setFavoriler] = useState(false);

  useEffect(() => {

    async function getir() {

      try {

        const snap = await getDocs(
          query(collection(db, "ilanlar"), where("onay", "==", true))
        );

        const veriler = snap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));

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


  /*
  ================================================
  FİLTRELEME
  ================================================
  */

  const filtrelenmisIlanlar = ilanlar.filter((ilan) => {

    if (isLegacySecondHandListing(ilan)) {
      return false;
    }

    // Kategori filtresi
    if (
      kategori &&
      !matchesMainCategory(ilan, kategori)
    ) {

      return false;

    }

    if (
      altKategori &&
      getListingSubcategory(ilan) !== altKategori
    ) {
      return false;
    }

    // Favoriler filtresi
    if (favoriler && !ilan.favori) {

      return false;

    }

    return true;

  });


  return (

    <>

      <Navbar />


      {/* KATEGORİLER */}

      <CategoryBar

        setKategori={(yeniKategori) => {
          setKategori(yeniKategori);
          setAltKategori("");
        }}

        favoriler={favoriler}

        setFavoriler={setFavoriler}

      />

      {kategori && (
        <div style={{ maxWidth: "1850px", margin: "20px auto 0", padding: "0 20px" }}>
          <label htmlFor="listings-alt-kategori">Alt Kategori</label>
          <select
            id="listings-alt-kategori"
            value={altKategori}
            onChange={(event) => setAltKategori(event.target.value)}
          >
            <option value="">Tüm Alt Kategoriler</option>
            {(categories[kategori] || []).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      )}


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

            {filtrelenmisIlanlar.length} İlan

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

        ) : filtrelenmisIlanlar.length === 0 ? (

          <div
            style={{
              textAlign: "center",
              padding: "80px 20px"
            }}
          >

            <h2>

              📦 İlan bulunamadı

            </h2>


            <p>

              Bu kategoride henüz onaylanmış ilan bulunmuyor.

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

            {filtrelenmisIlanlar.map((ilan) => (

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
