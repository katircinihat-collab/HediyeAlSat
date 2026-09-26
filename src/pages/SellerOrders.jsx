import { useEffect, useState } from "react";
import { useSellerOrders } from "../hooks/useSellerOrders";
import { Link } from "react-router-dom";
import StoreOrderCard from "../components/store/StoreOrderCard";
import { matchesStoreOrder, orderMoney, storeOrderFilters, storeOrderView, summarizeStoreOrders } from "../utils/storeOrders";
import "../styles/pages/store-orders.css";
import { isPaymentAttempt } from "../utils/storeOrders";
import { sellerArchiveRequest } from "../services/sellerOrderArchiveApi";

export default function SellerOrders() {
  const state = useSellerOrders();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Tümü");
  const [eligibility, setEligibility] = useState({});
  const [cleanupError, setCleanupError] = useState("");
  const attemptKey = JSON.stringify(state.orders.filter(isPaymentAttempt).map((order) => order.id).sort());
  useEffect(() => {
    const controller = new AbortController();
    const ids = JSON.parse(attemptKey);
    async function check() {
      try {
        const next = {};
        for (let index = 0; index < ids.length; index += 40) {
          const result = await sellerArchiveRequest("seller/cleanup-preview", { orderIds: ids.slice(index, index + 40) }, controller.signal);
          Object.assign(next, result.eligibility);
        }
        if (!controller.signal.aborted) { setEligibility(next); setCleanupError(""); }
      } catch { if (!controller.signal.aborted) { setEligibility({}); setCleanupError("Temizleme uygunluğu alınamadı. Siparişleriniz korunuyor; tekrar deneyebilirsiniz."); } }
    }
    check();
    return () => controller.abort();
  }, [attemptKey, state.uid]);


  const orders = state.orders.map((order) => ({ order, view: { ...storeOrderView(order), cleanupEligible: eligibility[order.id] === true } }))
    .sort((a, b) => (b.view.date?.getTime() || 0) - (a.view.date?.getTime() || 0));
  const summary = summarizeStoreOrders(orders.map(({ view }) => view));
  const visible = orders.filter(({ view }) => matchesStoreOrder(view, search, filter));
  return <main className="store-orders">
    <header><p className="store-orders__eyebrow">MAĞAZAM · SİPARİŞ YÖNETİMİ</p><h1>Siparişlerim</h1><p>Satışlarını tek ekrandan takip et ve yönet.</p></header>
    {state.loading ? <div className="store-orders__loading" role="status">Siparişleriniz yükleniyor…<div className="store-orders__skeleton" /><div className="store-orders__skeleton" /></div>
      : state.error ? <section className="store-orders__empty" role="alert"><h2>Siparişler yüklenemedi</h2><p>{state.error}</p><button type="button" onClick={state.retry}>Tekrar dene</button></section>
        : !state.uid ? <section className="store-orders__empty"><h2>Oturum açmalısınız</h2><p>Siparişlerinizi görmek için hesabınıza giriş yapın.</p></section>
          : <>
            <section className="store-orders__summary" aria-label="Sipariş özeti">
              {[["📦 Hazırlanıyor", summary.preparing], ["🚚 Kargoda", summary.shipping], ["✅ Teslim", summary.delivered], ["💰 Toplam Ciro", orderMoney(summary.revenue)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </section>
            <p className="store-orders__muted">Ciro, ödemesi onaylanan siparişlerin brüt toplamıdır; iade düşülmüş net kazanç veya aktarılabilir tutar değildir.</p>
            {orders.some(({ view }) => view.paymentAttempt) && <p className="store-orders__notice">Ödemesi tamamlanmamış kayıtlar aktif satışlardan ayrıldı. “Ödeme Denemeleri” filtresinden inceleyebilirsiniz. “Başarısız Ödemeler”, backend tarafından güvenle temizlenebilir bulunan kayıtları gösterir; bekleyen ödeme sonucu başarısız kabul edilmez.</p>}
            {cleanupError && <p role="alert">{cleanupError} <button type="button" onClick={state.retry}>Tekrar dene</button></p>}
            <div className="store-orders__toolbar"><label>Sipariş ara<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sipariş no, ürün veya alıcı adı" /></label><label>Durum<select value={filter} onChange={(e) => setFilter(e.target.value)}>{storeOrderFilters.map((item) => <option key={item}>{item}</option>)}</select></label></div>
            <p className="store-orders__muted" role="status">{visible.length} sipariş gösteriliyor</p>
            {!orders.length ? <section className="store-orders__empty"><span aria-hidden="true">📦</span><h2>Henüz siparişiniz yok</h2><p>Yeni sipariş geldiğinde burada görünecek.</p></section>
              : !visible.length ? <section className="store-orders__empty"><h2>Aramanıza uygun sipariş yok</h2><button type="button" onClick={() => { setSearch(""); setFilter("Tümü"); }}>Filtreleri temizle</button></section>
                : <div className="store-orders__list">{visible.map(({ order, view }) => <StoreOrderCard key={`${state.uid}:${view.id}`} order={order} view={view} />)}</div>}
          </>}
    <Link className="store-orders__back" to="/magazam">← Mağazama dön</Link>
  </main>;
}
