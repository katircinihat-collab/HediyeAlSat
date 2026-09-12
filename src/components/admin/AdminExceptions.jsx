import { useEffect, useState } from "react";
import { adminApi } from "../../config/adminApi";

const PRESENTATION = {
  marketplace_settlement: { icon: "🔴", title: "Satıcı Ödeme / Settlement Sorunu", money: "Rezerve", action: "Durumu Sorgula" },
  claim: { icon: "🟠", title: "İade Talebi", money: "Beklemede", action: "Talebi İncele" },
  reconciliation: { icon: "🔴", title: "Finansal Mutabakat Sorunu", money: "Koruma altında", action: "Detayı Gör" },
  payment: { icon: "🔴", title: "Ödeme Sonucu Kontrolü", money: "Koruma altında", action: "Detayı Gör" },
  order: { icon: "🟠", title: "Sipariş Akışı Kontrolü", money: "Beklemede", action: "Siparişi İncele" }
};

export default function AdminExceptions() {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  const [busy, setBusy] = useState("");
  const load = () => adminApi("/orders/action-required").then((data) => setState({ loading: false, items: data.items || [], error: "" })).catch(() => setState({ loading: false, items: [], error: "İşlem listesi şu anda alınamıyor." }));
  useEffect(() => { load(); }, []);

  async function act(item) {
    if (item.sourceType !== "marketplace_settlement") return;
    try {
      setBusy(item.id);
      await adminApi(`/orders/${encodeURIComponent(item.orderId)}/marketplace-settlement/query`, { method: "POST" });
      await load();
    } catch { setState((old) => ({ ...old, error: "Settlement durumu şu anda doğrulanamadı; para rezerve kalmaya devam ediyor." })); }
    finally { setBusy(""); }
  }

  return <section className="admin-section admin-exceptions" id="admin-action-required"><div className="admin-section-heading"><div><h2>İşlem Gerektirenler</h2><p>Yalnız insan kararı veya güvenli durum sorgusu gereken açık kayıtlar.</p></div><strong>{state.items.length}</strong></div>{state.loading ? <p>Kontroller yükleniyor...</p> : state.error ? <p className="admin-operation-error">{state.error}</p> : state.items.length === 0 ? <div className="admin-all-clear">✅ Her şey yolunda. Müdahale gerektiren kayıt yok.</div> : <div className="admin-exception-grid">{state.items.map((item) => { const view = PRESENTATION[item.sourceType] || { icon: "🟠", title: "Manuel Kontrol Gerekiyor", money: "Koruma altında", action: "Detayı Gör" }; return <article key={item.id}><header><span>{view.icon}</span><h3>{view.title}</h3></header><p><strong>Sorun:</strong> {item.sourceType === "claim" ? "Alıcı sipariş için itiraz açtı." : item.statusText || item.title || "Kayıt otomatik olarak tamamlanamadı."}</p><p><strong>Para durumu:</strong> {item.fundsText || view.money}</p><p><strong>Yapılacak:</strong> {view.action}</p>{item.sourceType === "marketplace_settlement" ? <button type="button" disabled={busy === item.id} onClick={() => act(item)}>{busy === item.id ? "Sorgulanıyor..." : view.action}</button> : item.orderId ? <a href={`#order-${item.orderId}`}>{view.action}</a> : <details><summary>{view.action}</summary><code>{item.reason}</code></details>}<details><summary>Teknik detay</summary><code>{item.sourceType}: {item.sourceId}</code></details></article>; })}</div>}</section>;
}
