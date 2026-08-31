import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from "firebase/firestore";
import { auth, db } from "../firebase";

function Store() {

  const { id } = useParams();

  const [urunler, setUrunler] = useState([]);
  const [arama, setArama] = useState("");
  const [takipEdiyor, setTakipEdiyor] = useState(false);
  const [takipciSayisi, setTakipciSayisi] = useState(0);

  useEffect(() => {

    getir();
    takipDurumu();

  // Store data is reloaded only when the route id changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function getir() {

    const q = query(
      collection(db, "ilanlar"),
      where("sahip", "==", id),
      where("onay", "==", true)
    );

    const snap = await getDocs(q);

    setUrunler(
      snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))
    );

    const takipQ = query(
      collection(db, "takipler"),
      where("magaza", "==", id)
    );

    const takipSnap = await getDocs(takipQ);

    setTakipciSayisi(takipSnap.size);

  }

  async function takipDurumu() {

    if (!auth.currentUser) return;

    const q = query(
      collection(db, "takipler"),
      where("kullanici", "==", auth.currentUser.email),
      where("magaza", "==", id)
    );

    const snap = await getDocs(q);

    setTakipEdiyor(!snap.empty);

  }

  async function takipEt() {

    if (!auth.currentUser) {

      alert("Önce giriş yap.");

      return;

    }

    await addDoc(
      collection(db, "takipler"),
      {
        kullanici: auth.currentUser.email,
        magaza: id,
        tarih: new Date()
      }
    );

    setTakipEdiyor(true);
    setTakipciSayisi(x => x + 1);

  }

  async function takipBirak() {

    const q = query(
      collection(db, "takipler"),
      where("kullanici", "==", auth.currentUser.email),
      where("magaza", "==", id)
    );

    const snap = await getDocs(q);

    for (const d of snap.docs) {

      await deleteDoc(doc(db, "takipler", d.id));

    }

    setTakipEdiyor(false);
    setTakipciSayisi(x => Math.max(0, x - 1));

  }

  return (

    <div className="page">

      <div className="store-header">

        <div className="store-avatar">

          🏪

        </div>

        <div>

          <h1>{id}</h1>

          <p>⭐⭐⭐⭐⭐ 9.8 Güvenilir Satıcı</p>

          <p>🚚 Hızlı Kargo • ✔ Onaylı Satıcı</p>

        </div>

        <button

          className="follow-btn"

          onClick={takipEdiyor ? takipBirak : takipEt}

        >

          {takipEdiyor ? "✔ Takip Ediliyor" : "➕ Takip Et"}

        </button>

      </div>

      <div className="store-stats">

        <div className="store-stat">

          <h2>{urunler.length}</h2>

          <span>Ürün</span>

        </div>

        <div className="store-stat">

          <h2>245</h2>

          <span>Satış</span>

        </div>

        <div className="store-stat">

          <h2>9.8</h2>

          <span>Puan</span>

        </div>

        <div className="store-stat">

          <h2>{takipciSayisi}</h2>

          <span>Takipçi</span>

        </div>

      </div>

      <input

        className="store-search"

        placeholder="🔍 Mağazada ürün ara"

        value={arama}

        onChange={(e) => setArama(e.target.value)}

      />

      <div className="store-products">

        {

          urunler

            .filter(u =>
              u.baslik
                .toLowerCase()
                .includes(arama.toLowerCase())
            )

            .map(u => (

              <Link

                key={u.id}

                to={"/ilan/" + u.id}

                className="product"

              >

                <img

                  src={u.resim}

                  alt={u.baslik}

                />

                <h3>{u.baslik}</h3>

                <h2>{u.fiyat}</h2>

                <p className="store-product-info">

                  🚚 Ücretsiz Kargo

                </p>

                <p className="store-product-info">

                  🛡️ Güvenli Ödeme

                </p>

              </Link>

            ))

        }

      </div>

    </div>

  );

}

export default Store;
