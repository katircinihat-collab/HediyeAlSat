import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import Footer from "../components/Footer";
import "../styles/pages/special-listings.css";
import {
  isA4Listing,
  isLegacySecondHandListing
} from "../data/categories";

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
            if (!yuzTlSayfasi) return isA4Listing(ilan);

            if (isLegacySecondHandListing(ilan)) return false;

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

  const oneCikanA4Tasarımları = yuzTlSayfasi ? [] : ilanlar.slice(0, 8);
  const digerA4Tasarımları = yuzTlSayfasi ? [] : ilanlar.slice(8);

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

        {!yuzTlSayfasi && (
          <section className="a4-market-intro" aria-labelledby="a4-intro-title">
            <div className="a4-market-copy">
              <h2 id="a4-intro-title">
                Hayalindeki tasarımı hazırla, HediyeAlSat&apos;ta satışa sun.
              </h2>
              <p>
                Photoshop, Canva veya kullandığın diğer tasarım araçlarıyla
                hazırladığın özgün A4 tasarımlarını mağazanda sergileyebilirsin.
              </p>
              <p>
                Poster, özel gün tasarımları, dekoratif çalışmalar, kişiye özel
                tasarımlar ve kendi hazırladığın özgün görselleri A4 Tasarım
                Pazarı&apos;nda müşterilerle buluştur.
              </p>
            </div>

            <div className="a4-how-it-works">
              <h2>Nasıl Çalışır?</h2>
              <div className="a4-steps-grid">
                <article>
                  <span>🎨</span>
                  <h3>Tasarımını Hazırla</h3>
                  <p>Photoshop, Canva veya tercih ettiğin tasarım programıyla özgün çalışmanı oluştur.</p>
                </article>
                <article>
                  <span>🏪</span>
                  <h3>Mağazana Ekle</h3>
                  <p>İlan verirken A4 Tasarım kategorisini seç ve çalışmanı mağazana ekle.</p>
                </article>
                <article>
                  <span>💰</span>
                  <h3>Fiyatını Belirle</h3>
                  <p>Tasarımının satış fiyatını kendin belirle.</p>
                </article>
                <article>
                  <span>🛍️</span>
                  <h3>Satışa Sun</h3>
                  <p>Onaylanan tasarımın A4 Tasarım Pazarı&apos;nda müşterilere gösterilsin.</p>
                </article>
              </div>
            </div>

            <aside className="a4-originality-note">
              <h2>🛡️ Özgün Tasarımlar</h2>
              <p>
                A4 Tasarım Pazarı yalnızca satış ve kullanım hakkı size ait olan
                çalışmalar içindir.
              </p>
              <p>
                Başkasına ait fotoğraf, çizim, marka, logo, karakter veya telif
                hakkıyla korunan içerikleri gerekli haklara sahip olmadan satışa sunmayın.
              </p>
            </aside>

            <Link className="a4-seller-cta" to="/ilan-ver">
              🎨 Tasarımını Satışa Sun
            </Link>
          </section>
        )}

        {yukleniyor ? (
          <div className="special-listings-state">⏳ İlanlar yükleniyor...</div>
        ) : ilanlar.length === 0 ? (
          <div className="special-listings-state">
            <h2>{yuzTlSayfasi ? "💯" : "🎨"} Henüz ürün bulunmuyor</h2>
            <p>Bu bölüme uygun yeni ilanlar yakında burada görünecek.</p>
          </div>
        ) : yuzTlSayfasi ? (
          <div className="special-listings-grid">
            {ilanlar.map((ilan) => <ProductCard key={ilan.id} ilan={ilan} />)}
          </div>
        ) : (
          <div className="a4-products-sections">
            <section>
              <h2 className="a4-products-title">✨ Öne Çıkan A4 Tasarımları</h2>
              <div className="a4-showcase-grid">
                {oneCikanA4Tasarımları.map((ilan) => (
                  <ProductCard key={ilan.id} ilan={ilan} />
                ))}
              </div>
            </section>

            {digerA4Tasarımları.length > 0 && (
              <section className="a4-all-designs">
                <h2 className="a4-products-title">🎨 Tüm A4 Tasarımları</h2>
                <div className="a4-showcase-grid">
                  {digerA4Tasarımları.map((ilan) => (
                    <ProductCard key={ilan.id} ilan={ilan} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default SpecialListingsPage;
