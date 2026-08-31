
import SEO from "../components/SEO";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  useSearchParams
} from "react-router-dom";

import { db } from "../firebase";

import Navbar from "../components/Navbar";
import FlashSale from "../components/FlashSale";
import CategoryBar from "../components/CategoryBar";
import FilterBar from "../components/FilterBar";
import AdBanner from "../components/AdBanner";
import ProductSlider from "../components/ProductSlider";
import FeaturedStores from "../components/FeaturedStores";
import SpecialDays from "../components/SpecialDays";
import UpcomingEvents from "../components/UpcomingEvents";
import GiftAssistant from "../components/GiftAssistant";
import Stats from "../components/Stats";
import Footer from "../components/Footer";

import "../styles/pages/home.css";


function Home() {

  const [ilanlar, setIlanlar] = useState([]);

  const [favoriler, setFavoriler] = useState(false);

  const [searchParams, setSearchParams] =
    useSearchParams();


  /*
  ==================================================
  URL'DEN FİLTRELERİ AL
  ==================================================
  */

  const kategori =
    searchParams.get("kategori") || "";

  const tip =
    searchParams.get("tip") || "Tümü";

  const arama =
    searchParams.get("arama") || "";

  const ozelGun =
    searchParams.get("ozelGun") || "";


  /*
  ==================================================
  KATEGORİ DEĞİŞTİR
  ==================================================
  */

  function kategoriDegistir(yeniKategori) {

    console.log(
      "Kategori değiştirildi:",
      yeniKategori
    );


    const yeniParams =
      new URLSearchParams(searchParams);


    if (yeniKategori) {

      yeniParams.set(
        "kategori",
        yeniKategori
      );

    } else {

      yeniParams.delete("kategori");

    }


    setSearchParams(
      yeniParams,
      {
        replace: true
      }
    );

  }


  /*
  ==================================================
  İLANLARI GETİR
  ==================================================
  */

  useEffect(() => {

    async function getir() {

      try {

        const snap =
          await getDocs(
            query(
              collection(db, "ilanlar"),
              where("onay", "==", true)
            )
          );


        console.log(
          "Toplam ilan:",
          snap.docs.length
        );


        const veriler =
          snap.docs.map(
            (doc) => ({

              id: doc.id,

              ...doc.data()

            })
          );


        setIlanlar(
          veriler
        );

      } catch (error) {

        console.error(
          "İlanlar alınamadı:",
          error
        );

      }

    }


    getir();

  }, []);


  /*
  ==================================================
  FİLTRELE
  ==================================================
  */

  const filtreli =
    ilanlar.filter(
      (item) => {

        const text =
          (
            (item.baslik || "") +
            " " +
            (item.aciklama || "") +
            " " +
            (item.kategori || "") +
            " " +
            (item.sehir || "")
          ).toLowerCase();


        const aramaUygun =
          text.includes(
            arama.toLowerCase()
          );


        const kategoriUygun =
          !kategori ||
          item.kategori === kategori;


        const tipUygun =
          tip === "Tümü" ||
          item.tip === tip;


        const favoriUygun =
          !favoriler ||
          localStorage.getItem(
            "fav_" + item.id
          ) === "true";


        const ozelGunUygun =
          !ozelGun ||
          (
            Array.isArray(
              item.ozelGunler
            ) &&
            item.ozelGunler.includes(
              ozelGun
            )
          );


        return (

          aramaUygun &&

          kategoriUygun &&

          tipUygun &&

          favoriUygun &&

          ozelGunUygun

        );

      }
    );


  /*
  ==================================================
  KONSOL KONTROLÜ
  ==================================================
  */

  console.log(
    "Aktif kategori:",
    kategori
  );

  console.log(
    "Gösterilecek ilan:",
    filtreli.length
  );


  /*
  ==================================================
  GÜNÜN FIRSATLARI
  ==================================================
  */

  const gununFirsatlari =
    filtreli.filter(
      (x) =>
        x.trend === true
    );


  const gosterTrend =
    gununFirsatlari.length > 0
      ? gununFirsatlari
      : filtreli.slice(
          0,
          20
        );


  /*
  ==================================================
  EN ÇOK SATANLAR
  ==================================================
  */

  const enCokSatan =
    [...filtreli]
      .sort(
        (a, b) =>
          (b.satisSayisi || 0) -
          (a.satisSayisi || 0)
      )
      .slice(
        0,
        20
      );


  /*
  ==================================================
  SON EKLENENLER
  ==================================================
  */

  const sonEklenen =
    [...filtreli]
      .sort(
        (a, b) => {

          const ta =
            a.tarih?.seconds || 0;


          const tb =
            b.tarih?.seconds || 0;


          return tb - ta;

        }
      )
      .slice(
        0,
        20
      );


  /*
  ==================================================
  PREMIUM MAĞAZALAR
  ==================================================
  */

  const premiumMagazalar =
    filtreli.filter(
      (x) =>
        x.premium === true
    );


  /*
  ==================================================
  EDİTÖRÜN SEÇİMİ
  ==================================================
  */

  const editorSecimi =
    filtreli.filter(
      (x) =>
        x.oneCikan === true
    );


  const gosterEditor =
    editorSecimi.length > 0
      ? editorSecimi
      : filtreli.slice(
          0,
          20
        );


  /*
  ==================================================
  SAYFA
  ==================================================
  */

  return (

    <>

      <SEO

        title="HediyeAlSat | Türkiye'nin Hediye Pazaryeri"

        description="Türkiye'nin en yeni hediye pazaryeri. El yapımı ürünler, butik mağazalar ve binlerce hediye ilanı HediyeAlSat'ta."

        canonical="https://hediyealsat.com/"

        image="https://hediyealsat.com/logo192.png"

      />


      <Navbar />


      <FlashSale />


      <CategoryBar

        kategori={
          kategori
        }

        setKategori={
          kategoriDegistir
        }

        favoriler={
          favoriler
        }

        setFavoriler={
          setFavoriler
        }

      />


      <FilterBar

        favoriler={
          favoriler
        }

        setFavoriler={
          setFavoriler
        }

      />


      <AdBanner />


      <ProductSlider

        title="⚡ Günün Fırsatları"

        ilanlar={
          gosterTrend
        }

      />


      <ProductSlider

        title="🔥 En Çok Satan Hediyeler"

        ilanlar={
          enCokSatan
        }

      />


      <ProductSlider

        title="🆕 Yeni Gelen Hediyeler"

        ilanlar={
          sonEklenen
        }

      />


      {
        premiumMagazalar.length > 0 &&

        <ProductSlider

          title="👑 Premium Mağazalar"

          ilanlar={
            premiumMagazalar
          }

        />

      }


      <ProductSlider

        title="✨ Editörün Seçimi"

        ilanlar={
          gosterEditor
        }

      />


      <FeaturedStores />


      <SpecialDays />


      <UpcomingEvents />


      <GiftAssistant />


      <Stats />


      <Footer />

    </>

  );

}


export default Home;
