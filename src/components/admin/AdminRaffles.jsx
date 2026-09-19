import { useEffect, useState } from "react";
import { adminApi } from "../../config/adminApi";

const emptyForm = { title: "", description: "", status: "UPCOMING", joinStartAt: "", joinEndAt: "", drawAt: "", suggestedGiftBudget: "" };
const localDateTime = (value) => value ? new Date(value).toISOString().slice(0, 16) : "";

function AdminRaffles() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");

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
    setBusy("save"); setError("");
    try {
      await adminApi(editingId ? `/raffles/${editingId}` : "/raffles", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setForm(emptyForm); setEditingId(""); await load();
    } catch (createError) { setError(createError.message); }
    finally { setBusy(""); }
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({ title: item.title, description: item.description || "", status: item.status, joinStartAt: localDateTime(item.joinStartAt), joinEndAt: localDateTime(item.joinEndAt), drawAt: localDateTime(item.drawAt), suggestedGiftBudget: item.suggestedGiftBudget || "" });
  }

  async function action(item, type) {
    if (busy) return;
    const message = type === "draw" ? "Kura şimdi çekilsin mi? Bu işlem geri alınamaz." : "Etkinlik iptal edilsin ve çekim öncesi katılımcı XP'leri iade edilsin mi?";
    if (!window.confirm(message)) return;
    setBusy(`${item.id}:${type}`); setError("");
    try { await adminApi(`/raffles/${item.id}/${type}`, { method: "POST" }); await load(); }
    catch (actionError) { setError(actionError.message); }
    finally { setBusy(""); }
  }

  async function openEvent(item) {
    if (busy) return;
    setBusy(`${item.id}:open`); setError("");
    try { await adminApi(`/raffles/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "OPEN" }) }); await load(); }
    catch (updateError) { setError(updateError.message); }
    finally { setBusy(""); }
  }

  return <section className="admin-section admin-raffles"><h2>🎲 Kura Yönetimi</h2><p>Topluluk Kuralarını oluşturun; çekim zamanı geldiğinde eşleşmeleri güvenli biçimde başlatın.</p>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <form className="admin-raffle-form" onSubmit={save}>
      <label>Başlık<input required value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} /></label>
      <label>Açıklama<textarea required value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} /></label>
      <label>Durum<select value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}><option value="UPCOMING">Yakında</option><option value="OPEN">Katılıma Açık</option></select></label>
      <label>Katılım başlangıcı<input required type="datetime-local" value={form.joinStartAt} onChange={(e) => setForm((v) => ({ ...v, joinStartAt: e.target.value }))} /></label>
      <label>Katılım bitişi<input required type="datetime-local" value={form.joinEndAt} onChange={(e) => setForm((v) => ({ ...v, joinEndAt: e.target.value }))} /></label>
      <label>Kura zamanı<input required type="datetime-local" value={form.drawAt} onChange={(e) => setForm((v) => ({ ...v, drawAt: e.target.value }))} /></label>
      <label>Önerilen Hediye Bütçesi (Opsiyonel)<input type="number" min="1" step="0.01" value={form.suggestedGiftBudget} onChange={(e) => setForm((v) => ({ ...v, suggestedGiftBudget: e.target.value }))} /><small>Boş bırakılırsa herhangi bir hediye tutarı sınırı uygulanmaz.</small></label>
      <button type="submit" disabled={Boolean(busy)}>{busy === "save" ? "Kaydediliyor..." : editingId ? "Değişiklikleri Kaydet" : "Yeni Kura Oluştur"}</button>
      {editingId && <button type="button" className="admin-reject" onClick={() => { setEditingId(""); setForm(emptyForm); }} disabled={Boolean(busy)}>Düzenlemeyi İptal Et</button>}
    </form>
    {loading ? <p>Kuralar yükleniyor...</p> : events.length === 0 ? <p>Henüz Kura etkinliği oluşturulmadı.</p> : <div className="admin-raffle-list">{events.map((item) => <article key={item.id}><div><strong>{item.title}</strong><span>{item.status} · {item.participantCount} katılımcı · {item.xpCost} XP</span><small>Çekim: {item.drawAt ? new Date(item.drawAt).toLocaleString("tr-TR") : "—"}</small></div><div>{!["MATCHED","COMPLETED","CANCELLED"].includes(item.status) && <button type="button" disabled={Boolean(busy)} onClick={() => edit(item)}>Düzenle</button>}{item.status === "UPCOMING" && <button type="button" disabled={Boolean(busy)} onClick={() => openEvent(item)}>Katılıma Aç</button>}{!["MATCHED","COMPLETED","CANCELLED"].includes(item.status) && <><button type="button" disabled={Boolean(busy)} onClick={() => action(item, "draw")}>Kura Çek</button><button type="button" className="admin-reject" disabled={Boolean(busy)} onClick={() => action(item, "cancel")}>İptal Et</button></>}</div></article>)}</div>}
  </section>;
}

export default AdminRaffles;
