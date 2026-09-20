import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { adminApi } from "../../config/adminApi";
import RaffleMatchList from "../raffle/RaffleMatchList";

const LocalRaffleTestMode = import.meta.env.DEV ? lazy(() => import("./RaffleTestMode")) : null;
const isLocalRaffleTestMode = import.meta.env.DEV && typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

const emptyForm = { title: "", description: "", status: "UPCOMING", joinStartAt: "", joinEndAt: "", drawAt: "", minimumParticipantCount: 2, suggestedGiftBudget: "" };
const localDateTime = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";
const formatDate = (value) => value ? new Date(value).toLocaleString("tr-TR") : "—";

function statusLabel(item, now) {
  if (item.status === "UPCOMING") return "YAKINDA";
  if (item.status === "MATCHED" || item.status === "COMPLETED") return "KURA ÇEKİLDİ";
  if (item.status === "CANCELLED") return "İPTAL EDİLDİ";
  if (item.status === "OPEN" && now >= new Date(item.drawAt).getTime()) return "ÇEKİME HAZIR";
  return "KATILIMA AÇIK";
}

function AdminRaffles() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState("");
  const [details, setDetails] = useState({});
  const [now, setNow] = useState(0);
  const formRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function load() {
    setLoading(true); setError("");
    try { setEvents((await adminApi("/raffles")).events || []); }
    catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy("save"); setError(""); setSuccess("");
    try {
      await adminApi(editingId ? `/raffles/${editingId}` : "/raffles", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setSuccess(editingId ? "Kura bilgileri güncellendi." : "Yeni Kura oluşturuldu.");
      setForm(emptyForm); setEditingId(""); await load();
    } catch (saveError) { setError(saveError.message); }
    finally { setBusy(""); }
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({ title: item.title, description: item.description || "", status: item.status, joinStartAt: localDateTime(item.joinStartAt), joinEndAt: localDateTime(item.joinEndAt), drawAt: localDateTime(item.drawAt), minimumParticipantCount: item.minimumParticipantCount || 2, suggestedGiftBudget: item.suggestedGiftBudget || "" });
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current?.querySelector("input")?.focus({ preventScroll: true });
    });
  }

  async function action(item, type) {
    if (busy) return;
    const message = type === "draw"
      ? "Kura çekildiğinde eşleşmeler kesinleşir ve katılımcılar artık katılımı iptal edemez. Devam etmek istiyor musun?"
      : "Bu Kura iptal edilecek. Uygun katılımcıların 100 XP katılım bedelleri idempotent olarak iade edilecek. Devam etmek istiyor musun?";
    if (!window.confirm(message)) return;
    setBusy(`${item.id}:${type}`); setError(""); setSuccess("");
    try {
      const response = await adminApi(`/raffles/${item.id}/${type}`, { method: "POST" });
      if (type === "draw") setSuccess(`🎉 Kura başarıyla çekildi! ${response.count || item.participantCount} katılımcı başarıyla eşleştirildi. Kura tamamlandı.`);
      else setSuccess(`Kura iptal edildi. ${response.refundedParticipants || 0} katılımcının XP bedeli iade edildi.`);
      await load();
    } catch (actionError) { setError(actionError.message); }
    finally { setBusy(""); }
  }

  async function openEvent(item) {
    if (busy) return;
    setBusy(`${item.id}:open`); setError(""); setSuccess("");
    try { await adminApi(`/raffles/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "OPEN" }) }); setSuccess("Kura katılıma açıldı."); await load(); }
    catch (updateError) { setError(updateError.message); }
    finally { setBusy(""); }
  }

  async function toggleDetails(item, type) {
    const key = `${item.id}:${type}`;
    if (details[key]?.open) {
      setDetails((current) => ({ ...current, [key]: { ...current[key], open: false } }));
      return;
    }
    setDetails((current) => ({ ...current, [key]: { open: true, loading: true, data: [] } }));
    try {
      const response = await adminApi(`/raffles/${item.id}/${type}`);
      setDetails((current) => ({ ...current, [key]: { open: true, loading: false, data: type === "participants" ? response.participants || [] : response.matches || [] } }));
    } catch (detailError) {
      setDetails((current) => ({ ...current, [key]: { open: true, loading: false, data: [], error: detailError.message } }));
    }
  }

  return <section className="admin-section admin-raffles">
    <header className="admin-raffles__header"><div><span>TOPLULUK ETKİNLİKLERİ</span><h2>🎲 Kura Yönetimi</h2><p>Kuraları oluşturun, katılımcıları izleyin ve zamanı geldiğinde güvenle eşleştirin.</p></div></header>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {success && <p className="admin-success" role="status" aria-live="polite">{success}</p>}
    <form ref={formRef} className="admin-raffle-form" onSubmit={save}>
      <h3 className="admin-raffle-form__title">{editingId ? "Kura Düzenleniyor" : "Yeni Kura Oluştur"}</h3>
      <label>Başlık<input required value={form.title} onChange={(e) => setForm((value) => ({ ...value, title: e.target.value }))} /></label>
      <label>Açıklama<textarea required value={form.description} onChange={(e) => setForm((value) => ({ ...value, description: e.target.value }))} /></label>
      <label>Durum<select value={form.status} onChange={(e) => setForm((value) => ({ ...value, status: e.target.value }))}><option value="UPCOMING">Yakında</option><option value="OPEN">Katılıma Açık</option></select></label>
      <label>Katılım başlangıcı<input required type="datetime-local" value={form.joinStartAt} onChange={(e) => setForm((value) => ({ ...value, joinStartAt: e.target.value }))} /></label>
      <label>Katılım bitişi<input required type="datetime-local" value={form.joinEndAt} onChange={(e) => setForm((value) => ({ ...value, joinEndAt: e.target.value }))} /></label>
      <label>Kura zamanı<input required type="datetime-local" value={form.drawAt} onChange={(e) => setForm((value) => ({ ...value, drawAt: e.target.value }))} /></label>
      <label>Minimum Katılımcı Sayısı<input required type="number" min="2" max="200" step="1" value={form.minimumParticipantCount} onChange={(e) => setForm((value) => ({ ...value, minimumParticipantCount: e.target.value }))} /><small>Kura, çekim zamanında ancak minimum katılımcı sayısına ulaşılmışsa çekilebilir.</small></label>
      <label>Önerilen Hediye Bütçesi (Opsiyonel)<input type="number" min="1" max="1000000" step="0.01" value={form.suggestedGiftBudget} onChange={(e) => setForm((value) => ({ ...value, suggestedGiftBudget: e.target.value }))} /><small>Boş bırakılırsa herhangi bir hediye tutarı sınırı uygulanmaz.</small></label>
      <button type="submit" disabled={Boolean(busy)}>{busy === "save" ? "Kaydediliyor..." : editingId ? "Değişiklikleri Kaydet" : "Yeni Kura Oluştur"}</button>
      {editingId && <button type="button" className="admin-reject" onClick={() => { setEditingId(""); setForm(emptyForm); }} disabled={Boolean(busy)}>Düzenlemeyi İptal Et</button>}
    </form>
    {loading ? <p role="status">Kuralar yükleniyor...</p> : events.length === 0 ? <p>Henüz Kura etkinliği oluşturulmadı.</p> : <div className="admin-raffle-list">{events.map((item) => {
      const participantDetail = details[`${item.id}:participants`];
      const resultDetail = details[`${item.id}:results`];
      const matched = ["MATCHED", "COMPLETED"].includes(item.status);
      const minimum = item.minimumParticipantCount || 2;
      const drawDisabled = item.participantCount < minimum || new Date(item.drawAt).getTime() > now || Boolean(busy);
      return <article className="admin-raffle-card" key={item.id}>
        <header><div><span className={`admin-raffle-status admin-raffle-status--${item.status.toLowerCase()}`}>{statusLabel(item, now)}</span><h3>{item.title}</h3><p>{item.description}</p></div><strong>👥 {item.participantCount} / {minimum}</strong></header>
        <dl><div><dt>Katılım bedeli</dt><dd>{item.xpCost} XP</dd></div><div><dt>Katılım başlangıcı</dt><dd>{formatDate(item.joinStartAt)}</dd></div><div><dt>Katılım bitişi</dt><dd>{formatDate(item.joinEndAt)}</dd></div><div><dt>Kura zamanı</dt><dd>{formatDate(item.drawAt)}</dd></div>{item.suggestedGiftBudget && <div><dt>Önerilen bütçe</dt><dd>{item.suggestedGiftBudget.toLocaleString("tr-TR")} TL</dd></div>}<div><dt>Oluşturulma</dt><dd>{formatDate(item.createdAt)}</dd></div></dl>
        {item.participantCount < minimum && !matched && item.status !== "CANCELLED" && <p className="admin-raffle-note">Minimum katılımcı sayısına ulaşmak için {minimum - item.participantCount} kişi daha gerekiyor.</p>}
        {matched && <p className="admin-raffle-complete">🎉 Kura başarıyla çekildi! {item.participantCount} katılımcı eşleştirildi.</p>}
        <div className="admin-raffle-actions"><button type="button" disabled={Boolean(busy)} onClick={() => toggleDetails(item, "participants")}>Katılımcıları Gör</button>{matched && <button type="button" disabled={Boolean(busy)} onClick={() => toggleDetails(item, "results")}>Eşleşme Sonuçları</button>}{!matched && item.status !== "CANCELLED" && <button type="button" disabled={Boolean(busy)} onClick={() => edit(item)}>Düzenle</button>}{item.status === "UPCOMING" && <button type="button" disabled={Boolean(busy)} onClick={() => openEvent(item)}>Katılıma Aç</button>}{!matched && item.status !== "CANCELLED" && <><button type="button" disabled={drawDisabled} title={item.participantCount < 2 ? "En az 2 aktif katılımcı gerekir" : "Kura çek"} onClick={() => action(item, "draw")}>{busy === `${item.id}:draw` ? "Çekiliyor..." : "Kura Çek"}</button><button type="button" className="admin-reject" disabled={Boolean(busy)} onClick={() => action(item, "cancel")}>İptal Et</button></>}</div>
        {participantDetail?.open && <div className="admin-raffle-detail"><h4>Katılımcılar</h4>{participantDetail.loading ? <p>Yükleniyor...</p> : participantDetail.error ? <p role="alert">{participantDetail.error}</p> : participantDetail.data.length === 0 ? <p>Henüz katılımcı yok.</p> : participantDetail.data.map((participant, index) => <div className="admin-raffle-person" key={`${participant.displayName}-${index}`}><strong>{participant.displayName}</strong><span>{participant.status === "ACTIVE" ? "Aktif" : "İptal"} · {formatDate(participant.joinedAt)}</span><small>{participant.deliveryReady ? "Teslimat adresi hazır ✓" : "Teslimat adresi eksik"}</small>{participant.giftHint && <p>💡 {participant.giftHint}</p>}</div>)}</div>}
        {resultDetail?.open && <div className="admin-raffle-detail"><h4>Eşleşme Sonuçları</h4>{resultDetail.loading ? <p>Yükleniyor...</p> : resultDetail.error ? <p role="alert">{resultDetail.error}</p> : <RaffleMatchList matches={resultDetail.data} />}</div>}
      </article>;
    })}</div>}
    {isLocalRaffleTestMode && LocalRaffleTestMode && <Suspense fallback={<p role="status">Yerel Kura test görünümü hazırlanıyor...</p>}><LocalRaffleTestMode /></Suspense>}
  </section>;
}

export default AdminRaffles;
