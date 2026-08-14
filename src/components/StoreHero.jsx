import { Link } from "react-router-dom";

import "../styles/components/store-hero.css";

function StoreHero({

  magaza,

  takipEdiyor,

  takipEt,

  takipBirak,

  ortalamaPuan,

  oySayisi

}) {

  return (

    <>

      {magaza.kapak && (

        <img
          src={magaza.kapak}
          alt={magaza.magazaAdi}
          className="store-cover"
        />

      )}

      <div className="store-hero">

        <div className="store-logo-area">

          {magaza.logo && (

            <img
              src={magaza.logo}
              alt={magaza.magazaAdi}
              className="store-logo"
            />

          )}

        </div>

        <div className="store-main-info">

          {magaza.premium && (

            <div className="premium-badge">

              👑 Premium Mağaza

            </div>

          )}

          <h1>

            🏪 {magaza.magazaAdi}

          </h1>

          <div className="store-rating">

            ⭐ {ortalamaPuan || 0}

            <span>

              ({oySayisi} Oy)

            </span>

          </div>

          <p>

            📍 {magaza.sehir}

          </p>

          <p>

            📞 {magaza.telefon}

          </p>

          <div className="store-actions">

            {

              takipEdiyor ?

              (

                <button
                  className="follow-btn"
                  onClick={takipBirak}
                >

                  💔 Takipten Çık

                </button>

              )

              :

              (

                <button
                  className="follow-btn"
                  onClick={takipEt}
                >

                  ❤️ Takip Et

                </button>

              )

            }

            <Link to="/magazalar">

              <button className="back-btn">

                ← Mağazalara Dön

              </button>

            </Link>

          </div>

        </div>

      </div>

    </>

  );

}

export default StoreHero;