import "../styles/components/store-stats.css";

function StoreStats({

  magaza,

  ilanSayisi,

  ortalamaPuan,

  oySayisi

}) {

  return (

    <section className="store-stats">

      <div className="stats-card">

        <div className="stat-item">

          <div className="stat-icon">

            ⭐

          </div>

          <div className="stat-info">

            <h3>

              {ortalamaPuan || 0}

            </h3>

            <p>

              Ortalama Puan

            </p>

          </div>

        </div>

        <div className="stat-item">

          <div className="stat-icon">

            🗳️

          </div>

          <div className="stat-info">

            <h3>

              {oySayisi || 0}

            </h3>

            <p>

              Toplam Oy

            </p>

          </div>

        </div>

        <div className="stat-item">

          <div className="stat-icon">

            👥

          </div>

          <div className="stat-info">

            <h3>

              {magaza?.takipci || 0}

            </h3>

            <p>

              Takipçi

            </p>

          </div>

        </div>

        <div className="stat-item">

          <div className="stat-icon">

            👁️

          </div>

          <div className="stat-info">

            <h3>

              {magaza?.goruntulenme || 0}

            </h3>

            <p>

              Görüntülenme

            </p>

          </div>

        </div>

        <div className="stat-item">

          <div className="stat-icon">

            📦

          </div>

          <div className="stat-info">

            <h3>

              {ilanSayisi || 0}

            </h3>

            <p>

              Aktif Ürün

            </p>

          </div>

        </div>

        <div className="stat-item">

          <div className="stat-icon">

            📍

          </div>

          <div className="stat-info">

            <h3>

              {magaza?.sehir || "-"}

            </h3>

            <p>

              Konum

            </p>

          </div>

        </div>

      </div>

    </section>

  );

}

export default StoreStats;