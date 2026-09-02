
import SEO from "../components/SEO";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  Link,
  useSearchParams
} from "react-router-dom";

import { db } from "../firebase";
import {
  getListingMainCategory,
  getListingSubcategory,
  isA4Listing,
  isLegacySecondHandListing,
  matchesMainCategory
} from "../data/categories";

import Navbar from "../components/Navbar";
import FlashSale from "../components/FlashSale";
import CategoryBar from "../components/CategoryBar";
import FilterBar from "../components/FilterBar";
import AdBanner from "../components/AdBanner";
import ProductSlider from "../components/ProductSlider";
import FeaturedStores from "../components/FeaturedStores";
import SpecialDays from "../components/SpecialDays";
import GiftAssistant from "../components/GiftAssistant";
import Stats from "../components/Stats";
import Footer from "../components/Footer";
import TopDesignShowcase from "../components/TopDesignShowcase";
import GiftBattle from "../components/GiftBattle";

import "../styles/pages/home.css";


function Home() {

  const [ilanlar, setIlanlar] = useState([]);

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

        if (isA4Listing(item) || isLegacySecondHandListing(item)) {
          return false;
        }

        const text =
          (
            (item.baslik || "") +
            " " +
            (item.aciklama || "") +
            " " +
            (item.kategori || "") +
            " " +
            getListingMainCategory(item) +
            " " +
            getListingSubcategory(item) +
            " " +
            (item.sehir || "")
          ).toLowerCase();


        const aramaUygun =
          text.includes(
            arama.toLowerCase()
          );


        const kategoriUygun =
          !kategori ||
          matchesMainCategory(item, kategori);


        const tipUygun =
          tip === "Tümü" ||
          item.tip === tip;


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

      />


      <FilterBar />


      <AdBanner />

      <section className="shopping-hubs" aria-label="Özel alışveriş bölümleri">
        <article className="shopping-hub-card shopping-hub-card-budget">
          <span className="shopping-hub-icon">💯</span>
          <div>
            <h2>Ne Alırsan 100 TL</h2>
            <p>100 TL ve altındaki hediyeleri keşfet.</p>
          </div>
          <Link to="/100-tl-alti">Ürünleri Gör</Link>
        </article>

        <article className="shopping-hub-card shopping-hub-card-design">
          <span className="shopping-hub-icon">🎨</span>
          <div>
            <h2>A4 Tasarım Pazarı</h2>
            <p>Özgün poster ve A4 tasarımları keşfet.</p>
          </div>
          <Link to="/a4-tasarimlar">Tasarımları Gör</Link>
        </article>
      </section>

      <TopDesignShowcase />


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


      <GiftBattle />


      <GiftAssistant />


      <Stats />


      <Footer />

    </>

  );

}


export default Home;
