import { Link } from "react-router-dom";
import "../../styles/components/seller-card.css";

function SellerCard({

  ilan,

  takipEdiyor,

  takipEt,

  takipBirak

}) {

  return (

    <div className="seller-card">

      <div className="seller-top">

        <div className="seller-avatar">

          🏪

        </div>

        <div className="seller-info">

          <h3>

            {ilan.magazaAdi || "HediyeAlSat"}

          </h3>

          <span className="verified">

            ✔ Doğrulanmış Satıcı

          </span>

        </div>

      </div>

      <div className="seller-stats">

        <span>⭐ {ilan.puan || "5.0"}</span>

        <span>📦 {ilan.urunSayisi || 0} Ürün</span>

        <span>👥 {ilan.takipci || 0} Takipçi</span>

      </div>

      <div className="seller-location">

        📍 {ilan.sehir}

      </div>

      <div className="seller-security">

        🔒 Satıcı iletişim bilgileri güvenli ödeme sonrasında paylaşılır.

      </div>

      <div className="seller-buttons">

        <Link

          to={`/magaza/${ilan.magazaId}`}

          className="store-btn"

        >

          🏪 Mağazaya Git

        </Link>

        {

          takipEdiyor ?

          <button

            className="follow-btn"

            onClick={takipBirak}

          >

            💔 Takibi Bırak

          </button>

          :

          <button

            className="follow-btn"

            onClick={takipEt}

          >

            ❤️ Takip Et

          </button>

        }

      </div>

    </div>

  );

}

export default SellerCard;