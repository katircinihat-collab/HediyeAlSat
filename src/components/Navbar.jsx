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

import {
  Link,
  NavLink,
  useNavigate
} from "react-router-dom";

import {
  useState,
  useEffect,
  useRef
} from "react";

import {
  auth,
  db
} from "../firebase";

import {
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { selectOwnedStoreId } from "../utils/storeOwnership";


function Navbar() {

  const navigate = useNavigate();
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const [user, setUser] = useState(undefined);
  const [magazaId, setMagazaId] = useState(undefined);

  const [menuAcik, setMenuAcik] = useState(false);
  const [arama, setArama] = useState("");
  const [aramaAcik, setAramaAcik] = useState(false);

  const [scrollY, setScrollY] = useState(0);

  const ADMIN_EMAIL =
    "alper54nihat@hediyealsat.com";


  /* =========================================
     KULLANICI KONTROLÜ
  ========================================= */

  useEffect(() => {

    let magazaUnsubscribe = null;

    const unsub = onAuthStateChanged(
      auth,
      async (currentUser) => {

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
            const emailSnap = await getDocs(query(
              collection(db, "magazalar"),
              where("sahip", "==", currentUser.email),
              limit(1)
            ));

            if (!emailSnap.empty) return selectOwnedStoreId({ emailDocs: emailSnap.docs });

            const legacySnap = await getDoc(
              doc(db, "magazalar", currentUser.email)
            );

            return selectOwnedStoreId({ legacyDoc: legacySnap });
          } catch (error) {
            console.error("Legacy mağaza kontrolü hatası:", error);
            return null;
          }
        };

        try {

          const uidQuery = query(

            collection(
              db,
              "magazalar"
            ),

            where(
              "sahipUid",
              "==",
              currentUser.uid
            ),
            limit(1)

          );

          magazaUnsubscribe = onSnapshot(uidQuery, async (uidSnap) => {
            if (auth.currentUser?.uid !== currentUser.uid) return;

            if (!uidSnap.empty) {
              setMagazaId(selectOwnedStoreId({ uidDocs: uidSnap.docs }));
              return;
            }

            setMagazaId(await legacyMagazaBul());
          }, async (error) => {
            console.error("UID mağaza kontrolü hatası:", error);
            if (auth.currentUser?.uid === currentUser.uid) {
              setMagazaId(await legacyMagazaBul());
            }
          });

        } catch (error) {

          console.error(
            "Mağaza kontrolü hatası:",
            error
          );

          setMagazaId(null);

        }

      }
    );

    return () => {
      unsub();
      if (magazaUnsubscribe) magazaUnsubscribe();
    };

  }, []);


  /* =========================================
     DIŞARI TIKLAYINCA MENÜ KAPAT
  ========================================= */

  useEffect(() => {

    function kapat(e) {

      if (
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {

        setMenuAcik(false);

      }

      if (
        searchRef.current &&
        !searchRef.current.contains(e.target)
      ) {

        setAramaAcik(false);

      }

    }

    document.addEventListener(
      "mousedown",
      kapat
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        kapat
      );

    };

  }, []);


  /* =========================================
     SCROLL
  ========================================= */

  useEffect(() => {

    function scrollKontrol() {

      setScrollY(window.scrollY);

    }

    window.addEventListener(
      "scroll",
      scrollKontrol
    );

    return () => {

      window.removeEventListener(
        "scroll",
        scrollKontrol
      );

    };

  }, []);


  /* =========================================
     ÇIKIŞ
  ========================================= */

  async function cikis() {

    try {

      await signOut(auth);

      setMenuAcik(false);

      navigate("/login");

    } catch (error) {

      console.error(
        "Çıkış hatası:",
        error
      );

    }

  }


  /* =========================================
     ARAMA
  ========================================= */

  function ara(e) {

    e.preventDefault();

    const temizArama =
      arama.trim();

    if (!temizArama) {

      navigate("/ilanlar");

      return;

    }

    setAramaAcik(false);

    navigate(
      "/ilanlar?search=" +
      encodeURIComponent(
        temizArama
      )
    );

  }


  /* =========================================
     ARAMA TEMİZLE
  ========================================= */

  function aramayiTemizle() {

    setArama("");

    navigate("/ilanlar");

  }


  /* =========================================
     MENÜ KAPAT
  ========================================= */

  function menuKapat() {

    setMenuAcik(false);

  }


  /* =========================================
     KULLANICI ADI
  ========================================= */

  function kullaniciAdi() {

    if (!user?.email) {

      return "Hesabım";

    }

    return user.email
      .split("@")[0];

  }


  /* =========================================
     YÜKLENİYOR
  ========================================= */

  if (user === undefined) {

    return (

      <header className="navbar navbar-loading">

        <div className="navbar-top">

          <Link
            to="/"
            className="navbar-logo"
          >

            <span className="logo-icon">
              🎁
            </span>

            <div className="logo-text">

              <span>
                Hediye
              </span>

              <b>
                AlSat
              </b>

            </div>

          </Link>

        </div>

      </header>

    );

  }


  return (

    <header
      className={
        `navbar ${
          scrollY > 20
            ? "navbar-scrolled"
            : ""
        }`
      }
    >

      {/* =====================================
          ÜST SATIR
      ===================================== */}

      <div className="navbar-top">


        {/* LOGO */}

        <Link
          to="/"
          className="navbar-logo"
          aria-label="HediyeAlSat Ana Sayfa"
        >

          <span className="logo-icon">
            🎁
          </span>

          <div className="logo-text">

            <span>
              Hediye
            </span>

            <b>
              AlSat
            </b>

          </div>

        </Link>


        {/* =================================
            ARAMA
        ================================= */}

        <form
          className={
            `navbar-search ${
              aramaAcik
                ? "search-active"
                : ""
            }`
          }
          onSubmit={ara}
          ref={searchRef}
        >

          <span className="search-icon">
            🔍
          </span>

          <input
            type="text"
            placeholder="Hediye, oyuncak, çiçek, takı ara..."
            value={arama}
            onFocus={() =>
              setAramaAcik(true)
            }
            onChange={(e) =>
              setArama(
                e.target.value
              )
            }
            aria-label="Ürün ara"
          />

          {arama && (

            <button
              type="button"
              className="search-clear"
              onClick={
                aramayiTemizle
              }
              aria-label="Aramayı temizle"
              title="Temizle"
            >
              ×
            </button>

          )}

          <button
            type="submit"
            className="search-button"
            aria-label="Ara"
          >

            Ara

          </button>

        </form>


        {/* =================================
            SAĞ TARAF
        ================================= */}

        <div className={`navbar-right${user ? "" : " navbar-right-guest"}`}>


          {/* FAVORİLER */}

          <Link
            className="nav-icon"
            to="/favorilerim"
            title="Favorilerim"
            aria-label="Favorilerim"
          >

            <span>
              ❤️
            </span>

          </Link>


          {/* SEPET */}

          <Link
            className="nav-icon"
            to="/sepet"
            title="Sepetim"
            aria-label="Sepetim"
          >

            <span>
              🛒
            </span>

          </Link>


          {/* MESAJLAR */}

          <Link
            className="nav-icon"
            to="/mesajlar"
            title="Mesajlar"
            aria-label="Mesajlar"
          >

            <span>
              💬
            </span>

          </Link>


          {/* ADMIN */}

          {user?.email === ADMIN_EMAIL && (

            <Link
              to="/admin"
              className="admin-link"
              title="Yönetim Paneli"
            >

              <button
                className="admin-btn"
              >

                👑
                <span>
                  Admin
                </span>

              </button>

            </Link>

          )}


          {/* =================================
              KULLANICI
          ================================= */}

          {user ? (

            <div
              className="navbar-user"
              ref={menuRef}
            >

              <button
                className={
                  `user-btn ${
                    menuAcik
                      ? "user-btn-active"
                      : ""
                  }`
                }
                onClick={() =>
                  setMenuAcik(
                    !menuAcik
                  )
                }
                aria-expanded={
                  menuAcik
                }
              >

                <span className="user-avatar">
                  👤
                </span>

                <span className="user-name">
                  {kullaniciAdi()}
                </span>

                <span
                  className={
                    `user-arrow ${
                      menuAcik
                        ? "arrow-up"
                        : ""
                    }`
                  }
                >
                  ▼
                </span>

              </button>


              {/* DROPDOWN */}

              {menuAcik && (

                <div
                  className="user-dropdown"
                >


                  {/* PROFİL BAŞLIK */}

                  <div className="dropdown-user-header">

                    <div className="dropdown-avatar">
                      👤
                    </div>

                    <div className="dropdown-user-info">

                      <strong>
                        {kullaniciAdi()}
                      </strong>

                      <small>
                        {user.email}
                      </small>

                    </div>

                  </div>


                  <div className="dropdown-divider" />


                  {/* PROFİL */}

                  <Link
                    to="/profil"
                    onClick={
                      menuKapat
                    }
                  >

                    <span>
                      👤
                    </span>

                    <div>
                      <strong>
                        Profil Bilgilerim
                      </strong>

                      <small>
                        Telefon ve konumunu yönet
                      </small>
                    </div>

                  </Link>


                  {/* İLANLARIM */}

                  <Link
                    to="/ilanlarim"
                    onClick={
                      menuKapat
                    }
                  >

                    <span>
                      📦
                    </span>

                    <div>
                      <strong>
                        İlanlarım
                      </strong>

                      <small>
                        Ürünlerini yönet
                      </small>
                    </div>

                  </Link>


                  {/* FAVORİLER */}

                  <Link
                    to="/favorilerim"
                    onClick={
                      menuKapat
                    }
                  >

                    <span>
                      ❤️
                    </span>

                    <div>
                      <strong>
                        Favorilerim
                      </strong>

                      <small>
                        Kaydettiğin ürünler
                      </small>
                    </div>

                  </Link>


                  {/* SİPARİŞLER */}

                  <Link
                    to="/siparislerim"
                    onClick={
                      menuKapat
                    }
                  >

                    <span>
                      📋
                    </span>

                    <div>
                      <strong>
                        Siparişlerim
                      </strong>

                      <small>
                        Siparişlerini takip et
                      </small>
                    </div>

                  </Link>


                  {/* AYARLAR */}

                  <Link
                    to="/ayarlar"
                    onClick={
                      menuKapat
                    }
                  >

                    <span>
                      ⚙️
                    </span>

                    <div>
                      <strong>
                        Ayarlar
                      </strong>

                      <small>
                        Hesap ayarları
                      </small>
                    </div>

                  </Link>


                  <div className="dropdown-divider" />


                  {/* MAĞAZA */}

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

                      <Link
                        to="/magazam"
                        onClick={
                          menuKapat
                        }
                        className="store-menu-link"
                      >

                        <span>
                          🏪
                        </span>

                        <div>
                          <strong>
                            Mağazam
                          </strong>

                          <small>
                            Mağazanı görüntüle ve yönet
                          </small>
                        </div>

                      </Link>


                      <Link
                        to="/seller"
                        onClick={
                          menuKapat
                        }
                        className="seller-menu-link"
                      >

                        <span>
                          📊
                        </span>

                        <div>
                          <strong>
                            Satıcı Paneli
                          </strong>

                          <small>
                            Sipariş, finans ve performansı yönet
                          </small>
                        </div>

                      </Link>

                    </>

                  ) : (

                    <Link
                      to="/magaza-olustur"
                      onClick={
                        menuKapat
                      }
                      className="create-store-link"
                    >

                      <span>
                        🏪
                      </span>

                      <div>
                        <strong>
                          Mağaza Oluştur
                        </strong>

                        <small>
                          Kendi mağazanı aç
                        </small>
                      </div>

                    </Link>

                  )}


                  <div className="dropdown-divider" />


                  {/* ÇIKIŞ */}

                  <button
                    className="logout-btn"
                    onClick={
                      cikis
                    }
                  >

                    <span>
                      🚪
                    </span>

                    <div>
                      <strong>
                        Çıkış Yap
                      </strong>

                      <small>
                        Hesabından çık
                      </small>
                    </div>

                  </button>


                </div>

              )}

            </div>

          ) : (

            /* GİRİŞ / ÜYELİK */

            <div className="guest-auth-actions" aria-label="Üyelik işlemleri">
              <Link to="/login" className="guest-auth-btn guest-login-btn">
                <span aria-hidden="true">👤</span>
                Giriş Yap
              </Link>

              <Link to="/login" className="guest-auth-btn guest-register-btn">
                Üye Ol
              </Link>
            </div>

          )}


          {/* =================================
              İLAN VER
          ================================= */}

          <Link
            to="/ilan-ver"
            className="add-link"
          >

            <button
              className="add-btn"
            >

              <span>
                ＋
              </span>

              <strong>
                İlan Ver
              </strong>

            </button>

          </Link>


        </div>

      </div>


      {/* =====================================
          ALT MENÜ
      ===================================== */}

      <nav
        className="navbar-menu"
        aria-label="Ana navigasyon"
      >

        <NavLink
          to="/"
          end
        >

          🏠
          <span>
            Ana Sayfa
          </span>

        </NavLink>


        <NavLink
          to="/ilanlar"
        >

          🛍️
          <span>
            İlanlar
          </span>

        </NavLink>


        <NavLink
          to="/magazalar"
        >

          🏪
          <span>
            Mağazalar
          </span>

        </NavLink>


        <NavLink
          to="/mesajlar"
        >

          💬
          <span>
            Mesajlar
          </span>

        </NavLink>


        <NavLink
          to="/ilanlar/kiralik"
        >

          🔑
          <span>
            Kiralık
          </span>

        </NavLink>


        <NavLink
          to="/gunun-firsatlari"
        >

          🔥
          <span>
            Günün Fırsatları
          </span>

        </NavLink>


        <NavLink
          to="/hediye-fikirleri"
        >

          💡
          <span>
            Hediye Fikirleri
          </span>

        </NavLink>

      </nav>


    </header>

  );

}


export default Navbar;
