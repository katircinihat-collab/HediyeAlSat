import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../../config/adminApi";
import "../../styles/components/admin-operations.css";

const KPI = [
  ["totalUsers", "Kullanıcı", "👥"], ["activeListings", "Aktif ilan", "📦"],
  ["pendingListings", "Bekleyen ilan", "⌛"], ["totalOrders", "Sipariş", "🛒"],
  ["salesVolume", "Satış hacmi", "💰", true], ["commissionRevenue", "%8 komisyon", "📈", true],
  ["platformServiceRevenue", "Sponsor / boost geliri", "🚀", true], ["pendingSellerAmount", "Bekleyen hakediş", "🏦", true],
  ["openClaims", "Açık itiraz/iade", "⚖️"], ["pendingSponsors", "Sponsor inceleme", "🏪"],
  ["activeBoosts", "Aktif ücretli boost", "⭐"], ["reconciliationCount", "Mutabakat kaydı", "🔎"]
];

function money(value) { return `${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`; }
function dateText(value) { const seconds = value?._seconds ?? value?.seconds; const date = seconds != null ? new Date(seconds * 1000) : value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("tr-TR") : "-"; }

export function AdminOperationsOverview() {
  const [metrics, setMetrics] = useState(null); const [error, setError] = useState("");
  useEffect(() => { adminApi("/overview").then((data) => setMetrics(data.metrics)).catch((err) => setError(err.message)); }, []);
  if (error) return <section className="admin-section"><p className="admin-operation-error">Dashboard verisi alınamadı: {error}</p></section>;
  if (!metrics) return <section className="admin-section admin-operation-loading" role="status">Operasyon verileri yükleniyor...</section>;
  return <section className="admin-section" id="admin-dashboard"><div className="admin-section-heading"><div><h2>Operasyon Dashboard</h2><p>Sunucu tarafından hesaplanan gerçek operasyon göstergeleri.</p></div></div>{metrics.waitingPayments > 0 && <div className="admin-critical-alert" role="alert">⚠️ {metrics.waitingPayments} ödeme hâlâ WAITING durumunda. Callback/finalizasyon takibi gerekebilir.</div>}<div className="admin-operations-kpis">{KPI.map(([key, label, icon, isMoney]) => <article key={key}><span>{icon}</span><strong>{isMoney ? money(metrics[key]) : Number(metrics[key] || 0).toLocaleString("tr-TR")}</strong><small>{label}</small></article>)}</div></section>;
}

export function AdminUsers() {
  const [users, setUsers] = useState([]); const [nextPageToken, setNextPageToken] = useState(null); const [search, setSearch] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(""); const [error, setError] = useState("");
  const load = useCallback(async (token = "") => { try { setLoading(true); setError(""); const data = await adminApi(`/users${token ? `?pageToken=${encodeURIComponent(token)}` : ""}`); setUsers((old) => token ? [...old, ...(data.users || [])] : (data.users || [])); setNextPageToken(data.nextPageToken || null); } catch (err) { setError(err.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const visible = useMemo(() => { const term = search.trim().toLocaleLowerCase("tr-TR"); return users.filter((user) => !term || [user.displayName, user.email, user.uid].join(" ").toLocaleLowerCase("tr-TR").includes(term)); }, [search, users]);
  async function toggle(user) { const next = !user.disabled; if (!window.confirm(`${user.email || user.uid} hesabını ${next ? "pasifleştirmek" : "yeniden açmak"} istiyor musunuz?`)) return; try { setBusy(user.uid); setError(""); await adminApi(`/users/${encodeURIComponent(user.uid)}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ disabled: next }) }); setUsers((old) => old.map((item) => item.uid === user.uid ? { ...item, disabled: next } : item)); } catch (err) { setError(err.message); } finally { setBusy(""); } }
  return <section className="admin-section" id="admin-users"><div className="admin-section-heading"><div><h2>Kullanıcı Yönetimi</h2><p>Firebase Auth kullanıcıları; hassas ödeme ve kimlik bilgileri gösterilmez.</p></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad, e-posta veya UID ara" /></div>{error && <p className="admin-operation-error">{error}</p>}{loading && users.length === 0 ? <p>Yükleniyor...</p> : visible.length === 0 ? <p>Kullanıcı bulunamadı.</p> : <div className="admin-table-wrap"><table><thead><tr><th>Kullanıcı</th><th>E-posta doğrulama</th><th>Sağlayıcı</th><th>Son giriş</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>{visible.map((user) => <tr key={user.uid}><td><strong>{user.displayName || "İsimsiz kullanıcı"}</strong><br /><small>{user.email || user.uid}</small></td><td>{user.emailVerified ? "✅ Doğrulandı" : "⌛ Doğrulanmadı"}</td><td>{user.providers.join(", ") || "-"}</td><td>{dateText(user.lastSignInAt)}</td><td>{user.disabled ? "⛔ Pasif" : "✅ Aktif"}</td><td><button type="button" disabled={busy === user.uid} onClick={() => toggle(user)}>{busy === user.uid ? "İşleniyor..." : user.disabled ? "Yeniden Aç" : "Kısıtla"}</button></td></tr>)}</tbody></table></div>}{nextPageToken && <button className="admin-load-more" type="button" disabled={loading} onClick={() => load(nextPageToken)}>{loading ? "Yükleniyor..." : "Sonraki 50 kullanıcıyı yükle"}</button>}</section>;
}

export function AdminAuditLog() {
  const [logs, setLogs] = useState([]); const [error, setError] = useState("");
  useEffect(() => { adminApi("/audit-logs").then((data) => setLogs(data.logs || [])).catch((err) => setError(err.message)); }, []);
  return <section className="admin-section" id="admin-audit"><h2>Admin İşlem Geçmişi</h2><p>Kritik ilan, mağaza ve kullanıcı işlemlerinin son 50 kaydı.</p>{error && <p className="admin-operation-error">{error}</p>}{!error && logs.length === 0 ? <p>Henüz audit kaydı bulunmuyor.</p> : <div className="admin-audit-list">{logs.map((log) => <article key={log.id}><strong>{log.action}</strong><span>{log.targetType}: {log.targetId}</span><small>{log.adminEmail || log.adminUid || "Admin"} · {dateText(log.createdAt)}</small></article>)}</div>}</section>;
}
