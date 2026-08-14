import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

function MyStore() {

  const [magaza, setMagaza] = useState({
    adi: "",
    logo: "",
    banner: "",
    telefon: "",
    sehir: "",
    aciklama: "",
    puan: 9.8,
    takipci: 0,
    satis: 0
  });

  useEffect(() => {

    getir();

  }, []);

  async function getir() {

    if (!auth.currentUser) return;

    const ref = doc(db, "magazalar", auth.currentUser.email);

    const snap = await getDoc(ref);

    if (snap.exists()) {

      setMagaza(snap.data());

    }

  }

  async function kaydet() {

    await setDoc(

      doc(db, "magazalar", auth.currentUser.email),

      magaza

    );

    alert("✅ Mağaza kaydedildi.");

  }

  return (

    <div className="page">

      <h1>🏪 Mağazam</h1>

      <input
        placeholder="Mağaza Adı"
        value={magaza.adi}
        onChange={(e)=>setMagaza({...magaza,adi:e.target.value})}
      />

      <input
        placeholder="Logo URL"
        value={magaza.logo}
        onChange={(e)=>setMagaza({...magaza,logo:e.target.value})}
      />

      <input
        placeholder="Banner URL"
        value={magaza.banner}
        onChange={(e)=>setMagaza({...magaza,banner:e.target.value})}
      />

      <input
        placeholder="Telefon"
        value={magaza.telefon}
        onChange={(e)=>setMagaza({...magaza,telefon:e.target.value})}
      />

      <input
        placeholder="Şehir"
        value={magaza.sehir}
        onChange={(e)=>setMagaza({...magaza,sehir:e.target.value})}
      />

      <textarea
        rows={6}
        placeholder="Mağaza Hakkında"
        value={magaza.aciklama}
        onChange={(e)=>setMagaza({...magaza,aciklama:e.target.value})}
      />

      <button
        className="buy-btn"
        onClick={kaydet}
      >
        💾 Kaydet
      </button>

    </div>

  );

}

export default MyStore;