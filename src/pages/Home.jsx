import SEO from "../components/SEO";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useSearchParams } from "react-router-dom";
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

  const [kategori, setKategori] = useState("");

  const [tip, setTip] = useState("Tümü");

  const [favoriler, setFavoriler] = useState(false);

  const [searchParams] = useSearchParams();

  const arama = searchParams.get("arama") || "";

  const ozelGun = searchParams.get("ozelGun") || "";

  useEffect(() => {

    async function getir() {

      const snap = await getDocs(
        collection(db, "ilanlar")
      );

      console.log("Toplam ilan:", snap.docs.length);

      console.log(
        snap.docs.map(doc => doc.data())
      );

      setIlanlar(
        snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      );

    }

    getir();

  }, []);

  const filtreli = ilanlar.filter((item) => {

    const text = (
      (item.baslik || "") +
      " " +
      (item.aciklama || "") +
      " " +
      (item.kategori || "") +
      " " +
      (item.sehir || "")
    ).toLowerCase();

    const ozelGunUygun =
      !ozelGun ||
      (Array.isArray(item.ozelGunler) &&
        item.ozelGunler.includes(ozelGun));

    return (

      item.onay === true &&

      text.includes(arama.toLowerCase()) &&

      (kategori === "" ||
        item.kategori === kategori) &&

      (tip === "Tümü" ||
        item.tip === tip) &&

      (
        !favoriler ||
        localStorage.getItem("fav_" + item.id) === "true"
      ) &&

      ozelGunUygun

    );

  });

  console.log(
    "Gösterilecek ilan:",
    filtreli.length
  );

  // ⚡ Günün Fırsatları
  const gununFirsatlari =
    filtreli.filter(
      x => x.trend === true
    );

  const gosterTrend =
    gununFirsatlari.length > 0
      ? gununFirsatlari
      : filtreli.slice(0, 20);


  // 🔥 En Çok Satanlar
  const enCokSatan =
    [...filtreli]
      .sort(
        (a, b) =>
          (b.satisSayisi || 0) -
          (a.satisSayisi || 0)
      )
      .slice(0, 20);


  // 🆕 Son Eklenenler
  const sonEklenen =
    [...filtreli]
      .sort((a, b) => {

        const ta =
          a.tarih?.seconds || 0;

        const tb =
          b.tarih?.seconds || 0;

        return tb - ta;

      })
      .slice(0, 20);


  // 👑 Premium Mağazalar
  const premiumMagazalar =
    filtreli.filter(
      x => x.premium === true
    );


  // ⭐ Editörün Seçimi
  const editorSecimi =
    filtreli.filter(
      x => x.oneCikan === true
    );

  const gosterEditor =
    editorSecimi.length > 0
      ? editorSecimi
      : filtreli.slice(0, 20);


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
        setKategori={setKategori}
        favoriler={favoriler}
        setFavoriler={setFavoriler}
      />

      <FilterBar
        favoriler={favoriler}
        setFavoriler={setFavoriler}
      />

      <AdBanner />


      <ProductSlider
        title="⚡ Günün Fırsatları"
        ilanlar={gosterTrend}
      />


      <ProductSlider
        title="🔥 En Çok Satan Hediyeler"
        ilanlar={enCokSatan}
      />


      <ProductSlider
        title="🆕 Yeni Gelen Hediyeler"
        ilanlar={sonEklenen}
      />


      {
        premiumMagazalar.length > 0 &&

        <ProductSlider
          title="👑 Premium Mağazalar"
          ilanlar={premiumMagazalar}
        />
      }


      <ProductSlider
        title="✨ Editörün Seçimi"
        ilanlar={gosterEditor}
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