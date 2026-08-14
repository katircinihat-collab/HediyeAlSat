import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc
} from "firebase/firestore";

import { Link } from "react-router-dom";

function MyListings() {

  const [ilanlar, setIlanlar] = useState([]);

  useEffect(() => {
    getir();
  }, []);

  async function getir() {

    if (!auth.currentUser) return;

    const q = query(
      collection(db, "ilanlar"),
      where("sahip", "==", auth.currentUser.email)
    );

    const snap = await getDocs(q);

    setIlanlar(
      snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))
    );
  }

  async function sil(id) {

    if (!window.confirm("Bu ilan silinsin mi?")) return;

    await deleteDoc(doc(db, "ilanlar", id));

    setIlanlar(ilanlar.filter(i => i.id !== id));
  }

  return (
    <div className="page">

      <h1>📦 İlanlarım</h1>

      {ilanlar.length === 0 && (
        <p>Henüz ilanınız bulunmuyor.</p>
      )}

      {ilanlar.map((ilan) => (

        <div className="product" key={ilan.id}>

          {ilan.resim && (
            <img
              src={ilan.resim}
              alt={ilan.baslik}
              width="150"
            />
          )}

          <h2>{ilan.baslik}</h2>

          <p>💰 {ilan.fiyat}</p>

          <p>📍 {ilan.sehir}</p>

          <p>👁️ {ilan.goruntulenme || 0}</p>

          <p>
            {ilan.onay ? "✅ Yayında" : "🟡 Onay Bekliyor"}
          </p>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>

            <Link to={"/ilan/" + ilan.id}>
              <button>👁️ Görüntüle</button>
            </Link>

            <Link to={"/duzenle/" + ilan.id}>
              <button>✏️ Düzenle</button>
            </Link>

            <button onClick={() => sil(ilan.id)}>
              🗑️ Sil
            </button>

          </div>

        </div>

      ))}

    </div>
  );
}

export default MyListings;