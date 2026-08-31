import { Link } from "react-router-dom";

function PaymentSuccess() {

  return (

    <div className="success-page">

      <div className="success-card">

        <h1>🎉 Ödeme Başarılı</h1>

        <p>
          Siparişiniz başarıyla oluşturuldu.
        </p>

        <div className="success-info">

          <h3>✅ Ödeme Alındı</h3>

          <p>
            Satıcı siparişinizi hazırlamaya başlayacak.
          </p>

        </div>

        <div className="success-buttons">

          <Link to="/siparislerim">

            <button>

              📦 Siparişlerim

            </button>

          </Link>

          <Link to="/">

            <button>

              🏠 Ana Sayfa

            </button>

          </Link>

          <Link to="/ilanlar">

            <button>

              🛍️ Alışverişe Devam Et

            </button>

          </Link>

        </div>

      </div>

    </div>

  );

}

export default PaymentSuccess;
