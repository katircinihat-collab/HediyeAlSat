import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { getMyGiftBattleVote, getTodayGiftBattle, voteGiftBattle } from "../services/giftBattleApi";
import redWarrior from "../assets/gift-battle/red-warrior.png";
import blueWarrior from "../assets/gift-battle/blue-warrior.png";
import "../styles/components/gift-battle.css";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

function BattleProduct({ accent, buttonLabel, product, selectedId, ownIds, busy, onVote }) {
  const ownProduct = ownIds.includes(product.id);
  const selected = selectedId === product.id;
  return (
    <article className={`gift-battle-product gift-battle-product-${accent} ${selected ? "selected" : ""}`}>
      <Link className="gift-battle-product-image" to={`/ilan/${product.id}`}>
        {product.resim ? <img src={product.resim} alt={product.baslik} /> : <span aria-hidden="true">🎁</span>}
      </Link>
      <div className="gift-battle-product-info">
        <Link to={`/ilan/${product.id}`}><h3>{product.baslik}</h3></Link>
        {product.magazaAdi && <p>{product.magazaAdi}</p>}
        <div className="gift-battle-product-meta">
          <strong>{money.format(product.fiyat)}</strong>
          {product.puan && <span>⭐ {product.puan}</span>}
        </div>
        <span className="gift-battle-votes">{product.oySayisi.toLocaleString("tr-TR")} oy</span>
        <button
          type="button"
          disabled={busy || Boolean(selectedId) || ownProduct}
          onClick={() => onVote(product.id)}
        >
          {ownProduct ? "Kendi ürünün" : selected ? "✓ Seçtin" : `👍 ${buttonLabel}`}
        </button>
      </div>
    </article>
  );
}

function GiftBattle() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [battle, setBattle] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [ownIds, setOwnIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    let active = true;
    getTodayGiftBattle()
      .then((data) => { if (active) setBattle(data.battle || null); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user || !battle) {
      setSelectedId("");
      setOwnIds([]);
      return;
    }
    getMyGiftBattleVote()
      .then((data) => {
        setSelectedId(data.selectedListingId || "");
        setOwnIds(data.ownListingIds || []);
      })
      .catch((requestError) => console.error("Kapışma oy bilgisi alınamadı:", requestError));
  }, [battle, user]);

  async function vote(listingId) {
    if (!user) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    if (busy || selectedId) return;
    setBusy(true);
    setError("");
    try {
      const data = await voteGiftBattle(listingId);
      setSelectedId(listingId);
      setBattle(data.battle);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (!loading && !battle) return null;

  return (
    <section className="gift-battle" aria-labelledby="gift-battle-title">
      <header className="gift-battle-heading">
        <span>GÜNÜN KARŞILAŞMASI</span>
        <h2 id="gift-battle-title">⚔️ Hediye Kapışması</h2>
      </header>

      {loading ? (
        <div className="gift-battle-loading">Kapışma hazırlanıyor...</div>
      ) : (
        <>
          <div className="gift-battle-arena">
            <p className="gift-battle-question">{battle.question}</p>
            <div className="battle-warrior battle-warrior-left" aria-hidden="true">
              <img src={redWarrior} alt="" />
            </div>
            <strong aria-hidden="true">VS</strong>
            <div className="battle-warrior battle-warrior-right" aria-hidden="true">
              <img src={blueWarrior} alt="" />
            </div>
          </div>

          <div className="gift-battle-products">
            <BattleProduct accent="left" buttonLabel="KIRMIZIYI SEÇ" product={battle.left} selectedId={selectedId} ownIds={ownIds} busy={busy} onVote={vote} />
            <BattleProduct accent="right" buttonLabel="MAVİYİ SEÇ" product={battle.right} selectedId={selectedId} ownIds={ownIds} busy={busy} onVote={vote} />
          </div>

          <div className="gift-battle-results" aria-label="Oy dağılımı">
            <div className="gift-battle-result-summary">
              <div className="gift-battle-result-left"><strong>{battle.left.oySayisi.toLocaleString("tr-TR")} Oy</strong><span>%{battle.leftPercentage}</span></div>
              <span className="gift-battle-result-status">{battle.totalVotes === 0 ? "Henüz oy yok" : battle.leftPercentage === battle.rightPercentage ? "Berabere" : ""}</span>
              <div className="gift-battle-result-right"><span>%{battle.rightPercentage}</span><strong>{battle.right.oySayisi.toLocaleString("tr-TR")} Oy</strong></div>
            </div>
            <div className="gift-battle-progress"><span style={{ width: `${battle.leftPercentage}%` }} /></div>
          </div>
          {selectedId && <p className="gift-battle-thanks">Oyun kaydedildi. Teşekkürler!</p>}
          {error && <p className="gift-battle-error" role="alert">{error}</p>}
        </>
      )}
    </section>
  );
}

export default GiftBattle;
