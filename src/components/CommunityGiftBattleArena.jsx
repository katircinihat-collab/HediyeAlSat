import { Link } from "react-router-dom";
import "../styles/components/community-gift-battle.css";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

function ProductSide({ side, product, disabled, selected, onVote, results }) {
  const votes = side === "A" ? results?.votesA : results?.votesB;
  const percentage = side === "A" ? results?.percentageA : results?.percentageB;
  return <article className={`community-battle-side side-${side.toLowerCase()} ${selected ? "is-selected" : ""}`}>
    <span className="battle-flag" aria-hidden="true" />
    <Link to={`/ilan/${product.id}`} className="community-battle-image">{product.image ? <img src={product.image} alt={product.title} loading="lazy" /> : <span>🎁</span>}</Link>
    <div className="community-battle-copy"><h2>{product.title}</h2><p>{product.storeName}</p><strong>{money.format(product.price)}</strong></div>
    {results && <div className="community-battle-score"><b>%{percentage}</b><span>{votes} oy</span><i style={{ width: `${percentage}%` }} /></div>}
    {product.available === false ? <button disabled>Bu ürün artık satışta değil</button> : onVote ? <button type="button" disabled={disabled} onClick={() => onVote(side)} aria-label={`${product.title} ürününü seç`}>{selected ? "✓ SENİN OYUN" : "⚔️ Bunu Seç"}</button> : <Link className="community-battle-buy" to={`/ilan/${product.id}`}>🎁 Bunu Al</Link>}
  </article>;
}

export default function CommunityGiftBattleArena({ battle, busy = false, onVote }) {
  const ended = battle.status !== "ACTIVE";
  const canVote = onVote && !battle.isOwner && !battle.selectedChoice && !ended;
  const tied = battle.results && battle.results.totalVotes > 0 && battle.results.votesA === battle.results.votesB;
  return <section className="community-battle-arena" aria-label="Hediye Kapışması">
    <header><span>⚔️ HEDİYE KAPIŞMASI</span><h1>{ended ? "🏆 TOPLULUĞUN SEÇİMİ" : "Hangisi daha iyi hediye?"}</h1>{battle.question && <blockquote>💬 “{battle.question}”</blockquote>}<small>{battle.ownerName}</small></header>
    <div className="community-battle-versus">
      <ProductSide side="A" product={battle.productA} disabled={!canVote || busy} selected={battle.selectedChoice === "A"} onVote={canVote ? onVote : null} results={battle.results} />
      <strong className="community-battle-vs" aria-label="karşı">VS</strong>
      <ProductSide side="B" product={battle.productB} disabled={!canVote || busy} selected={battle.selectedChoice === "B"} onVote={canVote ? onVote : null} results={battle.results} />
    </div>
    {battle.isOwner && !ended && <p className="community-battle-state">⚔️ Kapışman devam ediyor. Sonuçları anlık görebilirsin.</p>}
    {battle.selectedChoice && <p className="community-battle-state">Oyun kaydedildi. Topluluk sonuçları açıldı.</p>}
    {tied && <p className="community-battle-state">🤝 BERABERE! Topluluk da senin kadar kararsız kaldı. 😄</p>}
  </section>;
}
