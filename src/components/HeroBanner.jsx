import { Link } from "react-router-dom";
import "../styles/layout/hero.css";

function HeroBanner() {
  return (
    <section className="hero">

      <div className="hero-overlay">

        <div className="hero-content">

          <span className="hero-badge">
            🎁 Türkiye'nin En Büyük Hediye Pazaryeri
          </span>

          <h1>
            Her Özel Gün İçin
            <br />
            <span>En Güzel Hediyeler</span>
          </h1>

          <p>
            Binlerce güvenilir mağaza • Güvenli ödeme •
            Hızlı kargo • Yapay zekâ destekli hediye önerileri
          </p>

          <div className="hero-search">

            <input
              type="text"
              placeholder="🎁 Hediye, oyuncak, çiçek, elektronik ara..."
            />

            <button>
              🔍 Ara
            </button>

          </div>

          <div className="hero-buttons">

            <Link to="/ilan-ver">

              <button className="hero-primary">

                ➕ Ücretsiz İlan Ver

              </button>

            </Link>

            <Link to="/magazalar">

              <button className="hero-secondary">

                🏪 Mağazaları Keşfet

              </button>

            </Link>

          </div>

          <div className="hero-features">

            <div className="hero-item">

              🚚
              <strong>Ücretsiz Kargo</strong>

            </div>

            <div className="hero-item">

              🔒
              <strong>Güvenli Ödeme</strong>

            </div>

            <div className="hero-item">

              ⭐
              <strong>5000+ Ürün</strong>

            </div>

            <div className="hero-item">

              🏪
              <strong>Onaylı Mağazalar</strong>

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}

export default HeroBanner;