import "../styles/layout/navbar.css";

import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  limit,
  onSnapshot
} from "firebase/firestore";

import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { selectOwnedStoreId } from "../utils/storeOwnership";

const FEATURE_ITEMS = [
  {
    eyebrow: "DİJİTAL TASARIM",
    title: "A4 Tasarım Pazarı",
    text: "Özgün dijital tasarımları keşfet. İndir, kullan, ilham ver.",
    to: "/a4-tasarimlar",
    cta: "Tasarımları Gör",
    art: ["🍁", "🐱", "İyi\nFikirler\nHer\nYerde"],
    perks: ["🎨 Binlerce Tasarım", "⚡ Anında Erişim", "🛡️ Güvenli Alışveriş"]
  },
  {
    eyebrow: "YENİ DENEYİM",
    title: "Hediye Kapışması",
    text: "Canlı rekabete katıl, puanını kullan, satın alma hakkını kazan.",
    to: "/#hediye-kapismasi",
    cta: "Kapışmaya Git",
    art: ["🎁", "⚡", "🏆"],
    perks: ["🎯 Canlı Rekabet", "💰 Sabit Fiyat", "⏱️ 2 Dakika"]
  },
  {
    eyebrow: "GÜNÜN SÜRPRİZİ",
    title: "Kura / Günün Ürünü",
    text: "Günün sürpriz ürününü keşfet ve özel seçkileri takip et.",
    to: null,
    cta: "Yakında",
    art: ["🎲", "🎀", "⭐"],
    perks: ["🎁 Günlük Sürpriz", "1️⃣ Tek Ürün", "✨ Özel Seçki"]
  },
  {
    eyebrow: "ÖNE ÇIKAN MAĞAZALAR",
    title: "Sponsor Mağazalar",
    text: "Öne çıkan mağazaları ve seçili ürünlerini tek yerde keşfet.",
    to: "/sponsor-magaza",
    cta: "Mağazaları Gör",
    art: ["🏪", "🛍️", "⭐"],
    perks: ["🏪 Seçili Mağazalar", "🛍️ Öne Çıkan Ürünler", "🔎 Kolay Keşif"]
  },
  {
    eyebrow: "TOPLULUK SEÇİMİ",
    title: "Top 10 Tasarımlar",
    text: "Haftanın en çok ilgi gören tasarımlarını incele.",
    to: "/top-10-tasarim",
    cta: "Top 10'u Gör",
    art: ["🥇", "🎨", "🔥"],
    perks: ["📅 Haftalık Liste", "🗳️ Topluluk Oyları", "🏆 En İyi 10"]
  }
];

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const [user, setUser] = useState(undefined);
  const [magazaId, setMagazaId] = useState(undefined);
  const [menuAcik, setMenuAcik] = useState(false);
  const [arama, setArama] = useState("");
  const [aramaAcik, setAramaAcik] = useState(false);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [featurePaused, setFeaturePaused] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const ADMIN_EMAIL = "alper54nihat@hediyealsat.com";
  const isHome = location.pathname === "/";

  useEffect(() => {
    let magazaUnsubscribe = null;

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (magazaUnsubscribe) {
        magazaUnsubscribe();
        magazaUnsubscribe = null;
      }

      setUser(currentUser);

      if (!currentUser) {
        setMagazaId(null);
        return;
      }

      setMagazaId(undefined);

      const legacyMagazaBul = async () => {
        if (!currentUser.email) return null;

        try {
          const emailSnap = await getDocs(
            query(
              collection(db, "magazalar"),
              where("sahip", "==", currentUser.email),
              limit(1)
            )
          );

          if (!emailSnap.empty) {
            return selectOwnedStoreId({ emailDocs: emailSnap.docs });
          }

          const legacySnap = await getDoc(doc(db, "magazalar", currentUser.email));
          return selectOwnedStoreId({ legacyDoc: legacySnap });
        } catch (error) {
          console.error("Legacy mağaza kontrolü hatası:", error);
          return null;
        }
      };

      try {
        const uidQuery = query(
          collection(db, "magazalar"),
          where("sahipUid", "==", currentUser.uid),
          limit(1)
        );

        magazaUnsubscribe = onSnapshot(
          uidQuery,
          async (uidSnap) => {
            if (auth.currentUser?.uid !== currentUser.uid) return;

            if (!uidSnap.empty) {
              setMagazaId(selectOwnedStoreId({ uidDocs: uidSnap.docs }));
              return;
            }

            setMagazaId(await legacyMagazaBul());
          },
          async (error) => {
            console.error("UID mağaza kontrolü hatası:", error);

            if (auth.currentUser?.uid === currentUser.uid) {
              setMagazaId(await legacyMagazaBul());
            }
          }
        );
      } catch (error) {
        console.error("Mağaza kontrolü hatası:", error);
        setMagazaId(null);
      }
    });

    return () => {
      unsub();
      if (magazaUnsubscribe) magazaUnsubscribe();
    };
  }, []);

  useEffect(() => {
    function closeMenus(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAcik(false);
      }

      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setAramaAcik(false);
      }
    }

    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrollY(window.scrollY);
    }

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (featurePaused) return undefined;

    const timer = window.setInterval(() => {
      setFeatureIndex((current) => (current + 1) % FEATURE_ITEMS.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [featurePaused]);

  async function cikis() {
    try {
      await signOut(auth);
      setMenuAcik(false);
      navigate("/login");
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  }

  function ara(e) {
    e.preventDefault();
    const temizArama = arama.trim();

    setAramaAcik(false);

    if (!temizArama) {
      navigate("/ilanlar");
      return;
    }

    navigate("/ilanlar?search=" + encodeURIComponent(temizArama));
  }

  function aramayiTemizle() {
    setArama("");
    navigate("/ilanlar");
  }

  function menuKapat() {
    setMenuAcik(false);
  }

  function ozelGunlereGit(e) {
    if (!isHome) return;
    const target = document.getElementById("ozel-gunler");
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function kullaniciAdi() {
    if (!user?.email) return "Hesabım";
    return user.email.split("@")[0];
  }

  function oncekiFeature() {
    setFeatureIndex((current) =>
      current === 0 ? FEATURE_ITEMS.length - 1 : current - 1
    );
  }

  function sonrakiFeature() {
    setFeatureIndex((current) => (current + 1) % FEATURE_ITEMS.length);
  }

  if (user === undefined) {
    return (
      <header className="navbar navbar-loading">
        <div className="navbar-top">
          <Link to="/" className="navbar-logo">
            <span className="logo-icon">🎁</span>
            <div className="logo-text">
              <span>Hediye</span>
              <b>AlSat</b>
            </div>
          </Link>
        </div>
      </header>
    );
  }

  const activeFeature = FEATURE_ITEMS[featureIndex];

  const featureContent = (
    <>
      <div className="feature-visual" aria-hidden="true">
        <div className="feature-paper feature-paper-one">
          <span>{activeFeature.art[0]}</span>
        </div>

        <div className="feature-paper feature-paper-two">
          <span>{activeFeature.art[1]}</span>
        </div>

        <div className="feature-paper feature-paper-three">
          <span>{activeFeature.art[2]}</span>
        </div>
      </div>

      <div className="feature-copy">
        <span className="feature-eyebrow">{activeFeature.eyebrow}</span>
        <h2>{activeFeature.title}</h2>
        <p>{activeFeature.text}</p>
        <span className="feature-cta">{activeFeature.cta} →</span>
      </div>

      <div className="feature-perks">
        {activeFeature.perks.map((perk) => (
          <span key={perk}>{perk}</span>
        ))}
      </div>
    </>
  );

  return (
    <header className={`navbar ${scrollY > 20 ? "navbar-scrolled" : ""} ${isHome ? "navbar-home" : "navbar-inner-page"}`}>
      <div className="navbar-top">
        <div className="brand-block">
          <Link to="/" className="navbar-logo" aria-label="HediyeAlSat Ana Sayfa">
            <span className="logo-icon">🎁</span>

            <div className="logo-text">
              <span>Hediye</span>
              <b>AlSat</b>
            </div>
          </Link>

          <div className="brand-tagline">
            Hediyeleşmenin<br />
            En Güzel Hali
          </div>
        </div>

        <section
          className="navbar-feature-showcase"
          aria-label="HediyeAlSat özellikleri"
          onMouseEnter={() => setFeaturePaused(true)}
          onMouseLeave={() => setFeaturePaused(false)}
        >
          <button
            type="button"
            className="feature-arrow feature-arrow-left"
            onClick={oncekiFeature}
            aria-label="Önceki özellik"
          >
            ‹
          </button>

          {activeFeature.to ? (
            <Link to={activeFeature.to} className="feature-showcase-main">
              {featureContent}
            </Link>
          ) : (
            <div className="feature-showcase-main feature-showcase-disabled">
              {featureContent}
            </div>
          )}

          <button
            type="button"
            className="feature-arrow feature-arrow-right"
            onClick={sonrakiFeature}
            aria-label="Sonraki özellik"
          >
            ›
          </button>

          <div className="feature-dots" aria-label="Özellik seçimi">
            {FEATURE_ITEMS.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={
                  index === featureIndex
                    ? "feature-dot feature-dot-active"
                    : "feature-dot"
                }
                onClick={() => setFeatureIndex(index)}
                aria-label={`${index + 1}. özelliği göster`}
              />
            ))}
          </div>
        </section>

        <div className="navbar-tools">
          <div
            className={`navbar-right${user ? "" : " navbar-right-guest"}`}
            style={{
              gridTemplateColumns: `repeat(${user?.email === ADMIN_EMAIL ? 6 : 5}, minmax(0, 1fr))`
            }}
          >
            <Link to="/ilan-ver" className="header-action header-action-primary">
              <span aria-hidden="true">＋</span>
              <strong>İlan Ver</strong>
              <small>Hemen Başla</small>
            </Link>

            <Link to="/favorilerim" className="header-action">
              <span aria-hidden="true">❤️</span>
              <strong>Favorilerim</strong>
              <small>Beğendiklerim</small>
            </Link>

            <Link to="/mesajlar" className="header-action">
              <span aria-hidden="true">💬</span>
              <strong>Mesajlarım</strong>
              <small>Konuşmalarım</small>
            </Link>

            <Link to="/sepet" className="header-action">
              <span aria-hidden="true">🛒</span>
              <strong>Sepetim</strong>
              <small>Ürünlerim</small>
            </Link>

            {user?.email === ADMIN_EMAIL && (
              <Link to="/admin" className="header-action header-action-admin">
                <span aria-hidden="true">👑</span>
                <strong>Admin</strong>
                <small>Yönetim</small>
              </Link>
            )}

            {user ? (
              <div className="navbar-user" ref={menuRef}>
                <button
                  className={`user-btn ${menuAcik ? "user-btn-active" : ""}`}
                  onClick={() => setMenuAcik(!menuAcik)}
                  aria-expanded={menuAcik}
                >
                  <span className="user-avatar">👤</span>

                  <span className="user-button-copy">
                    <strong className="user-name">{kullaniciAdi()}</strong>
                    <small>Hesabım</small>
                  </span>

                  <span className={`user-arrow ${menuAcik ? "arrow-up" : ""}`}>
                    ▼
                  </span>
                </button>

                {menuAcik && (
                  <div className="user-dropdown">
                    <div className="dropdown-user-header">
                      <div className="dropdown-avatar">👤</div>

                      <div className="dropdown-user-info">
                        <strong>{kullaniciAdi()}</strong>
                        <small>{user.email}</small>
                      </div>
                    </div>

                    <div className="dropdown-divider" />

                    <Link to="/profil" onClick={menuKapat}>
                      <span>👤</span>
                      <div>
                        <strong>Profil Bilgilerim</strong>
                        <small>Telefon ve konumunu yönet</small>
                      </div>
                    </Link>

                    <Link to="/ilanlarim" onClick={menuKapat}>
                      <span>📦</span>
                      <div>
                        <strong>İlanlarım</strong>
                        <small>Ürünlerini yönet</small>
                      </div>
                    </Link>

                    <Link to="/favorilerim" onClick={menuKapat}>
                      <span>❤️</span>
                      <div>
                        <strong>Favorilerim</strong>
                        <small>Kaydettiğin ürünler</small>
                      </div>
                    </Link>

                    <Link to="/siparislerim" onClick={menuKapat}>
                      <span>📋</span>
                      <div>
                        <strong>Siparişlerim</strong>
                        <small>Siparişlerini takip et</small>
                      </div>
                    </Link>

                    <Link to="/ayarlar" onClick={menuKapat}>
                      <span>⚙️</span>
                      <div>
                        <strong>Ayarlar</strong>
                        <small>Hesap ayarları</small>
                      </div>
                    </Link>

                    <div className="dropdown-divider" />

                    {magazaId === undefined ? (
                      <div className="store-menu-status" role="status">
                        <span>🏪</span>
                        <div>
                          <strong>Mağaza bilgisi kontrol ediliyor</strong>
                          <small>Lütfen kısa bir süre bekleyin</small>
                        </div>
                      </div>
                    ) : magazaId ? (
                      <>
                        <Link to="/magazam" onClick={menuKapat} className="store-menu-link">
                          <span>🏪</span>
                          <div>
                            <strong>Mağazam</strong>
                            <small>Mağazanı görüntüle ve yönet</small>
                          </div>
                        </Link>

                        <Link to="/seller" onClick={menuKapat} className="seller-menu-link">
                          <span>📊</span>
                          <div>
                            <strong>Satıcı Paneli</strong>
                            <small>Sipariş, finans ve performansı yönet</small>
                          </div>
                        </Link>
                      </>
                    ) : (
                      <Link to="/magaza-olustur" onClick={menuKapat} className="create-store-link">
                        <span>🏪</span>
                        <div>
                          <strong>Mağaza Oluştur</strong>
                          <small>Kendi mağazanı aç</small>
                        </div>
                      </Link>
                    )}

                    <div className="dropdown-divider" />

                    <button className="logout-btn" onClick={cikis}>
                      <span>🚪</span>
                      <div>
                        <strong>Çıkış Yap</strong>
                        <small>Hesabından çık</small>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="guest-auth-actions" aria-label="Üyelik işlemleri">
                <Link to="/login" className="guest-auth-btn guest-login-btn">
                  Giriş Yap
                </Link>
                <Link to="/uye-ol" className="guest-auth-btn guest-register-btn">
                  Üye Ol
                </Link>
              </div>
            )}
          </div>

          <form
            className={`navbar-search ${aramaAcik ? "search-active" : ""}`}
            onSubmit={ara}
            ref={searchRef}
          >
            <span className="search-icon">🔍</span>

            <input
              type="text"
              placeholder="Hediye, oyuncak, çiçek, takı ara..."
              value={arama}
              onFocus={() => setAramaAcik(true)}
              onChange={(e) => setArama(e.target.value)}
              aria-label="Ürün ara"
            />

            {arama && (
              <button
                type="button"
                className="search-clear"
                onClick={aramayiTemizle}
                aria-label="Aramayı temizle"
              >
                ×
              </button>
            )}

            <button type="submit" className="search-button">
              Ara
            </button>
          </form>
        </div>
      </div>

      <div className="mobile-navbar-top">
        <Link to="/" className="mobile-navbar-logo" aria-label="HediyeAlSat Ana Sayfa">
          <span aria-hidden="true">🎁</span>
          <strong>Hediye<span>AlSat</span></strong>
        </Link>

        <form className="mobile-navbar-search" onSubmit={ara}>
          <label className="sr-only" htmlFor="mobile-site-search">Ürün ara</label>
          <input
            id="mobile-site-search"
            type="search"
            value={arama}
            onChange={(event) => setArama(event.target.value)}
            placeholder="Hediye ara"
          />
          <button type="submit" aria-label="Ara">🔍</button>
        </form>

        <Link to="/sepet" className="mobile-navbar-action" aria-label="Sepetim">🛒</Link>
        <Link
          to={user ? "/profil" : "/login"}
          className="mobile-navbar-action"
          aria-label={user ? "Hesabım" : "Giriş yap"}
        >
          👤
        </Link>

        {user?.email === ADMIN_EMAIL && (
          <Link to="/admin" className="mobile-admin-link">
            <span aria-hidden="true">👑</span>
            <strong>Admin</strong>
            <small>Yönetim</small>
          </Link>
        )}
      </div>

      <div className="navbar-bottom">
        <nav className="navbar-menu" aria-label="Ana navigasyon">
          <NavLink to="/" end>
            🏠 <span>Ana Sayfa</span>
          </NavLink>

          <NavLink to="/ilanlar">
            🛍️ <span>İlanlar</span>
          </NavLink>

          <NavLink to="/magazalar">
            🏪 <span>Mağazalar</span>
          </NavLink>

          <NavLink to="/mesajlar">
            💬 <span>Mesajlar</span>
          </NavLink>

          <NavLink to="/ilanlar/kiralik">
            🔑 <span>Kiralık</span>
          </NavLink>

          <NavLink to="/gunun-firsatlari">
            🔥 <span>Günün Fırsatları</span>
          </NavLink>

          <NavLink to="/hediye-fikirleri">
            💡 <span>Hediye Fikirleri</span>
          </NavLink>

          <Link to="/#ozel-gunler" onClick={ozelGunlereGit}>
            🎁 <span>Kime Hediye Arıyorsun?</span>
          </Link>
        </nav>

        <div className="navbar-slogan" aria-hidden="true">
          Her hediye<br />
          mutlu eder ♡
        </div>
      </div>
    </header>
  );
}

export default Navbar;
