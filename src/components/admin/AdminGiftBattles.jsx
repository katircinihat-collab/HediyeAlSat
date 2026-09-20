import { useEffect, useState } from "react";
import { auth } from "../../firebase";
import { apiUrl } from "../../config/api";

async function request(path, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(apiUrl(`/api/gift-battle/admin/community${path}`), { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Kapışma işlemi başarısız oldu.");
  return data;
}

export default function AdminGiftBattles() {
  const [battles, setBattles] = useState([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState("");
  async function load() { setLoading(true); try { setBattles((await request("")).battles || []); setError(""); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function remove(id) { if (!window.confirm("Bu kapışma public yayından kaldırılsın mı? Oy geçmişi korunacaktır.")) return; setBusy(id); try { await request(`/${id}/remove`, { method: "PATCH" }); await load(); } catch (e) { setError(e.message); } finally { setBusy(""); } }
  return <section className="admin-section"><h2>⚔️ Hediye Kapışmaları</h2><p>Topluluk kapışmalarını denetleyin. Oy toplamları ve kazanan elle değiştirilemez.</p>{error && <p role="alert">{error}</p>}{loading ? <p>Kapışmalar yükleniyor...</p> : battles.length === 0 ? <p>Henüz kullanıcı kapışması yok.</p> : <div className="admin-card-grid">{battles.map((battle) => <article key={battle.id} className="admin-card"><b>{battle.question}</b><p>{battle.productA.title} → {battle.productB.title}</p><p>{battle.ownerName} · {battle.results?.totalVotes || 0} oy · {battle.status}</p>{battle.status !== "REMOVED" && <button type="button" disabled={busy === battle.id} onClick={() => remove(battle.id)}>Yayından Kaldır</button>}</article>)}</div>}</section>;
}
