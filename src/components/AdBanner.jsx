import "../styles/components/ad-banner.css";

function AdBanner() {

  return (

    <section className="ad-banner">

      <div className="ad-card red">

        <h3>🔥 Süper İndirim</h3>

        <p>Bugüne özel fırsatları kaçırmayın.</p>

      </div>

      <div className="ad-card orange">

        <h3>🎁 Hediye Fikirleri</h3>

        <p>Sevdiklerinize en güzel hediyeler burada.</p>

      </div>

      <div className="ad-card chocolate">

        <h3>🏪 Sponsor Mağaza</h3>

        <p>Mağazanızı burada öne çıkarın.</p>

      </div>

    </section>

  );

}

export default AdBanner;