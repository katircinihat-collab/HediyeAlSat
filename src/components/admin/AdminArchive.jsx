import { useEffect, useState } from "react";
import { adminApi } from "../../config/adminApi";

function dateText(value) {
  const seconds = value?._seconds ?? value?.seconds;
  const date = seconds != null ? new Date(seconds * 1000) : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("tr-TR") : "-";
}

export default function AdminArchive() {
  const [state, setState] = useState({ loading: true, items: [], error: "" });
  useEffect(() => {
    adminApi("/orders/action-required?view=archive")
      .then((data) => setState({ loading: false, items: data.items || [], error: "" }))
      .catch(() => setState({ loading: false, items: [], error: "Arşiv şu anda alınamıyor." }));
  }, []);

  return <section className="admin-section" id="admin-archive"><h2>Geçmiş / Arşiv</h2><p>Çözülmüş operasyon kayıtları silinmeden burada saklanır.</p>{state.loading ? <p>Arşiv yükleniyor...</p> : state.error ? <p className="admin-operation-error">{state.error}</p> : state.items.length === 0 ? <div className="admin-all-clear">Arşivlenmiş operasyon kaydı bulunmuyor.</div> : <div className="admin-action-list">{state.items.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{item.status} · {dateText(item.archivedAt || item.resolvedAt || item.updatedAt)}</small></div><details><summary>Detay</summary><code>{item.sourceType}: {item.sourceId}</code></details></article>)}</div>}</section>;
}
