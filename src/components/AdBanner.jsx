
import "../styles/components/ad-banner.css";
import { Link } from "react-router-dom";

function AdBanner() {

  return (

    <section className="ad-banner">

      {/* SÜPER İNDİRİM */}

      <Link
        to="/gunun-firsatlari"
        className="ad-card red"
      >

        <h3>
          🔥 Süper İndirim
        </h3>

        <p>
          Bugüne özel fırsatları kaçırmayın.
        </p>

      </Link>


      {/* HEDİYE FİKİRLERİ */}

      <Link
        to="/hediye-fikirleri"
        className="ad-card orange"
      >

        <h3>
          🎁 Hediye Fikirleri
        </h3>

        <p>
          Sevdiklerinize en güzel hediyeler burada.
        </p>

      </Link>


      {/* SPONSOR MAĞAZA */}

      <Link
        to="/sponsor-magaza"
        className="ad-card chocolate"
      >

        <h3>
          🏪 Sponsor Mağaza
        </h3>

        <p>
          Mağazanızı burada öne çıkarın.
        </p>

      </Link>

    </section>

  );

}

export default AdBanner;