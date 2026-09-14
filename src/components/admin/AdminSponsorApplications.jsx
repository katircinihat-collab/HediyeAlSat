import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi } from "../../config/adminApi";
import packages from "../../../shared/sponsorStorePackages.json";
import "../../styles/components/admin-sponsor-applications.css";

export default function AdminSponsorApplications() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const actionLock = useRef(new Set());
  const load = useCallback(async () => {
    try { const data = await adminApi("/sponsor-applications"); setItems(data.applications || []); }
    catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id, action, packageId) {
    if (actionLock.current.has(id)) return;
    const label = action === "reject" ? "reddetmek" : "seçilen paketi uygunluk açısından onaylamak";
    if (!window.confirm(`Bu sponsor başvurusunu ${label} istediğinize emin misiniz?`)) return;
    actionLock.current.add(id);
    setBusy(id); setError("");
    try { await adminApi(`/sponsor-applications/${id}/${action}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(packageId ? { packageId } : {}) }); await load(); }
    catch (err) { setError(err.message); }
    finally { actionLock.current.delete(id); setBusy(""); }
  }

  return <section className="admin-section admin-sponsor-applications">
    <h2>🏪 Sponsor Mağaza Başvuruları</h2>
    {error && <p className="admin-sponsor-error">{error}</p>}
    {items.length === 0 ? <p>Henüz sponsor mağaza başvurusu yok.</p> : <div className="admin-sponsor-grid">{items.map((item) => {
      const selected = packages.packages.find((pkg) => pkg.id === (item.selectedPackageId || item.selectedTier));
      return <article key={item.id} className="admin-sponsor-card">
        <header><strong>{item.magazaAdi}</strong><span>{item.status || item.durum}</span></header>
        <dl>
          <div><dt>Mağaza ID</dt><dd>{item.storeId || item.magazaId || "-"}</dd></div>
          <div><dt>Başvuru sahibi</dt><dd>{item.yetkiliAdi || "-"}</dd></div>
          <div><dt>Seçilen paket</dt><dd>{selected ? `${selected.name} · ${selected.durationDays} gün · ${selected.price.toLocaleString("tr-TR")} TL` : "Eski başvuru — paket seçilmeli"}</dd></div>
          <div><dt>İletişim</dt><dd>{item.email || "-"} · {item.telefon || "-"}</dd></div>
          <div><dt>Ödeme</dt><dd>{item.paymentStatus || "-"}</dd></div>
        </dl>
        {item.hakkinda && <p>{item.hakkinda}</p>}
        {item.status === "REVIEW_PENDING" && <div className="admin-sponsor-actions">
          {selected ? <button disabled={busy === item.id} onClick={() => act(item.id, "approve", selected.id)}>Uygunluğu Onayla</button> : packages.packages.map((pkg) => <button key={pkg.id} disabled={busy === item.id} onClick={() => act(item.id, "approve", pkg.id)}>{pkg.name} Onayla</button>)}
          <button className="reject" disabled={busy === item.id} onClick={() => act(item.id, "reject")}>Reddet</button>
        </div>}
      </article>;
    })}</div>}
  </section>;
}
