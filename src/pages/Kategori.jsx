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

import "../styles/pages/home.css";


function Kategori() {

  const { kategori } = useParams();

  const navigate = useNavigate();

  const [ilanlar, setIlanlar] =
    useState([]);

  const [loading, setLoading] =
    useState(true);


  const kategoriBilgileri = {

    "cicek": {
      ad: "Çiçek",
      ikon: "🌸"
    },

    "taki-aksesuar": {
      ad: "Takı & Aksesuar",
      ikon: "💍"
    },

    "el-yapimi": {
      ad: "El Yapımı",
      ikon: "🧵"
    },

    "2-el-hediyelik": {
      ad: "2. El Hediyelik",
      ikon: "♻️"
    },

    "kisiye-ozel": {
      ad: "Kişiye Özel",
      ikon: "🎁"
    },

    "organizasyon": {
      ad: "Organizasyon",
      ikon: "🎉"
    },

    "ev-dekorasyonu": {
      ad: "Ev Dekorasyonu",
      ikon: "🏠"
    },

    "oyuncak": {
      ad: "Oyuncak",
      ikon: "🧸"
    },

    "hediye-kutulari": {
      ad: "Hediye Kutuları",
      ikon: "🎀"
    }

  };


  const bilgi =
    kategoriBilgileri[kategori];


  useEffect(() => {

    async function getir() {

      try {

        setLoading(true);


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

              item.kategori === bilgi.ad

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

        ) : ilanlar.length === 0 ? (

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

            ilanlar={ilanlar}

          />

        )}

      </main>


      <Footer />

    </>

  );

}


export default Kategori;
