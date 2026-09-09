import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteField,
  where
} from "firebase/firestore";

import "../styles/pages/my-store.css";
import { validatePublicContent } from "../utils/publicContentModeration";

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
    const profilSnap = await getDoc(doc(db, "profiller", auth.currentUser.uid));
    const profil = profilSnap.exists() ? profilSnap.data() : {};

    setMagazaId(bulunanBelge.id);
    setLogoHatasi(false);
    setKapakHatasi(false);
    const yuklenenMagaza = {
      magazaAdi: veri.magazaAdi || veri.adi || "",
      logo: veri.logo || "",
      kapak: veri.kapak || veri.banner || "",
      telefon: profil.telefon || veri.telefon || "",
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

    let guvenliAciklama;
    try {
      guvenliAciklama = validatePublicContent(magaza.aciklama);
    } catch (error) {
      alert(error.message);
      return;
    }
    const kaydedilecekVeri = duzenlenebilirMagazaVerisi({ ...magaza, aciklama: guvenliAciklama });

    try {
      setKaydediliyor(true);
      const { telefon, ...publicMagazaVerisi } = kaydedilecekVeri;
      await updateDoc(doc(db, "magazalar", magazaId), {
        ...publicMagazaVerisi,
        telefon: deleteField()
      });
      await setDoc(doc(db, "profiller", auth.currentUser.uid), { telefon }, { merge: true });
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

  const tamamlananAlanSayisi = [
    magaza.magazaAdi,
    magaza.logo,
    magaza.kapak,
    magaza.telefon,
    magaza.sehir,
    magaza.aciklama
  ].filter((value) => String(value || "").trim()).length;
  const profilTamamlanma = Math.round((tamamlananAlanSayisi / 6) * 100);

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

      <nav className="my-store-management" aria-label="Mağaza yönetim kısayolları">
        <a className="my-store-management-link active" href="#magaza-bilgileri">
          <span>✏️</span><strong>Mağazayı Düzenle</strong><small>Vitrin bilgileri</small>
        </a>
        <Link className="my-store-management-link" to="/ilan-ver">
          <span>➕</span><strong>Yeni Ürün Ekle</strong><small>Yeni ilan yayınla</small>
        </Link>
        <Link className="my-store-management-link" to="/satici-siparisleri">
          <span>📦</span><strong>Siparişler</strong><small>Siparişleri yönet</small>
        </Link>
        <Link className="my-store-management-link" to="/seller">
          <span>💳</span><strong>Cüzdan / Finans</strong><small>Hakedişleri görüntüle</small>
        </Link>
        <Link className="my-store-management-link" to="/seller">
          <span>📊</span><strong>İstatistikler</strong><small>Satıcı performansı</small>
        </Link>
      </nav>

      <section className="my-store-overview" aria-label="Mağaza özeti">
        <div><span>Mağaza durumu</span><strong>{magaza.aktif ? "Yayında" : "Kapalı"}</strong></div>
        <div><span>Profil tamamlanma</span><strong>%{profilTamamlanma}</strong></div>
        <div><span>Mağaza konumu</span><strong>{magaza.sehir || "Belirtilmedi"}</strong></div>
      </section>

      <section className="my-store-card" id="magaza-bilgileri">
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
