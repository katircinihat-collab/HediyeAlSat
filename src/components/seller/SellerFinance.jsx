import "../../styles/pages/seller-finance.css";
import { calculateSellerFinanceMetrics } from "../../utils/sellerFinanceMetrics";

const money = (value) => Number(value || 0).toLocaleString("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function SellerFinance({ siparisler }) {
  const metrics = calculateSellerFinanceMetrics(siparisler);

  return <section className="seller-sales-summary">
    <h2 className="section-title">📊 Satış İstatistikleri</h2>
    <p className="finance-disclaimer">
      Bu alan ödemesi doğrulanmış satışların tarihsel özetidir. Çekilebilir tutarın tek kaynağı aşağıdaki Satıcı Cüzdanıdır.
    </p>

    <div className="finance-grid">
      <div className="finance-card green">
        <h3>Gerçekleşen Brüt Satış</h3>
        <h1>₺{money(metrics.grossSales)}</h1>
        <p>Ödemesi doğrulanmış, iptal/iade edilmemiş satışlar</p>
      </div>
      <div className="finance-card red">
        <h3>Platform Komisyonu</h3>
        <h1>₺{money(metrics.platformCommission)}</h1>
        <p>Gerçekleşen satışlar üzerinden %8</p>
      </div>
      <div className="finance-card purple">
        <h3>Satıcı Net Satış Payı</h3>
        <h1>₺{money(metrics.sellerNetShare)}</h1>
        <p>Brüt satış eksi platform komisyonu; çekilebilir bakiye değildir</p>
      </div>
      <div className="finance-card orange">
        <h3>Tamamlanmış Sipariş</h3>
        <h1>{metrics.completedOrderCount}</h1>
        <p>Ödemesi doğrulanmış finansal satış adedi</p>
      </div>
    </div>
  </section>;
}

export default SellerFinance;
