import "../styles/components/store-about.css";

function StoreAbout({ magaza }) {

  return (

    <section className="store-about">

      <h2>

        🏪 Mağaza Hakkında

      </h2>

      <div className="about-card">

        <div className="about-item">

          <span className="about-label">

            🏪 Mağaza Adı

          </span>

          <span className="about-value">

            {magaza.magazaAdi}

          </span>

        </div>

        <div className="about-item">

          <span className="about-label">

            📍 Şehir

          </span>

          <span className="about-value">

            {magaza.sehir || "-"}

          </span>

        </div>

        <div className="about-item">

          <span className="about-label">

            📞 Telefon

          </span>

          <span className="about-value">

            {magaza.telefon || "-"}

          </span>

        </div>

        <div className="about-item">

          <span className="about-label">

            📧 E-posta

          </span>

          <span className="about-value">

            {magaza.email || "-"}

          </span>

        </div>

        <div className="about-description">

          <h3>

            📄 Açıklama

          </h3>

          <p>

            {magaza.aciklama ||

              "Bu mağaza henüz açıklama eklememiş."}

          </p>

        </div>

      </div>

    </section>

  );

}

export default StoreAbout;