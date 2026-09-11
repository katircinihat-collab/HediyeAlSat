import { Link, useSearchParams } from "react-router-dom";

function PaymentSuccess() {

  const [searchParams] = useSearchParams();
  const listingBoost = searchParams.get("type") === "listing-boost";
  const listingId = searchParams.get("listingId") || "";

  return (

    <div className="success-page">

      <div className="success-card">

        <h1>🎉 Ödeme Başarılı</h1>

        <p>
          {listingBoost ? "İlanınız başarıyla öne çıkarıldı." : "Siparişiniz başarıyla oluşturuldu."}
        </p>

        <div className="success-info">

          <h3>✅ Ödeme Alındı</h3>

          <p>
            {listingBoost ? "Öne çıkarma süreniz güvenli ödeme onayından sonra başlatıldı." : "Satıcı siparişinizi hazırlamaya başlayacak."}
          </p>

        </div>

        <div className="success-buttons">

          <Link to={listingBoost ? "/ilanlarim" : "/siparislerim"}>

            <button>

              {listingBoost ? "📦 İlanlarım" : "📦 Siparişlerim"}

            </button>

          </Link>

          <Link to="/">

            <button>

              🏠 Ana Sayfa

            </button>

          </Link>

          <Link to={listingBoost && listingId ? `/ilan/${listingId}` : "/ilanlar"}>

            <button>

              {listingBoost ? "👁️ İlanı Görüntüle" : "🛍️ Alışverişe Devam Et"}

            </button>

          </Link>

        </div>

      </div>

    </div>

  );

}

export default PaymentSuccess;
