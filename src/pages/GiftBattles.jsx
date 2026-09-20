import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import SEO from "../components/SEO";
import CommunityGiftBattleArena from "../components/CommunityGiftBattleArena";
import { endCommunityBattle, getCommunityBattle, getCommunityBattles, voteCommunityBattle } from "../services/giftBattleApi";

const LocalGiftBattlePreview = import.meta.env.DEV ? lazy(() => import("../components/GiftBattleDevPreview")) : null;
const showLocalPreview = import.meta.env.DEV && typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

export default function GiftBattles() {
  const { battleId } = useParams(); const navigate = useNavigate(); const location = useLocation();
  const [user, setUser] = useState(auth.currentUser); const [battle, setBattle] = useState(null); const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [xp, setXp] = useState(null); const [copied, setCopied] = useState(false);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => { let active = true; setLoading(true); setError(""); const load = battleId ? getCommunityBattle(battleId).then((d) => { if (active) setBattle(d.battle); }) : getCommunityBattles().then((d) => { if (active) setFeed(d.battles || []); }); load.catch((e) => active && setError(e.message)).finally(() => active && setLoading(false)); return () => { active = false; }; }, [battleId, user]);
  async function vote(choice) { if (!user) return navigate("/login", { state: { from: location.pathname } }); if (busy) return; setBusy(true); setError(""); try { const data = await voteCommunityBattle(battle.id, choice); setBattle(data.battle); setXp(data.xp); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function endBattle() { if (busy || !window.confirm("Kapışmayı şimdi bitirmek istiyor musun? Yeni oy kabul edilmeyecek.")) return; setBusy(true); try { setBattle((await endCommunityBattle(battle.id)).battle); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  const shareUrl = battle ? `${window.location.origin}/kapisma/${battle.id}` : "";
  async function copyLink() { try { await navigator.clipboard.writeText(shareUrl); setCopied(true); } catch { window.prompt("Bağlantıyı kopyala", shareUrl); } }
  if (loading) return <main className="community-battle-page"><p>Kapışmalar yükleniyor...</p></main>;
  if (error && !battle && !feed.length) return <main className="community-battle-page"><p role="alert">{error}</p><button onClick={() => window.location.reload()}>Tekrar Dene</button></main>;
  return <main className="community-battle-page">
    {showLocalPreview && !battleId && LocalGiftBattlePreview && <Suspense fallback={<p>Önizleme hazırlanıyor...</p>}><LocalGiftBattlePreview /></Suspense>}
    <SEO title={battle ? "Hangi hediye daha iyi? Oyunu ver | HediyeAlSat" : "Hediye Kapışmaları | HediyeAlSat"} description={battle?.question || "İki hediye arasında topluluğun seçimine katıl."} canonical={`https://hediyealsat.com${battle ? `/kapisma/${battle.id}` : "/kapismalar"}`} />
    {battle ? <><CommunityGiftBattleArena battle={battle} busy={busy} onVote={vote} />
      {xp && <aside className="battle-xp" aria-live="polite"><b>⭐ Günlük Kapışma XP’si: {xp.progress} / 3 oy</b><span>{xp.awarded ? "🎉 +5 XP KAZANDIN!" : xp.completed ? "Bugünkü +5 XP ödülünü tamamladın." : `${3 - xp.progress} kapışmaya daha oy ver → +5 XP`}</span></aside>}
      {error && <p role="alert">{error}</p>}<div className="battle-actions"><a href={`https://wa.me/?text=${encodeURIComponent(`⚔️ İki hediye arasında kaldım! Sence hangisini almalıyım? 🎁\nOyunu ver: ${shareUrl}`)}`} target="_blank" rel="noreferrer">🟢 WhatsApp'ta Paylaş</a><button onClick={copyLink}>{copied ? "Bağlantı kopyalandı ✓" : "🔗 Linki Kopyala"}</button>{battle.isOwner && battle.status === "ACTIVE" && <button disabled={busy} onClick={endBattle}>Kapışmayı Bitir</button>}<Link to="/kapismalar">Sonraki Kapışma →</Link></div></>
      : <><header className="community-battle-feed-head"><span>KEŞFET · OYLA · KARAR VER</span><h1>⚔️ Hediye Kapışmaları</h1><p>Topluluğun kararsız kaldığı hediyelere fikrini söyle.</p></header>{feed.length ? <div className="community-battle-feed">{feed.map((item) => <Link key={item.id} to={`/kapisma/${item.id}`}><b>{item.question}</b><span>{item.productA.title} <em>VS</em> {item.productB.title}</span><small>Oyunu Ver →</small></Link>)}</div> : <section className="community-battle-empty"><h2>Şu anda aktif bir Hediye Kapışması yok.</h2><p>İlk kapışmayı sen başlat! 🎁</p><Link to="/ilanlar">Hediye Keşfet</Link></section>}</>}
  </main>;
}
