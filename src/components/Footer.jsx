import "../styles/layout/footer.css";
import { Link } from "react-router-dom";

function Footer() {

  return (

    <footer className="footer">

      <div className="footer-top">

        <div className="footer-logo">

          <h2>🎁 HediyeAlSat</h2>

          <p>

            Türkiye'nin en güvenli hediye pazaryeri.
            Binlerce satıcı ve on binlerce ürün tek platformda.

          </p>

        </div>

        <div>

          <h3>Kurumsal</h3>

          <Link to="/">Hakkımızda</Link>

          <Link to="/">Blog</Link>

          <Link to="/">Kariyer</Link>

          <Link to="/">Basında Biz</Link>

        </div>

        <div>

          <h3>Yardım</h3>

          <Link to="/">Sık Sorulan Sorular</Link>

          <Link to="/">İletişim</Link>

          <Link to="/">Gizlilik Politikası</Link>

          <Link to="/">Kullanım Şartları</Link>

        </div>

        <div>

          <h3>Satıcı</h3>

          <Link to="/magaza-olustur">

            Mağaza Aç

          </Link>

          <Link to="/seller">

            Satıcı Paneli

          </Link>

          <Link to="/ilan-ver">

            Ürün Yayınla

          </Link>

        </div>

        <div>

          <h3>Bizi Takip Edin</h3>

          <div className="socials">

            <a href="#">📘</a>

            <a href="#">📷</a>

            <a href="#">▶️</a>

            <a href="#">💼</a>

          </div>

        </div>

      </div>

      <div className="footer-bottom">

        © 2026 HediyeAlSat • Tüm Hakları Saklıdır.

      </div>

    </footer>

  );

}

export default Footer;