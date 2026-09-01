import "../styles/components/store-stats.css";

function StoreStats({ ilanSayisi, ortalamaPuan, oySayisi }) {
  return (
    <section className="store-stats" aria-label="Mağaza istatistikleri">
      <div className="stat-card">
        <span className="stat-icon" aria-hidden="true">📦</span>
        <div className="stat-info"><h3>{ilanSayisi}</h3><p>Aktif Ürün</p></div>
      </div>

      {oySayisi > 0 && (
        <>
          <div className="stat-card">
            <span className="stat-icon" aria-hidden="true">⭐</span>
            <div className="stat-info"><h3>{ortalamaPuan}</h3><p>Gerçek Puan</p></div>
          </div>
          <div className="stat-card">
            <span className="stat-icon" aria-hidden="true">🗳️</span>
            <div className="stat-info"><h3>{oySayisi}</h3><p>Toplam Oy</p></div>
          </div>
        </>
      )}
    </section>
  );
}

export default StoreStats;
