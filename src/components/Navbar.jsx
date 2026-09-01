import "../styles/layout/navbar.css";

import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs
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


function Navbar() {

  const navigate = useNavigate();
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const [user, setUser] = useState(undefined);
  const [magazaId, setMagazaId] = useState(null);

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

    const unsub = onAuthStateChanged(
      auth,
      async (currentUser) => {

        setUser(currentUser);

        if (!currentUser) {

          setMagazaId(null);

          return;

        }

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
            )

          );

          const uidSnap = await getDocs(uidQuery);

          const emailSnap = uidSnap.empty
            ? await getDocs(query(
              collection(db, "magazalar"),
              where("sahip", "==", currentUser.email)
            ))
            : null;

          let bulunanMagazaId = !uidSnap.empty
            ? uidSnap.docs[0].id
            : emailSnap?.docs[0]?.id;

          if (!bulunanMagazaId) {
            const legacySnap = await getDoc(
              doc(db, "magazalar", currentUser.email)
            );

            if (legacySnap.exists()) bulunanMagazaId = legacySnap.id;
          }

          if (bulunanMagazaId) {

            setMagazaId(bulunanMagazaId);

          } else {

            setMagazaId(null);

          }

        } catch (error) {

          console.error(
            "Mağaza kontrolü hatası:",
            error
          );

          setMagazaId(null);

        }

      }
    );

    return () => unsub();

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

      navigate("/");

      return;

    }

    setAramaAcik(false);

    navigate(
      "/?arama=" +
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

    navigate("/");

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

        <div className="navbar-right">


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

                  {magazaId ? (

                    <>

                      <Link
                        to={
                          `/magaza/${magazaId}`
                        }
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
                            Mağazanı görüntüle
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
                            Satışlarını yönet
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

            /* GİRİŞ */

            <Link
              to="/login"
              className="login-link"
            >

              <button
                className="login-btn"
              >

                <span>
                  👤
                </span>

                Giriş Yap

              </button>

            </Link>

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
