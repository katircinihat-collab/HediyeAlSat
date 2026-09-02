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

import "../styles/pages/my-store.css";

function duzenlenebilirMagazaVerisi(magaza) {
  return {
    magazaAdi: magaza.magazaAdi,
    logo: magaza.logo,
    kapak: magaza.kapak,
    telefon: magaza.telefon,
    sehir: magaza.sehir,
    aciklama: magaza.aciklama
  };
}

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
  const [logoHatasi, setLogoHatasi] = useState(false);
  const [kapakHatasi, setKapakHatasi] = useState(false);
  const [ilkMagazaVerisi, setIlkMagazaVerisi] = useState(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

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
    setLogoHatasi(false);
    setKapakHatasi(false);
    const yuklenenMagaza = {
      magazaAdi: veri.magazaAdi || veri.adi || "",
      logo: veri.logo || "",
      kapak: veri.kapak || veri.banner || "",
      telefon: veri.telefon || "",
      sehir: veri.sehir || "",
      aciklama: veri.aciklama || "",
      aktif: veri.aktif !== false
    };

    setMagaza(yuklenenMagaza);
    setIlkMagazaVerisi(duzenlenebilirMagazaVerisi(yuklenenMagaza));

  }

  async function kaydet() {

    if (kaydediliyor) return;

    if (!auth.currentUser || !magazaId) {
      alert("Mağaza bulunamadı.");
      return;
    }

    const kaydedilecekVeri = duzenlenebilirMagazaVerisi(magaza);

    try {
      setKaydediliyor(true);
      await updateDoc(doc(db, "magazalar", magazaId), kaydedilecekVeri);
      setIlkMagazaVerisi(kaydedilecekVeri);
      alert("✅ Mağaza kaydedildi.");
    } catch (error) {
      console.error("Mağaza kaydedilemedi:", error);
      alert("Mağaza bilgileri kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setKaydediliyor(false);
    }

  }

  const degisiklikVar = ilkMagazaVerisi !== null &&
    JSON.stringify(duzenlenebilirMagazaVerisi(magaza)) !== JSON.stringify(ilkMagazaVerisi);

  function gorselBaglantisiDegistir(alan) {
    const etiket = alan === "logo" ? "Logo" : "Kapak";
    const yeniBaglanti = window.prompt(
      `${etiket} görsel bağlantısını girin:`,
      magaza[alan] || ""
    );

    if (yeniBaglanti === null) return;

    setMagaza((onceki) => ({
      ...onceki,
      [alan]: yeniBaglanti.trim()
    }));

    if (alan === "logo") setLogoHatasi(false);
    if (alan === "kapak") setKapakHatasi(false);
  }

  return (

    <div className="page my-store-page">

      <header className="my-store-heading">
        <div>
          <span>Satıcı yönetimi</span>
          <h1>🏪 Mağazam</h1>
          <p>Mağaza vitrininizde görünen temel bilgileri buradan düzenleyin.</p>
        </div>
        <span className={`my-store-status ${magaza.aktif ? "active" : "closed"}`}>
          {magaza.aktif ? "Aktif" : "Kapalı"}
        </span>
      </header>

      {magaza.aktif === false && (
        <div className="store-closed-notice" role="status">
          <strong>Mağazanız şu anda yönetim tarafından kapatılmıştır.</strong>
          <span>Mağaza bilgileriniz ve geçmiş kayıtlarınız korunur; yeni ilan ekleyemezsiniz.</span>
        </div>
      )}

      <section className="my-store-card">
        <div className="my-store-cover">
          {magaza.kapak && !kapakHatasi ? (
            <img src={magaza.kapak} alt={`${magaza.magazaAdi || "Mağaza"} kapak görseli`} onError={() => setKapakHatasi(true)} />
          ) : (
            <div className="my-store-cover-placeholder" aria-label="Kapak görseli bulunmuyor">
              <span>🏪</span>
              <small>Mağaza kapak görseli</small>
            </div>
          )}

          <div className="my-store-logo">
            {magaza.logo && !logoHatasi ? (
              <img src={magaza.logo} alt={`${magaza.magazaAdi || "Mağaza"} logosu`} onError={() => setLogoHatasi(true)} />
            ) : (
              <span aria-label="Mağaza logosu bulunmuyor">🏬</span>
            )}
          </div>
        </div>

        <div className="my-store-image-actions" aria-label="Mağaza görselleri">
          <button type="button" className="my-store-image-action" onClick={() => gorselBaglantisiDegistir("logo")}>
            Logo Görselini Değiştir
          </button>
          <button type="button" className="my-store-image-action" onClick={() => gorselBaglantisiDegistir("kapak")}>
            Kapak Görselini Değiştir
          </button>
        </div>

        <div className="my-store-form">
          <div className="my-store-field my-store-field-wide">
            <label htmlFor="my-store-name">Mağaza adı</label>
            <input id="my-store-name" placeholder="Mağaza Adı" value={magaza.magazaAdi} onChange={(e)=>setMagaza({...magaza,magazaAdi:e.target.value})} />
          </div>

          <div className="my-store-field">
            <label htmlFor="my-store-phone">Telefon</label>
            <input id="my-store-phone" placeholder="Telefon" value={magaza.telefon} onChange={(e)=>setMagaza({...magaza,telefon:e.target.value})} />
          </div>

          <div className="my-store-field">
            <label htmlFor="my-store-city">Şehir / konum</label>
            <input id="my-store-city" placeholder="Şehir" value={magaza.sehir} onChange={(e)=>setMagaza({...magaza,sehir:e.target.value})} />
          </div>

          <div className="my-store-field my-store-field-wide">
            <label htmlFor="my-store-about">Mağaza hakkında</label>
            <textarea id="my-store-about" rows={6} placeholder="Mağazanızı kısaca tanıtın" value={magaza.aciklama} onChange={(e)=>setMagaza({...magaza,aciklama:e.target.value})} />
          </div>

          <div className="my-store-actions my-store-field-wide">
            <button
              type="button"
              className="buy-btn"
              onClick={kaydet}
              disabled={!degisiklikVar || kaydediliyor}
            >
              {kaydediliyor ? "Kaydediliyor..." : "💾 Bilgileri Kaydet"}
            </button>
          </div>
        </div>
      </section>

    </div>

  );

}

export default MyStore;
