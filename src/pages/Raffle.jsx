import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth } from "../firebase";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import RaffleDrawExperience from "../components/raffle/RaffleDrawExperience";
import RaffleResultCard from "../components/raffle/RaffleResultCard";
import {
  cancelRaffle, getActiveRaffle, getRaffleMe, getRaffleMessages,
  getRaffleResult, getReceivedRaffleGiftStatus, joinRaffle, sendRaffleMessage, updateRaffleHint, updateRaffleDelivery
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
  const [resultRevealed, setResultRevealed] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [deliverySaved, setDeliverySaved] = useState(false);
  const [delivery, setDelivery] = useState({ fullName: "", phone: "", address: "", city: "", district: "" });
  const [receivedGift, setReceivedGift] = useState(null);
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
      if (ownData?.participation?.deliveryAddress) setDelivery(ownData.participation.deliveryAddress);
      if (active.event.status === "MATCHED" && ownData?.joined) {
        const [resultData, giftStatus] = await Promise.all([
          getRaffleResult(active.event.id, user),
          getReceivedRaffleGiftStatus(active.event.id, user)
        ]);
        setResult(resultData.recipient);
        setReceivedGift(giftStatus.gift || null);
      } else {
        setResult(null);
        setReceivedGift(null);
        setResultRevealed(false);
      }
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
    try { await joinRaffle(event.id, user, giftHint, delivery); setConfirming(false); await load(); }
    catch (joinError) { setError(joinError.message); }
    finally { setBusy(false); }
  }

  async function saveDelivery() {
    if (!event || !user || busy) return;
    setBusy(true); setError("");
    try { await updateRaffleDelivery(event.id, user, delivery); setDeliverySaved(true); await load(); }
    catch (deliveryError) { setError(deliveryError.message); }
    finally { setBusy(false); }
  }

  async function cancel() {
    if (!event || !user || busy || !window.confirm("Katılımınız iptal edilsin ve 100 XP iade edilsin mi?")) return;
    setBusy(true); setError("");
    try { await cancelRaffle(event.id, user); await load(); }
    catch (cancelError) { setError(cancelError.message); }
    finally { setBusy(false); }
  }

  async function saveHint() {
    if (!event || !user || busy) return;
    setBusy(true); setError("");
    try { await updateRaffleHint(event.id, user, giftHint); setNoteSaved(true); await load(); }
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
    <header className="raffle-hero"><div className="raffle-hero__visual" aria-hidden="true"><span>🎁</span><b>🎲</b><i>✨</i></div><div className="raffle-hero__content"><p>KURA · TOPLULUK SÜRPRİZİ</p><h1>🎁 HediyeAlSat Kurası</h1><strong>Hiç tanımadığın birine hediye al, hiç tanımadığın birinden hediye al.</strong><small>HediyeAlSat topluluğuna katıl, sana çıkan kişiyi keşfet ve onun için küçük bir sürpriz hazırla. Katılım tamamen gönüllüdür.</small>{event && <div className="raffle-hero__facts"><span>👥 <b>{event.participantCount}</b> katılımcı</span><span>⭐ <b>{event.xpCost} XP</b> katılım</span><span>🗓 <b>{new Date(event.joinEndAt).toLocaleDateString("tr-TR")}</b> son katılım</span><span>🎲 <b>{new Date(event.drawAt).toLocaleDateString("tr-TR")}</b> Kura</span></div>}</div></header>
    {loading ? <section className="raffle-state" role="status">Kura yükleniyor...</section>
      : error && !event ? <section className="raffle-state raffle-error" role="alert"><p>{error}</p><button type="button" onClick={load}>Tekrar Dene</button></section>
      : !event ? <section className="raffle-state"><h2>Şu anda aktif Kura yok</h2><p>Yeni topluluk etkinliği açıldığında burada görebilirsin.</p></section>
      : <>
        <nav className="raffle-steps" aria-label="Kura aşamaları"><span className={me?.joined ? "is-complete" : "is-active"}><b>1</b>{me?.joined ? "✓ Katıldın" : "Katıl"}</span><span className={me?.joined ? "is-active" : ""}><b>2</b>Kura beklensin</span><span className={event.status === "MATCHED" ? "is-active" : ""}><b>3</b>İsmin çekilsin</span><span className={result ? "is-active" : ""}><b>4</b>Sürprizini hazırla</span></nav>
        {event.status === "MATCHED" && me?.joined && result ? resultRevealed ? <><RaffleResultCard result={result} eventId={event.id} />{receivedGift && <section className="raffle-state raffle-gift-status"><h2>🎁 Kura hediyen</h2><p>{receivedGift.delivered ? "Teslim edildi" : receivedGift.status === "Kargoda" ? "Kargoya verildi" : "Hediyen hazırlanıyor"}</p>{receivedGift.shippingCompany && <small>{receivedGift.shippingCompany}{receivedGift.trackingNumber ? ` · Takip: ${receivedGift.trackingNumber}` : ""}</small>}</section>}</> : <RaffleDrawExperience onComplete={() => setResultRevealed(true)} /> : <section className="raffle-card">
          <div className="raffle-card__main"><p className={`raffle-status raffle-status--${event.status.toLowerCase()}`}>{event.status === "OPEN" ? "Katılım Açık" : event.status === "MATCHED" ? "Kura Çekildi" : "Yakında"}</p><h2>{event.title}</h2><p>{event.description}</p>
            <div className="raffle-metrics"><div><small>Kura çekimine</small><strong>{time?.done ? "Süre tamamlandı" : time?.text}</strong></div><div><small>Katılımcı</small><strong>{event.participantCount} / {event.minimumParticipantCount || 2}</strong></div><div><small>Katılım</small><strong>⭐ {event.xpCost} XP</strong></div>{event.suggestedGiftBudget && <div><small>🎁 Önerilen hediye bütçesi</small><strong>{event.suggestedGiftBudget.toLocaleString("tr-TR")} TL</strong><small>Bu tutar yalnızca öneridir; hediye değerinde alt veya üst sınır yoktur.</small></div>}</div>
            <div className="raffle-participant-progress"><div><span style={{ width: `${Math.min(100, event.participantCount / (event.minimumParticipantCount || 2) * 100)}%` }} /></div><p>{event.participantCount >= (event.minimumParticipantCount || 2) ? "✅ Minimum katılımcı sayısına ulaşıldı! Kura belirlenen zamanda çekilecek." : `Kuranın çekilebilmesi için ${(event.minimumParticipantCount || 2) - event.participantCount} kişi daha katılmalı.`}</p></div>
          </div>
          <aside className={`raffle-join ${me?.joined ? "raffle-join--joined" : "raffle-join--eligible"}`}>
            {user ? <>
              {me?.joined ? <><div className="raffle-joined"><strong>✓ KURAYA KATILDIN!</strong><span>Artık Kura listesindesin. Şimdi isimlerin çekilmesini bekle.</span></div><div className="raffle-joined__facts"><span>🎲 {time?.done ? "Çekim zamanı geldi" : time?.text}</span><span>👥 {event.participantCount} / {event.minimumParticipantCount || 2}</span><span>⭐ {event.xpCost} XP ile katıldın</span></div><label className="raffle-hint"><b>💌 Hediye Notum <small>(Opsiyonel)</small></b><span>Sana çıkacak kişiye küçük bir not bırak. Neleri sevdiğini anlatabilirsin.</span><textarea value={giftHint} onChange={(e) => { setGiftHint(e.target.value.slice(0, 240)); setNoteSaved(false); }} maxLength={240} placeholder="Örn. Kitap okumayı, kahveyi ve sade masaüstü aksesuarlarını severim." /><small className="raffle-hint__count">{giftHint.length} / 240</small></label><button type="button" className="raffle-secondary" onClick={saveHint} disabled={busy}>{busy ? "Kaydediliyor..." : "💌 Notumu Kaydet"}</button>{noteSaved && <small className="raffle-note-success" role="status">Hediye notun kaydedildi. 💌</small>}{event.status === "OPEN" && <><DeliveryFields delivery={delivery} setDelivery={setDelivery} /><button type="button" className="raffle-secondary" onClick={saveDelivery} disabled={busy}>{busy ? "Kaydediliyor..." : "📦 Teslimat Adresimi Güncelle"}</button>{deliverySaved && <small role="status">Teslimat adresin güncellendi.</small>}<button type="button" className="raffle-secondary" onClick={cancel} disabled={busy}>Katılımımı İptal Et</button></>}</>
                : event.status === "OPEN" ? <><span className="raffle-join__eyebrow">KATILIM DURUMU</span><h3>{(me?.availableXP ?? 0) >= event.xpCost ? "🎲 Kuraya Katılmaya Hazırsın" : "Bu Kura için biraz daha XP gerekiyor"}</h3><div className="raffle-join__balance"><span>⭐ Kullanılabilir XP <b>{me?.availableXP ?? 0} XP</b></span><span>🎟 Katılım bedeli <b>{event.xpCost} XP</b></span></div>{(me?.availableXP ?? 0) >= event.xpCost && <label className="raffle-hint"><b>💌 Hediye Notum <small>(Opsiyonel)</small></b><span>Sana çıkacak kişiye küçük bir not bırak. Neleri sevdiğini anlatabilirsin.</span><textarea value={giftHint} onChange={(e) => setGiftHint(e.target.value.slice(0, 240))} maxLength={240} placeholder="Örn. Kitap okumayı, kahveyi ve sade masaüstü aksesuarlarını severim." /><small className="raffle-hint__count">{giftHint.length} / 240</small></label>}<button type="button" className="raffle-join__cta" onClick={() => setConfirming(true)} disabled={busy || (me?.availableXP ?? 0) < event.xpCost}>🎲 Kuraya Katıl</button><small>{(me?.availableXP ?? 0) >= event.xpCost ? `Kuraya katıldığında ${event.xpCost} kullanılabilir XP kullanılacak. 100 XP yalnızca Kura katılım bedelidir; hediye ürününün ücreti ayrıca ödenir.` : `Katılım için ${event.xpCost} kullanılabilir XP gerekiyor.`}</small>{(me?.availableXP ?? 0) < event.xpCost && <Link className="raffle-xp-help" to="/profil">XP Nasıl Kazanılır?</Link>}</>
                  : <p>Katılım şu anda kapalı.</p>}
              {(me?.availableXP ?? 0) < event.xpCost && !me?.joined && <small>Katılım için yeterli kullanılabilir XP bulunmuyor.</small>}</>
              : <><p>Katılmak için hesabına giriş yapmalısın.</p><Link to="/login">Giriş Yap</Link></>}
          </aside>
        </section>}
        {error && <p className="raffle-inline-error" role="alert">{error}</p>}
        <section className="raffle-how"><header><p>KURA REHBERİ</p><h2>Nasıl Çalışır?</h2></header><div><article><span>1</span><b>⭐ 100 XP ile katıl</b></article><article><span>2</span><b>💌 Hediye notunu bırak</b></article><article><span>3</span><b>🎲 İsimler çekilsin</b></article><article><span>4</span><b>🎁 Sana çıkan kişi için sürprizini hazırla</b></article></div></section>
        <section className="raffle-chat"><header><div><h2>💬 Kura Sohbeti</h2><p>Katılımcılar burada etkinlik hakkında sohbet edebilir.</p><small>Telefon, adres, e-posta veya sosyal medya bilgisi paylaşma.</small></div></header>
          <div className="raffle-chat__messages">{messages.length ? messages.map((item) => <article key={item.id}><strong>{item.senderName}</strong><p>{item.message}</p><time>{item.createdAt ? new Date(item.createdAt).toLocaleString("tr-TR") : ""}</time></article>) : <p className="raffle-chat__empty">Henüz mesaj yok. İlk mesajı sen bırakabilirsin. 👋</p>}</div>
          {me?.joined ? <form onSubmit={send}><input value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} maxLength={500} placeholder="Kura hakkında bir şeyler yaz..." aria-label="Kura sohbet mesajı" /><button disabled={busy || !message.trim()}>Gönder</button></form> : <div className="raffle-chat__locked">Sohbete yazmak için Kuraya katılmalısın.</div>}
        </section>
      </>}
    {confirming && <div className="raffle-modal" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setConfirming(false); }}><section role="dialog" aria-modal="true" aria-labelledby="raffle-confirm-title"><h2 id="raffle-confirm-title">Kuraya katılımını onayla</h2><ul><li>Katılım bedeli 100 XP’dir; hediye ürünü ayrıca ödenir.</li><li>Kura çekilmeden önce vazgeçersen XP iade edilir.</li><li>Kura çekildikten sonra eşleşme kesindir.</li><li>Sana çıkan kişi için hediye hazırlamayı kabul edersin.</li><li>Senin adın da başka bir katılımcıya çıkar.</li></ul><DeliveryFields delivery={delivery} setDelivery={setDelivery} /><label className="raffle-hint"><b>💌 Hediye Notum <small>(Opsiyonel)</small></b><span>Sana çıkacak kişiye küçük bir not bırak. Neleri sevdiğini anlatabilirsin.</span><textarea value={giftHint} onChange={(e) => setGiftHint(e.target.value.slice(0, 240))} maxLength={240} placeholder="Örn. Kitap okumayı, kahveyi ve sade masaüstü aksesuarlarını severim." /><small className="raffle-hint__count">{giftHint.length} / 240</small></label><div><button type="button" className="raffle-secondary" onClick={() => setConfirming(false)} disabled={busy}>Vazgeç</button><button type="button" onClick={join} disabled={busy}>{busy ? "Katılım yapılıyor..." : "100 XP ile Katıl"}</button></div></section></div>}
  </main><Footer /></>;
}

export default Raffle;

function DeliveryFields({ delivery, setDelivery }) {
  const update = (key, value) => setDelivery((current) => ({ ...current, [key]: value }));
  return <fieldset className="raffle-delivery"><legend>📦 Kura Teslimat Adresi</legend><p>Bu adres sana gönderilecek Kura hediyesi için kullanılır. Sana hediye gönderecek katılımcı açık adresini göremez.</p><label>Ad Soyad<input value={delivery.fullName} onChange={(e) => update("fullName", e.target.value)} autoComplete="name" /></label><label>Telefon<input value={delivery.phone} onChange={(e) => update("phone", e.target.value)} inputMode="tel" autoComplete="tel" /></label><label>İl<input value={delivery.city} onChange={(e) => update("city", e.target.value)} autoComplete="address-level1" /></label><label>İlçe<input value={delivery.district} onChange={(e) => update("district", e.target.value)} autoComplete="address-level2" /></label><label className="raffle-delivery__wide">Açık adres<textarea value={delivery.address} onChange={(e) => update("address", e.target.value)} autoComplete="street-address" /></label></fieldset>;
}
