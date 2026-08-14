import "../styles/layout/navbar.css";

import {
  collection,
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

  const [user, setUser] = useState(undefined);
  const [magazaId, setMagazaId] = useState(null);

  const [menuAcik, setMenuAcik] = useState(false);

  const [arama, setArama] = useState("");

  const ADMIN_EMAIL = "alper54nihat@hediyealsat.com";
  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (currentUser) => {

      setUser(currentUser);

      if (currentUser) {

        const q = query(

          collection(db, "magazalar"),

          where("sahip", "==", currentUser.email)

        );

        const snap = await getDocs(q);

        if (!snap.empty) {

          setMagazaId(snap.docs[0].id);

        } else {

          setMagazaId(null);

        }

      } else {

        setMagazaId(null);

      }

    });

    return () => unsub();

  }, []);

  useEffect(() => {

    function kapat(e) {

      if (

        menuRef.current &&

        !menuRef.current.contains(e.target)

      ) {

        setMenuAcik(false);

      }

    }

    document.addEventListener("mousedown", kapat);

    return () => {

      document.removeEventListener("mousedown", kapat);

    };

  }, []);

  async function cikis() {

    await signOut(auth);

    navigate("/login");

  }

  function ara(e) {

    e.preventDefault();

    if (!arama.trim()) return;

    navigate(

      "/?arama=" + encodeURIComponent(arama)

    );

  }

  if (user === undefined) {

    return null;

  }
return (

<header className="navbar">

  <div className="navbar-top">

    <Link
      to="/"
      className="navbar-logo"
    >

      🎁

      <div className="logo-text">

        <span>Hediye</span>

        <b>AlSat</b>

      </div>

    </Link>

    <form
      className="navbar-search"
      onSubmit={ara}
    >

      <input
        type="text"
        placeholder="🎁 Hediye, oyuncak, çiçek ara..."
        value={arama}
        onChange={(e)=>setArama(e.target.value)}
      />

      <button type="submit">

        🔍

      </button>

    </form>

    <div className="navbar-right">

      <Link className="nav-icon" to="/favoriler">

        ❤️

      </Link>

      <Link className="nav-icon" to="/sepet">

        🛒

      </Link>

      <Link className="nav-icon" to="/mesajlar">

        💬

      </Link>

      {user?.email===ADMIN_EMAIL && (

        <Link to="/admin">

          <button className="admin-btn">

            👑 Admin

          </button>

        </Link>

      )}

      {user ? (

        <div
          className="navbar-user"
          ref={menuRef}
        >

          <button
            className="user-btn"
            onClick={()=>setMenuAcik(!menuAcik)}
          >

            👤 {user.email.split("@")[0]} ▼

          </button>
          {menuAcik && (

            <div className="user-dropdown">

              <Link
                to="/profil"
                onClick={()=>setMenuAcik(false)}
              >

                👤 Profilim

              </Link>

              <Link
                to="/ilanlarim"
                onClick={()=>setMenuAcik(false)}
              >

                📦 İlanlarım

              </Link>

              <Link
                to="/favoriler"
                onClick={()=>setMenuAcik(false)}
              >

                ❤️ Favorilerim

              </Link>

              <Link
                to="/siparislerim"
                onClick={()=>setMenuAcik(false)}
              >

                📋 Siparişlerim

              </Link>

              <Link
                to="/ayarlar"
                onClick={()=>setMenuAcik(false)}
              >

                ⚙️ Ayarlar

              </Link>

              <hr/>

              {magazaId ? (

                <>

                  <Link
                    to={`/magaza/${magazaId}`}
                    onClick={()=>setMenuAcik(false)}
                  >

                    🏪 Mağazam

                  </Link>

                  <Link
                    to="/seller"
                    onClick={()=>setMenuAcik(false)}
                  >

                    📊 Satıcı Paneli

                  </Link>

                </>

              ) : (

                <Link
                  to="/magaza-olustur"
                  onClick={()=>setMenuAcik(false)}
                >

                  🏪 Mağaza Oluştur

                </Link>

              )}

              <hr/>

              <button
                className="logout-btn"
                onClick={cikis}
              >

                🚪 Çıkış Yap

              </button>

            </div>

          )}

        </div>

      ) : (

        <Link to="/login">

          <button className="login-btn">

            Giriş Yap

          </button>

        </Link>

      )}

      <Link to="/ilan-ver">

        <button className="add-btn">

          + İlan Ver

        </button>

      </Link>

    </div>

  </div>
  <nav className="navbar-menu">

    <NavLink to="/">

      Ana Sayfa

    </NavLink>

    <NavLink to="/ilanlar">

      İlanlar

    </NavLink>

    <NavLink to="/magazalar">

      Mağazalar

    </NavLink>

    <NavLink to="/mesajlar">

      Mesajlar

    </NavLink>

    <NavLink to="/ilanlar/kiralik">

      Kiralık

    </NavLink>

  </nav>

</header>

);

}

export default Navbar;