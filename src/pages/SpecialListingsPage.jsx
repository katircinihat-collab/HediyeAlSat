import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import Footer from "../components/Footer";
import "../styles/pages/special-listings.css";

function fiyatSayiyaCevir(deger) {
  if (typeof deger === "number") return Number.isFinite(deger) ? deger : null;

  let metin = String(deger ?? "").replace(/[^\d,.-]/g, "").trim();
  if (!/\d/.test(metin)) return null;

  if (metin.includes(",") && metin.includes(".")) {
    metin = metin.lastIndexOf(",") > metin.lastIndexOf(".")
      ? metin.replace(/\./g, "").replace(",", ".")
      : metin.replace(/,/g, "");
  } else if (metin.includes(",")) {
    metin = metin.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(metin)) {
    metin = metin.replace(/\./g, "");
  }

  const fiyat = Number(metin);
  return Number.isFinite(fiyat) ? fiyat : null;
}

function SpecialListingsPage({ tur }) {
  const [ilanlar, setIlanlar] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yuzTlSayfasi = tur === "100-tl";
  const baslik = yuzTlSayfasi ? "💯 Ne Alırsan 100 TL" : "🎨 A4 Tasarım Pazarı";
  const aciklama = yuzTlSayfasi
    ? "100 TL ve altındaki uygun fiyatlı hediyeleri keşfet."
    : "Özgün A4 poster ve tasarımları keşfet.";

  useEffect(() => {
    async function getir() {
      try {
        const snap = await getDocs(
          query(collection(db, "ilanlar"), where("onay", "==", true))
        );

        const liste = snap.docs
          .map((belge) => ({ id: belge.id, ...belge.data() }))
          .filter((ilan) => ilan.aktif !== false)
          .filter((ilan) => {
            if (!yuzTlSayfasi) return ilan.kategori === "A4 Tasarım";

            const fiyat = fiyatSayiyaCevir(ilan.fiyat);
            return fiyat !== null && fiyat >= 0 && fiyat <= 100;
          });

        setIlanlar(liste);
      } catch (error) {
        console.error(`${baslik} ilanları alınamadı:`, error);
      } finally {
        setYukleniyor(false);
      }
    }

    getir();
  }, [baslik, yuzTlSayfasi]);

  return (
    <>
      <Navbar />
      <main className="special-listings-page">
        <header className="special-listings-header">
          <div>
            <h1>{baslik}</h1>
            <p>{aciklama}</p>
          </div>
          {!yukleniyor && <strong>{ilanlar.length} İlan</strong>}
        </header>

        {yukleniyor ? (
          <div className="special-listings-state">⏳ İlanlar yükleniyor...</div>
        ) : ilanlar.length === 0 ? (
          <div className="special-listings-state">
            <h2>{yuzTlSayfasi ? "💯" : "🎨"} Henüz ürün bulunmuyor</h2>
            <p>Bu bölüme uygun yeni ilanlar yakında burada görünecek.</p>
          </div>
        ) : (
          <div className="special-listings-grid">
            {ilanlar.map((ilan) => <ProductCard key={ilan.id} ilan={ilan} />)}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default SpecialListingsPage;
