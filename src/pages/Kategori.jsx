import SEO from "../components/SEO";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";

import {
  useParams,
  useNavigate
} from "react-router-dom";

import { db } from "../firebase";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProductSlider from "../components/ProductSlider";
import {
  getCategoryBySlug,
  getDefaultSubcategoryForSlug,
  getListingSubcategory,
  isLegacySecondHandListing,
  matchesMainCategory
} from "../data/categories";

import "../styles/pages/home.css";


function Kategori() {

  const { kategori } = useParams();

  const navigate = useNavigate();

  const [ilanlar, setIlanlar] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [altKategori, setAltKategori] =
    useState(() => getDefaultSubcategoryForSlug(kategori));

  const categoryDefinition =
    getCategoryBySlug(kategori);

  const bilgi = categoryDefinition
    ? {
        ad: categoryDefinition.name,
        ikon: categoryDefinition.icon,
        altKategoriler: categoryDefinition.subcategories
      }
    : null;


  useEffect(() => {

    async function getir() {

      try {

        setLoading(true);
        setAltKategori(getDefaultSubcategoryForSlug(kategori));


        const snap =
          await getDocs(
            query(
              collection(db, "ilanlar"),
              where("onay", "==", true)
            )
          );


        const veriler =
          snap.docs.map(
            (doc) => ({

              id: doc.id,

              ...doc.data()

            })
          );


        if (!bilgi) {

          setIlanlar([]);

          return;

        }


        const sonuc =
          veriler.filter(
            (item) =>

              !isLegacySecondHandListing(item) &&
              matchesMainCategory(item, bilgi.ad)

          );


        setIlanlar(sonuc);


      } catch (error) {

        console.error(
          "Kategori ilanları alınamadı:",
          error
        );

      } finally {

        setLoading(false);

      }

    }


    getir();

    // Category slug is the intended trigger; `bilgi` is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kategori]);

  const gorunenIlanlar = ilanlar.filter((ilan) =>
    !altKategori || getListingSubcategory(ilan) === altKategori
  );


  if (!bilgi) {

    return (

      <>

        <Navbar />

        <main
          style={{
            padding: "60px 20px",
            textAlign: "center"
          }}
        >

          <h1>Kategori bulunamadı</h1>

          <p>
            Aradığınız kategori mevcut değil.
          </p>

          <button
            onClick={() =>
              navigate("/")
            }
          >
            Ana Sayfaya Dön
          </button>

        </main>

        <Footer />

      </>

    );

  }


  return (

    <>

      <SEO

        title={`${bilgi.ad} | HediyeAlSat`}

        description={`${bilgi.ad} kategorisindeki hediye ürünlerini HediyeAlSat'ta keşfedin.`}

        canonical={`https://hediyealsat.com/kategori/${kategori}`}

        image="https://hediyealsat.com/logo192.png"

      />


      <Navbar />


      <main
        style={{
          minHeight: "60vh",
          paddingBottom: "40px"
        }}
      >

        <div
          style={{
            padding: "30px 20px 10px",
            maxWidth: "1400px",
            margin: "0 auto"
          }}
        >

          <button
            onClick={() =>
              navigate("/")
            }
            style={{
              marginBottom: "20px",
              cursor: "pointer"
            }}
          >
            ← Ana Sayfaya Dön
          </button>


          <h1>
            {bilgi.ikon} {bilgi.ad}
          </h1>


          <p>
            {bilgi.ad} kategorisindeki
            ürünleri keşfedin.
          </p>

          <label htmlFor="alt-kategori-filtre">
            Alt Kategori
          </label>

          <select
            id="alt-kategori-filtre"
            value={altKategori}
            onChange={(event) => setAltKategori(event.target.value)}
          >
            <option value="">Tüm Alt Kategoriler</option>
            {bilgi.altKategoriler.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

        </div>


        {loading ? (

          <div
            style={{
              textAlign: "center",
              padding: "50px"
            }}
          >

            <h3>
              Ürünler yükleniyor...
            </h3>

          </div>

        ) : gorunenIlanlar.length === 0 ? (

          <div
            style={{
              textAlign: "center",
              padding: "50px 20px"
            }}
          >

            <h2>
              Bu kategoride henüz ilan yok.
            </h2>

            <p>
              Yakında yeni ürünler eklenecek.
            </p>

          </div>

        ) : (

          <ProductSlider

            title={`${bilgi.ikon} ${bilgi.ad} Ürünleri`}

            ilanlar={gorunenIlanlar}

          />

        )}

      </main>


      <Footer />

    </>

  );

}


export default Kategori;
