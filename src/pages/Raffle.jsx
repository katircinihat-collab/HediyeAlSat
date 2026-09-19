import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  cancelRaffle, getActiveRaffle, getRaffleMe, getRaffleMessages,
  getRaffleResult, joinRaffle, sendRaffleMessage, updateRaffleHint
} from "../services/raffleApi";
import "../styles/pages/raffle.css";

function countdown(drawAt, now) {
  const remaining = Math.max(0, new Date(drawAt).getTime() - now);
  const minutes = Math.floor(remaining / 60000);
  return {
    done: remaining <= 0,
    text: `${Math.floor(minutes / 1440)} gün ${String(Math.floor((minutes % 1440) / 60)).padStart(2, "0")} saat ${String(minutes % 60).padStart(2, "0")} dakika`
  };
}

function Raffle() {
  const [user, setUser] = useState(auth.currentUser);
  const [event, setEvent] = useState(null);
  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [giftHint, setGiftHint] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [now, setNow] = useState(0);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    const firstUpdate = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => { window.clearTimeout(firstUpdate); window.clearInterval(timer); };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const active = await getActiveRaffle();
      setEvent(active.event);
      if (!active.event) { setMe(null); setMessages([]); return; }
      const [messageData, ownData] = await Promise.all([
        getRaffleMessages(active.event.id),
        user ? getRaffleMe(active.event.id, user) : Promise.resolve(null)
      ]);
      setMessages(messageData.messages || []);
      setMe(ownData);
      setGiftHint(ownData?.participation?.giftHint || "");
    } catch (loadError) {
      setError(loadError.message || "Kura bilgileri şu anda alınamıyor.");
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!event) return undefined;
    const timer = window.setInterval(() => getRaffleMessages(event.id).then((data) => setMessages(data.messages || [])).catch(() => undefined), 15000);
    return () => window.clearInterval(timer);
  }, [event]);

  const time = event?.drawAt && now ? countdown(event.drawAt, now) : null;

  async function join() {
    if (!event || !user || busy) return;
    setBusy(true); setError("");
    try { await joinRaffle(event.id, user, giftHint); setConfirming(false); await load(); }
    catch (joinError) { setError(joinError.message); }
    finally { setBusy(false); }
  }

  async function cancel() {
    if (!event || !user || busy || !window.confirm("Katılımınız iptal edilsin ve 100 XP iade edilsin mi?")) return;
    setBusy(true); setError("");
    try { await cancelRaffle(event.id, user); await load(); }
    catch (cancelError) { setError(cancelError.message); }
    finally { setBusy(false); }
  }

  async function showResult() {
    if (!event || !user || busy) return;
    setBusy(true); setError("");
    try { setResult((await getRaffleResult(event.id, user)).recipient); }
    catch (resultError) { setError(resultError.message); }
    finally { setBusy(false); }
  }

  async function saveHint() {
    if (!event || !user || busy) return;
    setBusy(true); setError("");
    try { await updateRaffleHint(event.id, user, giftHint); await load(); }
    catch (hintError) { setError(hintError.message); }
    finally { setBusy(false); }
  }

  async function send(eventSubmit) {
    eventSubmit.preventDefault();
    if (!event || !user || busy || !message.trim()) return;
    setBusy(true); setError("");
    try { await sendRaffleMessage(event.id, user, message.trim()); setMessage(""); setMessages((await getRaffleMessages(event.id)).messages || []); }
    catch (sendError) { setError(sendError.message); }
    finally { setBusy(false); }
  }

  return <><Navbar /><main className="raffle-page">
    <header className="raffle-hero"><span aria-hidden="true">🎲</span><div><p>KURA</p><h1>Hiç tanımadığın birine hediye al,<br />hiç tanımadığın birinden hediye al.</h1><small>Katılım tamamen gönüllüdür.</small></div></header>
    {loading ? <section className="raffle-state" role="status">Kura yükleniyor...</section>
      : error && !event ? <section className="raffle-state raffle-error" role="alert"><p>{error}</p><button type="button" onClick={load}>Tekrar Dene</button></section>
      : !event ? <section className="raffle-state"><h2>Şu anda aktif Kura yok</h2><p>Yeni topluluk etkinliği açıldığında burada görebilirsin.</p></section>
      : <>
        <section className="raffle-card">
          <div className="raffle-card__main"><p className={`raffle-status raffle-status--${event.status.toLowerCase()}`}>{event.status === "OPEN" ? "Katılım Açık" : event.status === "MATCHED" ? "Kura Çekildi" : "Yakında"}</p><h2>{event.title}</h2><p>{event.description}</p>
            <div className="raffle-metrics"><div><small>Kura çekimine</small><strong>{time?.done ? "Süre tamamlandı" : time?.text}</strong></div><div><small>Katılımcı</small><strong>{event.participantCount}</strong></div><div><small>Katılım</small><strong>⭐ {event.xpCost} XP</strong></div>{event.giftBudgetMin && <div><small>Önerilen bütçe</small><strong>{event.giftBudgetMin}–{event.giftBudgetMax || event.giftBudgetMin} TL</strong></div>}</div>
          </div>
          <aside className="raffle-join">
            {user ? <><p>Kullanılabilir XP</p><strong>{me?.availableXP ?? 0} XP ⭐</strong>
              {me?.joined ? <><div className="raffle-joined">Kuraya Katıldın ✓</div><label className="raffle-hint">Hediye ipucun<textarea value={giftHint} onChange={(e) => setGiftHint(e.target.value.slice(0, 240))} maxLength={240} placeholder="Sevdiğin şeylerden kısaca bahset..." /></label><button type="button" className="raffle-secondary" onClick={saveHint} disabled={busy}>İpucunu Kaydet</button>{event.status === "OPEN" && <button type="button" className="raffle-secondary" onClick={cancel} disabled={busy}>Katılımımı İptal Et</button>}{event.status === "MATCHED" && <button type="button" onClick={showResult} disabled={busy}>🎉 Sonucunu Gör</button>}</>
                : event.status === "OPEN" ? <button type="button" onClick={() => setConfirming(true)} disabled={busy || (me?.availableXP ?? 0) < event.xpCost}>Kuraya Katıl</button>
                  : <p>Katılım şu anda kapalı.</p>}
              {(me?.availableXP ?? 0) < event.xpCost && !me?.joined && <small>Katılım için yeterli kullanılabilir XP bulunmuyor.</small>}</>
              : <><p>Katılmak için hesabına giriş yapmalısın.</p><Link to="/login">Giriş Yap</Link></>}
          </aside>
        </section>
        {error && <p className="raffle-inline-error" role="alert">{error}</p>}
        <section className="raffle-chat"><header><div><h2>💬 Kura Sohbeti</h2><p>Telefon, adres, e-posta veya sosyal medya bilgisi paylaşma.</p></div>{event.status === "MATCHED" && me?.joined && <button type="button" onClick={showResult}>🎉 Sonucunu Gör</button>}</header>
          <div className="raffle-chat__messages">{messages.length ? messages.map((item) => <article key={item.id}><strong>{item.senderName}</strong><p>{item.message}</p><time>{item.createdAt ? new Date(item.createdAt).toLocaleString("tr-TR") : ""}</time></article>) : <p>Henüz mesaj yok. İlk sohbeti katılımcılar başlatabilir.</p>}</div>
          {me?.joined ? <form onSubmit={send}><input value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} maxLength={500} placeholder="Kura hakkında bir şeyler yaz..." aria-label="Kura sohbet mesajı" /><button disabled={busy || !message.trim()}>Gönder</button></form> : <div className="raffle-chat__locked">Sohbete yazmak için Kuraya katılmalısın.</div>}
        </section>
      </>}
    {confirming && <div className="raffle-modal" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setConfirming(false); }}><section role="dialog" aria-modal="true" aria-labelledby="raffle-confirm-title"><h2 id="raffle-confirm-title">Kuraya katılımını onayla</h2><ul><li>Katılım bedeli 100 XP’dir.</li><li>Kura çekilmeden önce vazgeçersen XP iade edilir.</li><li>Kura çekildikten sonra eşleşme kesindir.</li><li>Eşleştiğin kişiye hediye göndermeyi kabul edersin.</li><li>Sen de başka bir katılımcıdan hediye alırsın.</li></ul><label>Hediye ipucun (opsiyonel)<textarea value={giftHint} onChange={(e) => setGiftHint(e.target.value.slice(0, 240))} maxLength={240} placeholder="Kitap, kahve ve masaüstü aksesuarlarını severim." /></label><div><button type="button" className="raffle-secondary" onClick={() => setConfirming(false)} disabled={busy}>Vazgeç</button><button type="button" onClick={join} disabled={busy}>{busy ? "Katılım yapılıyor..." : "100 XP ile Katıl"}</button></div></section></div>}
    {result && <div className="raffle-modal" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setResult(null); }}><section role="dialog" aria-modal="true"><h2>🎉 Kura çekildi!</h2><p>Hediye göndereceğin kişi</p><strong className="raffle-result-name">{result.displayName}</strong><p>{result.giftHint || "Henüz hediye ipucu paylaşmamış."}</p><button type="button" onClick={() => setResult(null)}>Kapat</button></section></div>}
  </main><Footer /></>;
}

export default Raffle;
