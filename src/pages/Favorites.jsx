import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import { auth, db } from "../firebase";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProductCard from "../components/ProductCard";
import "../styles/pages/profile.css";

function Favorites() {
  const navigate = useNavigate();
  const [favoriler, setFavoriler] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    let favoriDinleyici = null;
    let aktif = true;

    const authDinleyici = onAuthStateChanged(auth, (user) => {
      if (favoriDinleyici) favoriDinleyici();

      if (!user) {
        setYukleniyor(false);
        navigate("/login", { replace: true });
        return;
      }

      const favoriSorgusu = query(
        collection(db, "favoriler"),
        where("kullanici", "==", user.email)
      );

      favoriDinleyici = onSnapshot(
        favoriSorgusu,
        async (snapshot) => {
          const favoriBelgeleri = snapshot.docs.map((favorite) => ({
            favoriId: favorite.id,
            ...favorite.data()
          }));
          const ilanIds = [
            ...new Set(
              favoriBelgeleri
                .map((favorite) => favorite.ilanId)
                .filter(Boolean)
            )
          ];

          const ilanSonuclari = await Promise.allSettled(
            ilanIds.map(async (ilanId) => {
              const ilanSnapshot = await getDoc(doc(db, "ilanlar", ilanId));
              return ilanSnapshot.exists()
                ? { id: ilanSnapshot.id, ...ilanSnapshot.data() }
                : null;
            })
          );

          if (!aktif) return;

          const guncelIlanlar = ilanSonuclari
              .filter((result) => result.status === "fulfilled" && result.value)
              .map((result) => ({
                key: `ilan-${result.value.id}`,
                ilan: result.value,
                legacy: false
              }));

          const legacyFavoriler = favoriBelgeleri
            .filter((favorite) => !favorite.ilanId && favorite.baslik)
            .map((favorite) => ({
              key: `legacy-${favorite.favoriId}`,
              ilan: favorite,
              legacy: true
            }));

          setFavoriler([...guncelIlanlar, ...legacyFavoriler]);
          setYukleniyor(false);
        },
        (error) => {
          console.error("Favoriler alınamadı:", error);
          if (aktif) setYukleniyor(false);
        }
      );
    });

    return () => {
      aktif = false;
      authDinleyici();
      if (favoriDinleyici) favoriDinleyici();
    };
  }, [navigate]);

  return (
    <>
      <Navbar />
      <main className="favorites-page">
        <header className="favorites-header">
          <h1>❤️ Favorilerim</h1>
          <p>Beğendiğiniz ürünleri burada kolayca takip edebilirsiniz.</p>
        </header>

        {yukleniyor ? (
          <div className="favorites-state">Favoriler yükleniyor...</div>
        ) : favoriler.length === 0 ? (
          <section className="favorites-empty">
            <span>♡</span>
            <h2>Henüz favori ürününüz yok.</h2>
            <p>Beğendiğiniz ürünleri kalp simgesine dokunarak kaydedebilirsiniz.</p>
            <Link to="/ilanlar">Ürünleri keşfet</Link>
          </section>
        ) : (
          <div className="favorites-grid">
            {favoriler.map(({ key, ilan, legacy }) =>
              legacy ? (
                <article className="legacy-favorite-card" key={key}>
                  {ilan.resim && <img src={ilan.resim} alt={ilan.baslik} />}
                  <div>
                    <h2>{ilan.baslik}</h2>
                    <strong>{Number(ilan.fiyat || 0).toLocaleString("tr-TR")} TL</strong>
                    {ilan.sehir && <p>📍 {ilan.sehir}</p>}
                    <small>Eski favori kaydı</small>
                  </div>
                </article>
              ) : (
                <ProductCard key={key} ilan={ilan} />
              )
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default Favorites;
