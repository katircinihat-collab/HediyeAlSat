import { useEffect, useState } from "react";
import { adminApi } from "../../config/adminApi";
import useSystemStatus from "../../hooks/useSystemStatus";
import "../../styles/components/admin-system-status.css";

export default function AdminSystemStatus() {
  const { status, error: readError } = useSystemStatus();
  const [form, setForm] = useState(status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setForm(status), [status]);

  function updateSection(section, field, value) {
    setForm((current) => ({ ...current, [section]: { ...current[section], [field]: value } }));
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      await adminApi("/system-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      setMessage("Sistem durumu kaydedildi.");
    } catch (error) {
      setMessage(error.message || "Sistem durumu kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="admin-section admin-system-status">
    <header><div><h2>📣 Sistem Durumu</h2><p>Duyuru ve geçici bakım ekranını tek merkezden yönetin.</p></div><span className={form.maintenance.enabled ? "maintenance-on" : "system-normal"}>{form.maintenance.enabled ? "Bakım açık" : "Sistem normal"}</span></header>
    {readError && <p className="admin-operation-error">Mevcut durum okunamadı; güvenli varsayılanlar gösteriliyor. Kaydetmeden önce bağlantınızı kontrol edin.</p>}
    <form onSubmit={save}>
      <fieldset>
        <legend>Sistem duyurusu</legend>
        <label className="admin-system-toggle"><input type="checkbox" checked={form.announcement.enabled} onChange={(event) => updateSection("announcement", "enabled", event.target.checked)} /> Duyuruyu göster</label>
        <label>Duyuru metni<textarea maxLength="500" value={form.announcement.message} onChange={(event) => updateSection("announcement", "message", event.target.value)} placeholder="Kullanıcıların görmesini istediğiniz kısa açıklama" /></label>
        <div className="admin-system-row"><label>Tür<select value={form.announcement.type} onChange={(event) => updateSection("announcement", "type", event.target.value)}><option value="info">Bilgi</option><option value="warning">Uyarı</option><option value="maintenance">Bakım</option><option value="payment">Ödeme</option><option value="order">Sipariş</option></select></label><label className="admin-system-toggle"><input type="checkbox" checked={form.announcement.dismissible} onChange={(event) => updateSection("announcement", "dismissible", event.target.checked)} /> Kullanıcı kapatabilsin</label></div>
      </fieldset>
      <fieldset>
        <legend>Tam bakım modu</legend>
        <label className="admin-system-toggle"><input type="checkbox" checked={form.maintenance.enabled} onChange={(event) => updateSection("maintenance", "enabled", event.target.checked)} /> Bakım modunu aç</label>
        <label>Başlık<input maxLength="120" value={form.maintenance.title} onChange={(event) => updateSection("maintenance", "title", event.target.value)} /></label>
        <label>Açıklama<textarea maxLength="1000" value={form.maintenance.message} onChange={(event) => updateSection("maintenance", "message", event.target.value)} /></label>
        <p className="admin-system-hint">Bakım açıkken normal ziyaretçiler bakım ekranını görür. Admin giriş ve yönetim yolları erişilebilir kalır.</p>
      </fieldset>
      {message && <p className="admin-system-message" role="status">{message}</p>}
      <button type="submit" disabled={saving}>{saving ? "Kaydediliyor..." : "Sistem Durumunu Kaydet"}</button>
    </form>
  </section>;
}
