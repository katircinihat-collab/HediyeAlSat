import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { apiUrl } from "../config/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/pages/profile.css";
import { claimWelcomeXp, getMyXp } from "../services/xpApi";
import xpConfig from "../../shared/xpConfig.json";

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
  const logout = async () => {
    try { await signOut(auth); navigate('/login'); }
    catch { window.alert('Çıkış yapılamadı. Lütfen tekrar deneyin.'); }
  };
  const [profil, setProfil] = useState(bosProfil);
  const [kayitliProfil, setKayitliProfil] = useState(bosProfil);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [basariMesaji, setBasariMesaji] = useState("");
  const [kimlikNumarasi, setKimlikNumarasi] = useState("");
  const [maskeliKimlik, setMaskeliKimlik] = useState("");
  const [kimlikKaydediliyor, setKimlikKaydediliyor] = useState(false);
  const [xp, setXp] = useState(null);
  const [xpHatasi, setXpHatasi] = useState("");

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
        try {
          const token = await user.getIdToken();
          const kimlikCevabi = await fetch(apiUrl("/api/buyer-identity"), {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (kimlikCevabi.ok) {
            const kimlikVerisi = await kimlikCevabi.json();
            setMaskeliKimlik(kimlikVerisi.masked || "");
          }
        } catch {
          // Kimlik servisi geçici olarak erişilemezse normal profil yine yüklenir.
        }

        try {
          const creationTime = new Date(user.metadata?.creationTime || 0).getTime();
          if (Number.isFinite(creationTime) && Date.now() - creationTime <= 24 * 60 * 60 * 1000) {
            try { await claimWelcomeXp(user); } catch { /* Backend uygunluğu ve idempotency authoritative kalır. */ }
          }
          setXp(await getMyXp(user));
        } catch {
          setXpHatasi("XP bilgileriniz şu anda alınamıyor.");
          setXp({ lifetimeXP: 0, availableXP: 0, level: xpConfig.levels[0], progress: { percent: 0, remaining: 100, next: xpConfig.levels[1] }, history: [] });
        }

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

  async function kimlikKaydet() {
    const user = auth.currentUser;
    if (!user || kimlikKaydediliyor) return;
    const normalized = kimlikNumarasi.replace(/\D/g, "");
    if (!/^\d{11}$/.test(normalized)) {
      alert("T.C. kimlik numarası 11 rakam olmalıdır.");
      return;
    }

    setKimlikKaydediliyor(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(apiUrl("/api/buyer-identity"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ identityNumber: normalized })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Kimlik bilgisi kaydedilemedi.");
      setMaskeliKimlik(result.masked || "");
      setKimlikNumarasi("");
      setBasariMesaji("Kimlik bilginiz güvenli biçimde kaydedildi.");
    } catch (error) {
      alert(error.message || "Kimlik bilgisi kaydedilemedi.");
    } finally {
      setKimlikKaydediliyor(false);
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
          <button type="button" className="profile-link" onClick={logout}>🚪 Çıkış Yap</button>
          <Link className="profile-link" to="/satici-siparisleri">
            📦 Satıcı Siparişleri
          </Link>
        </nav>

        {yukleniyor ? (
          <div className="profile-card profile-loading">Profil bilgileriniz yükleniyor...</div>
        ) : (
          <>
          {xp && <section className="profile-xp-card" aria-labelledby="xp-title">
            <div className="profile-xp-heading">
              <span aria-hidden="true">{xp.level.icon}</span>
              <div>
                <small>⭐ XP &amp; Seviyem</small>
                <h2 id="xp-title">{xp.level.title} — Seviye {xp.level.level}</h2>
              </div>
            </div>
            <div className="profile-xp-totals">
              <div><span>Kullanılabilir XP</span><strong>{xp.availableXP} XP ⭐</strong></div>
              <div><span>Toplam kazandığın</span><strong>{xp.lifetimeXP} XP</strong></div>
            </div>
            <div className="profile-level-progress" role="progressbar" aria-label="Sonraki seviyeye ilerleme" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(xp.progress.percent)}>
              <span style={{ width: `${xp.progress.percent}%` }} />
            </div>
            <p>{xp.progress.next
              ? <>{xp.progress.next.title} olmak için <strong>{xp.progress.remaining} XP</strong> daha</>
              : "En yüksek seviyeye ulaştın."}</p>
            {xpHatasi && <p className="profile-xp-error" role="status">{xpHatasi}</p>}

            <details className="profile-xp-help">
              <summary>XP Nasıl Kazanırım / Nerede Kullanırım?</summary>
              <ul>
                <li><span>🎁 Üye olduğunda</span><strong>+{xpConfig.events.WELCOME_BONUS.amount} XP</strong><small>Tek seferlik hoş geldin bonusu</small></li>
                <li><span>⚔️ Günde 3 farklı Hediye Kapışmasına oy ver</span><strong>+{xpConfig.events.GIFT_BATTLE_DAILY_3_VOTES.amount} XP</strong><small>Günde bir kez</small></li>
                <li><span>⚔️ Kendi Hediye Kapışmanı oluştur</span><strong>Ücretsiz</strong></li>
                <li><span>🎲 Büyük Hediye Kurasına katıl</span><strong>-{xpConfig.events.RAFFLE_JOIN.amount} XP</strong></li>
              </ul>
              <p>XP para değildir; satın alınamaz veya nakde çevrilemez. HediyeAlSat etkinliklerine katılarak kazanılır ve belirli topluluk özelliklerinde kullanılır.</p>
            </details>

            <div className="profile-xp-history">
              <h3>XP Hareketlerim</h3>
              {xp.history.length === 0 ? <p>Henüz XP hareketin bulunmuyor.</p> : <ul>{xp.history.map((item) => {
                const event = xpConfig.events[item.reason];
                const sign = item.type === "spend" ? "-" : "+";
                return <li key={item.id}><span><strong>{sign}{item.amount} XP</strong>{event?.label || "XP işlemi"}</span><time>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("tr-TR") : ""}</time></li>;
              })}</ul>}
            </div>
          </section>}
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

            <section className="profile-form-section">
              <h2>Ödeme Kimliği</h2>
              <p>
                iyzico ödeme işlemleri için gereklidir. Numaranız yalnız güvenli backend
                kaydında şifreli tutulur ve burada tam olarak gösterilmez.
              </p>
              {maskeliKimlik && <small>Kayıtlı kimlik: {maskeliKimlik}</small>}
              <label>
                T.C. Kimlik Numarası
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  placeholder={maskeliKimlik || "11 haneli kimlik numarası"}
                  value={kimlikNumarasi}
                  onChange={(event) => setKimlikNumarasi(event.target.value.replace(/\D/g, "").slice(0, 11))}
                />
              </label>
              <button
                type="button"
                className="profile-save-btn"
                disabled={kimlikKaydediliyor || kimlikNumarasi.length !== 11}
                onClick={kimlikKaydet}
              >
                {kimlikKaydediliyor ? "Kaydediliyor..." : "Kimlik Bilgisini Güvenli Kaydet"}
              </button>
            </section>

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
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

export default Profile;
