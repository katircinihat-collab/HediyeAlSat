import { useEffect, useState } from "react";
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

function Profile() {
  const navigate = useNavigate();
  const [profil, setProfil] = useState({
    ad: "",
    telefon: "",
    il: "",
    ilce: "",
    hakkinda: ""
  });
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);

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
          const konum = konumAyir(data.sehir);
          setProfil({
            ad: data.ad || "",
            telefon: telefonFormatla(data.telefon),
            il: konum.il,
            ilce: konum.ilce,
            hakkinda: data.hakkinda || ""
          });
        }
      } catch (error) {
        console.error("Profil bilgileri alınamadı:", error);
      } finally {
        setYukleniyor(false);
      }
    });

    return unsubscribe;
  }, [navigate]);

  function alanDegistir(alan, value) {
    setProfil((onceki) => ({ ...onceki, [alan]: value }));
  }

  async function kaydet(event) {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user || kaydediliyor) return;

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

      await setDoc(
        doc(db, "profiller", user.uid),
        {
          ad: profil.ad.trim(),
          telefon: telefonFormatla(telefonRakamlar),
          sehir,
          hakkinda: profil.hakkinda.trim()
        },
        { merge: true }
      );

      alert("Profil bilgileriniz kaydedildi ✅");
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
        <header className="profile-header">
          <h1>👤 Profil Bilgilerim</h1>
          <p>Telefon ve konum bilgilerinizi yalnızca hesabınız için yönetin.</p>
        </header>

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
            <div className="profile-email">
              <span>E-posta</span>
              <strong>{auth.currentUser?.email}</strong>
            </div>

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

            <button type="submit" className="profile-save-btn" disabled={kaydediliyor}>
              {kaydediliyor ? "Kaydediliyor..." : "💾 Bilgilerimi Kaydet"}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}

export default Profile;
