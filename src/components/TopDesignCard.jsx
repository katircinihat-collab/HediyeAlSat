import { Link } from "react-router-dom";

const medals = ["🥇", "🥈", "🥉"];

function TopDesignCard({ design, voted = false, voting = false, onVote, large = false }) {
  const price = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" })
    .format(Number(design.fiyat || 0));

  return (
    <article className={`top-design-card${large ? " top-design-card-large" : ""}`}>
      <div className="top-design-rank" aria-label={`${design.sira}. sıra`}>
        {medals[design.sira - 1] || design.sira}
      </div>
      <Link className="top-design-preview" to={`/ilan/${design.id}`}>
        {design.resim ? <img src={design.resim} alt={design.baslik} /> : <span>🎨</span>}
      </Link>
      <div className="top-design-info">
        <div>
          <h3>{design.baslik || "İsimsiz tasarım"}</h3>
          {design.magazaAdi && <p>{design.magazaAdi}</p>}
        </div>
        <div className="top-design-meta">
          <strong>{price}</strong>
          <span>🗳️ {design.oySayisi || 0} Oy</span>
        </div>
        <div className="top-design-actions">
          {onVote && (
            <button type="button" className={voted ? "voted" : ""} disabled={voting} onClick={() => onVote(design.id, voted)}>
              {voting ? "İşleniyor..." : voted ? "✓ Oy Verildi" : "Oy Ver"}
            </button>
          )}
          <Link to={`/ilan/${design.id}`}>Detay / Satın Al</Link>
        </div>
      </div>
    </article>
  );
}

export default TopDesignCard;
