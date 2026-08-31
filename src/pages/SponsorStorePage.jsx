
import { Link } from "react-router-dom";

import Navbar from "../components/Navbar";

import "../styles/pages/sponsor-store-page.css";

function SponsorStorePage() {

  return (
    <>
      <Navbar />

      <main className="sponsor-store-page">

        <div className="sponsor-store-container">

          <Link
            to="/"
            className="sponsor-store-back"
          >
            ← Sponsor Mağaza
          </Link>


          {/* BAŞLIK */}

          <section className="sponsor-store-hero">

            <div className="sponsor-store-icon">
              🏪
            </div>

            <h1>
              Sponsor Mağaza Başvurusu
            </h1>

            <p>
              Mağazanızı HediyeAlSat'ta öne çıkarın.
              Daha fazla müşteriye ulaşın ve satışlarınızı artırın.
            </p>

          </section>


          {/* AVANTAJLAR */}

          <section className="sponsor-store-content">

            <h2>
              Sponsor Mağaza Avantajları
            </h2>

            <p>
              Mağazanızı daha fazla müşteriye ulaştırın
              ve HediyeAlSat'ta daha görünür olun.
            </p>


            <div className="sponsor-store-features">


              {/* 1 */}

              <div className="sponsor-feature">

                <div className="sponsor-feature-icon">
                  ⭐
                </div>

                <div className="sponsor-feature-text">

                  <strong>
                    Öne Çıkın
                  </strong>

                  <span>
                    Mağazanız ana sayfada daha görünür olsun.
                  </span>

                </div>

              </div>


              {/* 2 */}

              <div className="sponsor-feature">

                <div className="sponsor-feature-icon">
                  👥
                </div>

                <div className="sponsor-feature-text">

                  <strong>
                    Daha Fazla Müşteri
                  </strong>

                  <span>
                    Ürünlerinizi daha fazla kişiye ulaştırın.
                  </span>

                </div>

              </div>


              {/* 3 */}

              <div className="sponsor-feature">

                <div className="sponsor-feature-icon">
                  📈
                </div>

                <div className="sponsor-feature-text">

                  <strong>
                    Satışlarınızı Artırın
                  </strong>

                  <span>
                    Sponsor mağaza avantajlarından yararlanın.
                  </span>

                </div>

              </div>

            </div>


            {/* BAŞVURU BUTONU */}

            <div className="sponsor-application-box">

              <div className="sponsor-application-icon">
                📝
              </div>

              <div>

                <h3>
                  Sponsor Mağaza Başvurusu
                </h3>

                <p>
                  Mağazanızı sponsor mağaza olarak
                  öne çıkarmak için başvurun.
                </p>

              </div>

              <Link
                to="/sponsor-basvuru"
                className="sponsor-store-button"
              >
                🚀 Başvuru Formuna Git
              </Link>

            </div>


          </section>


          {/* BİLGİ */}

          <section className="sponsor-store-info">

            <strong>
              ℹ️ Başvuru Süreci
            </strong>

            <p>
              Başvurunuz HediyeAlSat ekibi tarafından
              incelendikten sonra sizinle iletişime geçilecektir.
            </p>

          </section>


        </div>

      </main>

    </>
  );

}

export default SponsorStorePage;