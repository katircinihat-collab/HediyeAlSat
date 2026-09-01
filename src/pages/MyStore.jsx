import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where
} from "firebase/firestore";

function MyStore() {

  const [magaza, setMagaza] = useState({
    magazaAdi: "",
    logo: "",
    kapak: "",
    telefon: "",
    sehir: "",
    aciklama: "",
    aktif: true
  });
  const [magazaId, setMagazaId] = useState(null);

  useEffect(() => {

    getir();

  }, []);

  async function getir() {

    if (!auth.currentUser) return;

    const uidSnap = await getDocs(query(
      collection(db, "magazalar"),
      where("sahipUid", "==", auth.currentUser.uid)
    ));

    const emailSnap = uidSnap.empty
      ? await getDocs(query(
        collection(db, "magazalar"),
        where("sahip", "==", auth.currentUser.email)
      ))
      : null;

    let bulunanBelge = !uidSnap.empty ? uidSnap.docs[0] : emailSnap?.docs[0];

    if (!bulunanBelge) {
      const legacySnap = await getDoc(
        doc(db, "magazalar", auth.currentUser.email)
      );

      if (legacySnap.exists()) bulunanBelge = legacySnap;
    }

    if (!bulunanBelge) return;

    const veri = bulunanBelge.data();

    setMagazaId(bulunanBelge.id);
    setMagaza({
      magazaAdi: veri.magazaAdi || veri.adi || "",
      logo: veri.logo || "",
      kapak: veri.kapak || veri.banner || "",
      telefon: veri.telefon || "",
      sehir: veri.sehir || "",
      aciklama: veri.aciklama || "",
      aktif: veri.aktif !== false
    });

  }

  async function kaydet() {

    if (!auth.currentUser || !magazaId) {
      alert("Mağaza bulunamadı.");
      return;
    }

    await updateDoc(

      doc(db, "magazalar", magazaId),

      {
        magazaAdi: magaza.magazaAdi,
        logo: magaza.logo,
        kapak: magaza.kapak,
        telefon: magaza.telefon,
        sehir: magaza.sehir,
        aciklama: magaza.aciklama
      }

    );

    alert("✅ Mağaza kaydedildi.");

  }

  return (

    <div className="page">

      <h1>🏪 Mağazam</h1>

      {magaza.aktif === false && (
        <div className="store-closed-notice" role="status">
          <strong>Mağazanız şu anda yönetim tarafından kapatılmıştır.</strong>
          <span>Mağaza bilgileriniz ve geçmiş kayıtlarınız korunur; yeni ilan ekleyemezsiniz.</span>
        </div>
      )}

      <input
        placeholder="Mağaza Adı"
        value={magaza.magazaAdi}
        onChange={(e)=>setMagaza({...magaza,magazaAdi:e.target.value})}
      />

      <input
        placeholder="Logo URL"
        value={magaza.logo}
        onChange={(e)=>setMagaza({...magaza,logo:e.target.value})}
      />

      <input
        placeholder="Banner URL"
        value={magaza.kapak}
        onChange={(e)=>setMagaza({...magaza,kapak:e.target.value})}
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
