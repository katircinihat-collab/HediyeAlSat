import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useSellerOrders } from "../hooks/useSellerOrders";
import { sellerDashboard, splitSellerMovements, hasLegacyFinance, finiteMoney } from "../utils/sellerDashboard";
import { orderMoney, orderText, orderDate } from "../utils/storeOrders";
import { sellerDashboardRequest } from "../services/sellerDashboardApi";
import SellerFinance from "../components/seller/SellerFinance";
import BankAccount from "../components/seller/BankAccount";
import WithdrawRequest from "../components/seller/WithdrawRequest";
import "../styles/pages/seller-final.css";

export default function Seller() {
  const orders = useSellerOrders();
  const [retry, setRetry] = useState(0);
  return <main className="seller-final"><header><p className="seller-final__eyebrow">MAĞAZANIZIN OPERASYON MERKEZİ</p><h1>Satıcı Paneli</h1><p>Siparişlerini, ürünlerini ve gerçek satış kazançlarını tek yerden takip et.</p></header>
    {orders.loading ? <p role="status">Satıcı bilgileriniz yükleniyor…</p> : orders.error ? <section role="alert"><p>{orders.error}</p><button type="button" onClick={orders.retry}>Tekrar dene</button></section> : !orders.uid ? <p>Siparişlerinizi ve mağazanızı yönetmek için giriş yapın.</p>
      : <SellerWorkspace key={`${orders.uid}:${retry}`} uid={orders.uid} orders={orders.orders} onRetry={() => setRetry((value) => value + 1)} />}
  </main>;
}

function SellerWorkspace({ uid, orders, onRetry }) {
  const [data, setData] = useState({ loading: true, error: "", products: [], movements: [], wallet: {}, requests: [] });
  const [legacyOpen, setLegacyOpen] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => { if (active) setData((old) => ({ ...old, loading: false, error: "Panel bilgileri zamanında alınamadı. Lütfen tekrar deneyin." })); controller.abort(); }, 15000);
    const user = auth.currentUser;
    async function load() {
      try {
        if (!user || user.uid !== uid) throw new Error();
        const read = async (name, field, value) => {
          const snapshot = await getDocs(query(collection(db, name), where(field, "==", value)));
          return snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
        };
        const [uidProducts, emailProducts, movements, wallet, requests] = await Promise.all([
          read("ilanlar", "sahipUid", uid),
          user.email ? read("ilanlar", "sahip", user.email) : [],
          user.email ? read("bakiyeHareketleri", "satici", user.email) : [],
          sellerDashboardRequest(`/api/wallet/${encodeURIComponent(user.email || "")}`, { signal: controller.signal }),
          sellerDashboardRequest(`/api/withdraw/${encodeURIComponent(user.email || "")}`, { signal: controller.signal }),
        ]);
        if (active) setData({ loading: false, error: "", products: [...new Map([...uidProducts, ...emailProducts].map((item) => [item.id, item])).values()], movements, wallet: wallet.wallet || {}, requests: Array.isArray(requests.talepler) ? requests.talepler : [] });
      } catch {
        if (active) setData((old) => ({ ...old, loading: false, error: "Panel bilgileri alınamadı. Eksik veriden tutar hesaplanmadı. Lütfen tekrar deneyin." }));
      } finally { clearTimeout(timer); }
    }
    load();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [uid]);
  if (data.loading) return <div role="status" className="seller-final__loading">Mağaza ve kazanç bilgileri yükleniyor…</div>;
  if (data.error) return <section className="seller-final__section" role="alert"><p>{data.error}</p><button type="button" onClick={onRetry}>Tekrar dene</button><Link to="/satici-siparisleri">Siparişleri Yönet</Link></section>;
  const metrics = sellerDashboard(orders, data.products);
  const movements = splitSellerMovements(data.movements);
  const missingBank = !data.wallet.iban;
  const tasks = metrics.actions.length + Number(missingBank);
  const maxMonth = Math.max(1, ...metrics.months.map((month) => month.total));
  return <>
    <nav aria-label="Panel bölümleri" className="seller-final__nav">{[["seller-overview", "Genel Durum"], ["seller-tasks", "Yapman Gerekenler"], ["seller-orders", "Siparişlerim"], ["seller-products", "Ürünlerim"], ["seller-finance", "Kazanç"], ["seller-bank", "Banka Hesabım"], ["seller-performance", "Performans"], ["seller-chart", "Aylık Satış"]].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
    <section id="seller-overview" className="seller-final__section"><h2>Genel Durum</h2><div className="seller-final__grid">{[["Toplam Sipariş", metrics.orderCount], ["Yayındaki Ürün", metrics.published], ["Toplam Ciro", orderMoney(metrics.revenue)], ["Bekleyen İşlem", tasks]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div><p>Ciro, ödeme onaylı brüt satış toplamıdır; net kazanç veya aktarılabilir bakiye değildir. İadeler düşülmemiştir.</p></section>
    <section id="seller-tasks" className="seller-final__section"><h2>Yapman Gerekenler</h2>{tasks === 0 ? <p>Her şey yolunda. Şu anda işlem bekleyen sipariş veya eksik banka bilgisi yok.</p> : <ul className="seller-final__tasks">{metrics.actions.length > 0 && <li><span>{metrics.actions.length} fiziksel sipariş hazırlama veya kargo işlemi bekliyor.</span><Link to="/satici-siparisleri">Siparişleri Yönet</Link></li>}{missingBank && <li><span>Banka hesabı bilgilerini tamamla.</span><a href="#seller-bank">Banka bilgilerini ekle</a></li>}</ul>}</section>
    <section id="seller-orders" className="seller-final__section"><h2>Siparişlerim</h2><div className="seller-final__grid">{[["Hazırlanıyor", metrics.preparing], ["Kargoda", metrics.shipping], ["Teslim", metrics.delivered]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div><Link className="seller-final__cta" to="/satici-siparisleri">Siparişleri Yönet</Link></section>
    <section id="seller-products" className="seller-final__section"><h2>Ürünlerim</h2><p>{metrics.productCount} toplam ürün · {metrics.published} yayında ve satın alınabilir · {metrics.productCount - metrics.published} yayında olmayan veya stok bekleyen</p><div className="seller-final__links"><Link className="seller-final__cta" to="/ilanlarim">Ürünleri Yönet</Link><Link to="/ilan-ver">Yeni Ürün Ekle</Link></div></section>
    <div id="seller-finance" className="seller-final__section"><SellerFinance siparisler={orders} marketplaceHareketleri={movements.marketplace} /></div>
    <BankAccount wallet={data.wallet} onSaved={(wallet) => setData((old) => ({ ...old, wallet: wallet || old.wallet }))} />
    <section id="seller-performance" className="seller-final__section"><h2>Satıcı Performansı</h2><div className="seller-final__grid">{[["Teslim edilen sipariş", metrics.delivered], ["İptal durumundaki sipariş", metrics.cancelled], ["İade / itiraz / sorun kaydı", metrics.disputed]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div><p>Göstergeler kayıtlı sipariş durumlarından hesaplanır. Gönderim taahhüdü veya değerlendirme verisi olmadan başarı oranı ve puan üretilmez.</p></section>
    <section id="seller-chart" className="seller-final__section"><h2>Aylık Satış Grafiği · {metrics.year}</h2><p>Türkiye saatine göre bu yılın ödeme onaylı brüt cirosu.</p>{metrics.months.some((month) => month.count) ? <ol className="seller-final__chart">{metrics.months.map((month) => <li key={month.month}><span>{month.label}</span><div aria-hidden="true"><i style={{ width: `${month.total / maxMonth * 100}%` }} /></div><strong>{orderMoney(month.total)}</strong></li>)}</ol> : <p>Bu yıl için tarihli, ödeme onaylı satış kaydı bulunmuyor.</p>}{metrics.missingDates > 0 && <p>{metrics.missingDates} ödeme onaylı siparişin tarihi eksik/geçersiz olduğu için grafiğe dahil edilmedi.</p>}</section>
    {hasLegacyFinance(data.wallet, movements.legacy, data.requests) && <section className="seller-final__section"><h2>Eski Finansal Kayıtlar</h2><p>Önceki cüzdan ve para çekme kayıtlarıdır. Marketplace kazançlarına eklenmez; finansal geçmişiniz korunur.</p><button type="button" aria-expanded={legacyOpen} onClick={() => setLegacyOpen((value) => !value)}>{legacyOpen ? "Eski kayıtları gizle" : "Eski kayıtları görüntüle"}</button>{legacyOpen && <><ul className="seller-final__tasks">{movements.legacy.map((movement) => <li key={movement.id}><span>{orderDate(movement.tarih)?.toLocaleDateString("tr-TR") || "Tarih kaydedilmemiş"} · {orderText(movement.durum) || "Durum kaydedilmemiş"}</span><strong>{orderMoney(finiteMoney(movement.netTutar))}</strong></li>)}</ul><WithdrawRequest /></>}</section>}
  </>;
}
