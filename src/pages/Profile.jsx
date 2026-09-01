import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/pages/profile.css";

function telefonFormatla(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  return [
    digits.slice(0, 4),
    digits.slice(4, 7),
    digits.slice(7, 9),
    digits.slice(9, 11)
  ].filter(Boolean).join(" ");
}

function konumAyir(sehir = "") {
  const [il = "", ...ilceParcalari] = String(sehir).split("/");
  return {
    il: il.trim(),
    ilce: ilceParcalari.join("/").trim()
  };
}

const bosProfil = {
  ad: "",
  telefon: "",
  il: "",
  ilce: "",
  hakkinda: ""
};

function profilNormallestir(profil = {}) {
  return {
    ad: String(profil.ad || "").trim(),
    telefon: telefonFormatla(profil.telefon),
    il: String(profil.il || "").trim(),
    ilce: String(profil.ilce || "").trim(),
    hakkinda: String(profil.hakkinda || "").trim()
  };
}

function Profile() {
  const navigate = useNavigate();
  const [profil, setProfil] = useState(bosProfil);
  const [kayitliProfil, setKayitliProfil] = useState(bosProfil);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basariMesaji, setBasariMesaji] = useState("");

  const profilDegisti = useMemo(
    () => JSON.stringify(profilNormallestir(profil)) !== JSON.stringify(kayitliProfil),
    [profil, kayitliProfil]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "profiller", user.uid));

        if (snapshot.exists()) {
          const data = snapshot.data();
          const konum = konumAyir(data.sehir || data.il);
          const yuklenenProfil = profilNormallestir({
            ad: data.ad || "",
            telefon: telefonFormatla(data.telefon),
            il: data.il || konum.il,
            ilce: data.ilce || konum.ilce,
            hakkinda: data.hakkinda || ""
          });
          setProfil(yuklenenProfil);
          setKayitliProfil(yuklenenProfil);
        } else {
          setProfil(bosProfil);
          setKayitliProfil(bosProfil);
        }
      } catch (error) {
        console.error("Profil bilgileri alınamadı:", error);
      } finally {
        setYukleniyor(false);
      }
    });

    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    if (!basariMesaji) return undefined;

    const timer = window.setTimeout(() => setBasariMesaji(""), 3000);
    return () => window.clearTimeout(timer);
  }, [basariMesaji]);

  function alanDegistir(alan, value) {
    setBasariMesaji("");
    setProfil((onceki) => ({ ...onceki, [alan]: value }));
  }

  async function kaydet(event) {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user || kaydediliyor || !profilDegisti) return;

    const telefonRakamlar = profil.telefon.replace(/\D/g, "");
    if (telefonRakamlar && !/^05\d{9}$/.test(telefonRakamlar)) {
      alert("Telefon numaranızı 05xx xxx xx xx formatında girin.");
      return;
    }

    setKaydediliyor(true);

    try {
      const sehir = [profil.il.trim(), profil.ilce.trim()]
        .filter(Boolean)
        .join(" / ");

      const kaydedilecekProfil = profilNormallestir({
        ...profil,
        telefon: telefonRakamlar
      });

      await setDoc(
        doc(db, "profiller", user.uid),
        {
          ad: kaydedilecekProfil.ad,
          telefon: kaydedilecekProfil.telefon,
          sehir,
          hakkinda: kaydedilecekProfil.hakkinda
        },
        { merge: true }
      );

      setProfil(kaydedilecekProfil);
      setKayitliProfil(kaydedilecekProfil);
      setBasariMesaji("Bilgileriniz kaydedildi.");
    } catch (error) {
      console.error("Profil kaydedilemedi:", error);
      alert("Profil bilgileri kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="profile-page">
        <nav className="profile-menu" aria-label="Hesap sayfaları">
          <Link className="profile-link" to="/ilanlarim">📦 İlanlarım</Link>
          <Link className="profile-link" to="/siparislerim">🛒 Siparişlerim</Link>
          <Link className="profile-link" to="/sepet">🛒 Sepetim</Link>
          <Link className="profile-link" to="/favorilerim">❤️ Favorilerim</Link>
          <Link className="profile-link" to="/mesajlar">💬 Mesajlarım</Link>
          <Link className="profile-link" to="/magazalar">🏪 Mağazalar</Link>
          <Link className="profile-link" to="/ayarlar">⚙️ Ayarlar</Link>
          <Link className="profile-link" to="/satici-siparisleri">
            📦 Satıcı Siparişleri
          </Link>
        </nav>

        {yukleniyor ? (
          <div className="profile-card profile-loading">Profil bilgileriniz yükleniyor...</div>
        ) : (
          <form className="profile-card profile-form" onSubmit={kaydet}>
            <header className="profile-card-header">
              <h1>👤 Profil Bilgilerim</h1>
              <p>Hesap bilgilerinizi tek bir yerden görüntüleyip güncelleyebilirsiniz.</p>
            </header>

            <label>
              E-posta
              <input
                type="email"
                value={auth.currentUser?.email || ""}
                disabled
                aria-describedby="profile-email-note"
              />
              <small id="profile-email-note">
                E-posta adresiniz Firebase hesabınızdan alınır.
              </small>
            </label>

            <label>
              Ad Soyad
              <input
                value={profil.ad}
                onChange={(event) => alanDegistir("ad", event.target.value)}
                autoComplete="name"
              />
            </label>

            <section id="telefon" className="profile-form-section">
              <h2>☎️ Telefon Numaram</h2>
              <p>Telefon bilginiz ürün sayfalarında otomatik olarak yayınlanmaz.</p>
              <label>
                Telefon
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="05xx xxx xx xx"
                  value={profil.telefon}
                  onChange={(event) =>
                    alanDegistir("telefon", telefonFormatla(event.target.value))
                  }
                  autoComplete="tel"
                />
              </label>
            </section>

            <section id="konum" className="profile-form-section">
              <h2>📍 Konumum</h2>
              <p>Konumunuzu GPS kullanmadan manuel olarak belirleyebilirsiniz.</p>
              <div className="profile-location-grid">
                <label>
                  İl
                  <input
                    placeholder="Örn. Sakarya"
                    value={profil.il}
                    onChange={(event) => alanDegistir("il", event.target.value)}
                    autoComplete="address-level1"
                  />
                </label>
                <label>
                  İlçe
                  <input
                    placeholder="Örn. Adapazarı"
                    value={profil.ilce}
                    onChange={(event) => alanDegistir("ilce", event.target.value)}
                    autoComplete="address-level2"
                  />
                </label>
              </div>
            </section>

            <label>
              Hakkımda
              <textarea
                value={profil.hakkinda}
                onChange={(event) => alanDegistir("hakkinda", event.target.value)}
              />
            </label>

            <div className="profile-save-row">
              <button
                type="submit"
                className="profile-save-btn"
                disabled={kaydediliyor || !profilDegisti}
              >
                {kaydediliyor
                  ? "Kaydediliyor..."
                  : profilDegisti
                    ? "💾 Bilgilerimi Kaydet"
                    : "✓ Bilgiler Kaydedildi"}
              </button>

              {basariMesaji && (
                <p className="profile-success" role="status">
                  {basariMesaji}
                </p>
              )}
            </div>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}

export default Profile;
