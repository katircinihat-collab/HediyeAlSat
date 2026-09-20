import { useMemo, useState } from "react";
import CommunityGiftBattleArena from "./CommunityGiftBattleArena";

const products = {
  A: { id: "preview-red", title: "Kırmızı Hediye Kutusu", image: "/og-image.svg", price: 549, storeName: "Örnek Mağaza", available: true },
  B: { id: "preview-blue", title: "Mavi Masaüstü Hediye Seti", image: "/og-image.svg", price: 629, storeName: "Örnek Tasarım", available: true }
};

const scenarios = {
  unvoted: { label: "Oy verilmemiş", selectedChoice: null, results: null },
  voted: { label: "Oy verilmiş / sonuç", selectedChoice: "A", results: { votesA: 68, votesB: 32, totalVotes: 100, percentageA: 68, percentageB: 32 } },
  creator: { label: "Creator", isOwner: true, results: { votesA: 31, votesB: 19, totalVotes: 50, percentageA: 62, percentageB: 38 } },
  ended: { label: "Ended", status: "ENDED", results: { votesA: 67, votesB: 33, totalVotes: 100, percentageA: 67, percentageB: 33 } },
  tie: { label: "Tie", status: "ENDED", results: { votesA: 25, votesB: 25, totalVotes: 50, percentageA: 50, percentageB: 50 } },
  unavailable: { label: "Ürün unavailable", status: "ENDED", productBUnavailable: true, results: { votesA: 12, votesB: 8, totalVotes: 20, percentageA: 60, percentageB: 40 } }
};

export default function GiftBattleDevPreview() {
  const [scenario, setScenario] = useState("unvoted");
  const [xp, setXp] = useState(0);
  const current = scenarios[scenario];
  const battle = useMemo(() => ({
    id: "local-preview", question: "Doğum günü için hangisini seçmeliyim?", ownerName: "Local Önizleme", status: current.status || "ACTIVE",
    productA: products.A, productB: { ...products.B, available: !current.productBUnavailable }, isOwner: current.isOwner || false,
    selectedChoice: current.selectedChoice || null, results: current.results || null
  }), [current]);
  return <section className="gift-battle-dev-preview" aria-labelledby="gift-battle-preview-title">
    <header><span>LOCALHOST · GELİŞTİRME</span><h2 id="gift-battle-preview-title">🧪 Hediye Kapışması Görsel Önizleme</h2><p>Yalnız local React state kullanır; backend, Firestore ve XP’ye istek göndermez.</p></header>
    <div className="gift-battle-preview-controls">
      <label>Battle durumu<select value={scenario} onChange={(event) => setScenario(event.target.value)}>{Object.entries(scenarios).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
      <label>XP ilerlemesi<select value={xp} onChange={(event) => setXp(Number(event.target.value))}>{[0, 1, 2, 3].map((value) => <option key={value} value={value}>{value} / 3</option>)}</select></label>
    </div>
    <CommunityGiftBattleArena battle={battle} onVote={() => setScenario("voted")} />
    <aside className="battle-xp"><b>⭐ Günlük Kapışma XP’si: {xp} / 3 oy</b><span>{xp === 3 ? "🎉 +5 XP KAZANDIN!" : `${3 - xp} kapışmaya daha oy ver → +5 XP`}</span></aside>
    <div className="battle-actions"><button type="button">🟢 WhatsApp'ta Paylaş</button><button type="button">🔗 Linki Kopyala</button><button type="button">Sonraki Kapışma →</button>{scenario === "creator" && <button type="button">Kapışmayı Bitir</button>}</div>
    <details><summary>Empty ve error state</summary><div className="gift-battle-preview-states"><p>Şu anda aktif bir Hediye Kapışması yok. İlk kapışmayı sen başlat! 🎁</p><p role="alert">Kapışmalar geçici olarak yüklenemedi. <button type="button">Tekrar Dene</button></p></div></details>
  </section>;
}
