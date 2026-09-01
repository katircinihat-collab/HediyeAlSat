import "../styles/components/store-hero.css";

function StoreHero({ magaza, takipEdiyor, takipEt, takipBirak, ortalamaPuan, oySayisi, ilanSayisi, kategoriler }) {
  const magazaAdi = magaza.magazaAdi || magaza.adi || "Mağaza";
  const kapak = magaza.kapak || magaza.banner || "";
  const logo = magaza.logo || "";

  return (
    <section className="store-showcase-hero">
      <div
        className={kapak ? "store-cover has-image" : "store-cover store-cover-fallback"}
        style={kapak ? { backgroundImage: `url(${kapak})` } : undefined}
        role="img"
        aria-label={`${magazaAdi} kapak görseli`}
      />

      <div className="store-hero">
        <div className="store-logo-area">
          {logo ? (
            <img src={logo} alt={`${magazaAdi} logosu`} className="store-logo" />
          ) : (
            <div className="store-logo store-logo-placeholder" aria-hidden="true">🏪</div>
          )}
        </div>

        <div className="store-main-info">
          <h1>{magazaAdi}</h1>
          {magaza.aciklama && <p className="store-hero-description">{magaza.aciklama}</p>}

          <div className="store-hero-facts">
            {magaza.sehir && <span>📍 {magaza.sehir}</span>}
            <span>📦 {ilanSayisi} aktif ürün</span>
            {oySayisi > 0 && <span>⭐ {ortalamaPuan} ({oySayisi} oy)</span>}
          </div>

          {kategoriler.length > 0 && (
            <div className="store-category-chips" aria-label="Mağaza kategorileri">
              {kategoriler.map((kategori) => <span key={kategori}>{kategori}</span>)}
            </div>
          )}

          <div className="store-actions">
            <button type="button" className="follow-btn" onClick={takipEdiyor ? takipBirak : takipEt}>
              {takipEdiyor ? "✓ Takip Ediliyor" : "＋ Mağazayı Takip Et"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default StoreHero;
