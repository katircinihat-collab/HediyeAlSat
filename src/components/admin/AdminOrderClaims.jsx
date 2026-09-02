import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../config/adminApi";
import "../../styles/components/admin-order-claims.css";

const ACTIONS = { acik: [["inceleniyor", "İncelemeye Al"], ["reddedildi", "Reddet"]], inceleniyor: [["kabul_edildi", "Kabul Et"], ["reddedildi", "Reddet"]] };
function dateText(value) { const date = value?._seconds ? new Date(value._seconds * 1000) : value?.seconds ? new Date(value.seconds * 1000) : null; return date ? date.toLocaleString("tr-TR") : "-"; }
export default function AdminOrderClaims() {
  const [claims, setClaims] = useState([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(null); const [error, setError] = useState("");
  const load = useCallback(async () => { try { setLoading(true); const data = await adminApi("/order-claims"); setClaims(data.claims || []); } catch (err) { setError(err.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  async function change(claim, status) { try { setBusy(claim.id); setError(""); await adminApi(`/order-claims/${encodeURIComponent(claim.id)}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); await load(); } catch (err) { setError(err.message); } finally { setBusy(null); } }
  return <section className="admin-section admin-claims"><h2>İade / İtiraz Talepleri</h2>{error && <p className="admin-claims-error">{error}</p>}{loading ? <p>Yükleniyor...</p> : claims.length === 0 ? <p>Henüz talep bulunmuyor.</p> : <div className="admin-claims-grid">{claims.map((claim) => <article key={claim.id} className="admin-claim-card"><div className="admin-claim-heading"><strong>{claim.tip === "iade" ? "İade Talebi" : "Sipariş İtirazı"}</strong><span>{claim.durum}</span></div><dl><div><dt>Sipariş</dt><dd>{claim.orderId}</dd></div><div><dt>Neden</dt><dd>{claim.nedenKodu || "-"}</dd></div><div><dt>Açıklama</dt><dd>{claim.aciklama || "-"}</dd></div><div><dt>Alıcı</dt><dd>{claim.buyerEmail || claim.buyerUid || "-"}</dd></div><div><dt>Satıcı</dt><dd>{claim.sellerEmail || claim.sellerUid || "-"}</dd></div><div><dt>Tarih</dt><dd>{dateText(claim.createdAt)}</dd></div></dl>{ACTIONS[claim.durum]?.length > 0 && <div className="admin-claim-actions">{ACTIONS[claim.durum].map(([status, label]) => <button type="button" key={status} disabled={busy === claim.id} onClick={() => change(claim, status)}>{busy === claim.id ? "İşleniyor..." : label}</button>)}</div>}</article>)}</div>}</section>;
}
