import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../config/adminApi";
import "../../styles/components/admin-financial-reconciliations.css";

function dateText(value) {
  const seconds = value?._seconds ?? value?.seconds;
  const date = seconds != null ? new Date(seconds * 1000) : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("tr-TR") : "-";
}

function money(value) {
  return value == null ? "-" : `${Number(value).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}

export default function AdminFinancialReconciliations() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ status: "", type: "", orderId: "", seller: "", paymentId: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const data = await adminApi(`/financial-reconciliations${params.size ? `?${params}` : ""}`);
      setItems(data.reconciliations || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(id) {
    try {
      setBusy(true); setError("");
      const data = await adminApi(`/financial-reconciliations/${encodeURIComponent(id)}`);
      setSelected(data.reconciliation);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function save(event) {
    event.preventDefault();
    try {
      setBusy(true); setError("");
      await adminApi(`/financial-reconciliations/${encodeURIComponent(selected.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selected.status, note: selected.currentNote || "" })
      });
      await load(); await openDetail(selected.id);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <section className="admin-section admin-reconciliation">
    <h2>Finansal İnceleme / Mutabakat</h2>
    <p className="admin-reconciliation-note">Bu alan yalnız operasyon takibi içindir; bakiye veya ödeme tutarı değiştirmez.</p>
    <div className="admin-reconciliation-filters">
      <select aria-label="Durum filtresi" value={filters.status} onChange={(e) => setFilters((old) => ({ ...old, status: e.target.value }))}><option value="">Tüm durumlar</option><option value="incelemede">İncelemede</option><option value="manuel_cozuldu">Manuel Çözüldü</option></select>
      <input aria-label="Tür filtresi" placeholder="Tür" value={filters.type} onChange={(e) => setFilters((old) => ({ ...old, type: e.target.value }))} />
      <input aria-label="Sipariş filtresi" placeholder="Sipariş ID" value={filters.orderId} onChange={(e) => setFilters((old) => ({ ...old, orderId: e.target.value }))} />
      <input aria-label="Satıcı filtresi" placeholder="Satıcı" value={filters.seller} onChange={(e) => setFilters((old) => ({ ...old, seller: e.target.value }))} />
      <input aria-label="Ödeme filtresi" placeholder="Payment ID" value={filters.paymentId} onChange={(e) => setFilters((old) => ({ ...old, paymentId: e.target.value }))} />
    </div>
    {error && <p className="admin-reconciliation-error">{error}</p>}
    {loading ? <p>Yükleniyor...</p> : items.length === 0 ? <p>Finansal inceleme kaydı bulunmuyor.</p> : <div className="admin-reconciliation-table-wrap"><table><thead><tr><th>Sipariş</th><th>Tür</th><th>Satıcı / Alıcı</th><th>Tutar</th><th>Provider</th><th>Sebep</th><th>Durum</th><th>Tarih</th><th>Detay</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.orderId || "-"}</td><td>{item.type}</td><td>{item.seller || "-"}<br /><small>{item.buyer || "-"}</small></td><td>{money(item.grossAmount)}</td><td>{item.providerStatus || "-"}</td><td>{item.reasonCode}<br /><small>{item.reason}</small></td><td>{item.status}</td><td>{dateText(item.updatedAt)}</td><td><button type="button" disabled={busy} onClick={() => openDetail(item.id)}>İncele</button></td></tr>)}</tbody></table></div>}
    {selected && <div className="admin-reconciliation-detail" role="dialog" aria-modal="true" aria-label="Finansal inceleme detayı">
      <div className="admin-reconciliation-detail-head"><h3>Mutabakat Detayı</h3><button type="button" onClick={() => setSelected(null)}>Kapat</button></div>
      <dl>{[["Sipariş", selected.orderId], ["Claim", selected.claimId], ["Payment", selected.paymentId], ["Payment Transaction", selected.paymentTransactionId], ["Satıcı", selected.seller], ["Alıcı", selected.buyer], ["Toplam", money(selected.grossAmount)], ["Komisyon", money(selected.commissionAmount)], ["Satıcı net", money(selected.sellerNetAmount)], ["Provider", selected.providerStatus], ["Sebep", `${selected.reasonCode}: ${selected.reason}`], ["Kaynak", `${selected.sourceCollection}/${selected.sourceId}`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "-"}</dd></div>)}</dl>
      <form onSubmit={save}><label>Durum<select value={selected.status} onChange={(e) => setSelected((old) => ({ ...old, status: e.target.value }))}><option value="incelemede">İncelemede</option><option value="manuel_cozuldu">Manuel Çözüldü</option></select></label><label>İnceleme notu<textarea maxLength="2000" value={selected.currentNote || ""} onChange={(e) => setSelected((old) => ({ ...old, currentNote: e.target.value }))} /></label><button type="submit" disabled={busy}>{busy ? "Kaydediliyor..." : "Operasyon Kaydını Güncelle"}</button></form>
      <h4>Audit Geçmişi</h4>{selected.audit?.length ? <ul className="admin-reconciliation-audit">{selected.audit.map((entry) => <li key={entry.id}><strong>{entry.previousStatus || "-"} → {entry.newStatus}</strong><span>{entry.adminEmail || entry.adminUid || "Admin"} · {dateText(entry.timestamp)}</span><p>{entry.newNote || "Not yok"}</p></li>)}</ul> : <p>Henüz audit kaydı yok.</p>}
    </div>}
  </section>;
}
