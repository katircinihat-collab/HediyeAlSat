import { useEffect, useMemo, useRef, useState } from "react";

import { collection, getDocs, limit, query } from "firebase/firestore";

import { db } from "../firebase";
import { Link } from "react-router-dom";
import { adminApi } from "../config/adminApi";
import { formatListingCategory } from "../data/categories";
import { isDigitalListing, isListingPublished } from "../utils/listingAvailability";
import { isListingBoostActive, listingBoostEndDate } from "../utils/listingBoost";
import AdminStores from "../components/admin/AdminStores";
import AdminOrderClaims from "../components/admin/AdminOrderClaims";
import AdminFinancialReconciliations from "../components/admin/AdminFinancialReconciliations";
import AdminSponsorApplications from "../components/admin/AdminSponsorApplications";
import { AdminAuditLog, AdminOperationsOverview, AdminUsers } from "../components/admin/AdminOperations";
import AdminOrders from "../components/admin/AdminOrders";
import AdminArchive from "../components/admin/AdminArchive";
import AdminExceptions from "../components/admin/AdminExceptions";

import "../styles/pages/admin.css";
function fiyatFormat(fiyat) {

  if (fiyat === undefined || fiyat === null) return "0";

  if (typeof fiyat === "number") {

    return fiyat.toLocaleString("tr-TR");

  }

  let temiz = String(fiyat)

    .replace(/TL/gi, "")

    .replace(/₺/g, "")

    .replace(/\./g, "")

    .replace(",", ".")

    .trim();

  const sayi = parseFloat(temiz);

  if (isNaN(sayi)) return "0";

  return sayi.toLocaleString("tr-TR");

}
function Admin() {

  const [activeSection, setActiveSection] = useState("dashboard");

  const [ilanlar, setIlanlar] = useState([]);
  const [stokTaslaklari, setStokTaslaklari] = useState({});
  const [ilanIslemi, setIlanIslemi] = useState("");
  const [ilanArama, setIlanArama] = useState("");
  const [ilanFiltre, setIlanFiltre] = useState("tumu");
  const [ilanHatasi, setIlanHatasi] = useState("");
  const [ilanlarYukleniyor, setIlanlarYukleniyor] = useState(false);
  const [incelenecekSiparisId, setIncelenecekSiparisId] = useState("");
  const ilanIslemKilidi = useRef(new Set());

  const [bakiyeler, setBakiyeler] = useState([]);
  const [magazalar, setMagazalar] = useState([]);

  async function getir() {
    setIlanlarYukleniyor(true);
    setIlanHatasi("");
    try {
      const data = await adminApi("/listings");
      setIlanlar(data.listings || []);
    } catch (error) {
      setIlanHatasi(error.message || "İlanlar şu anda alınamıyor.");
    } finally {
      setIlanlarYukleniyor(false);
    }

  }
  async function magazalariGetir() {

    const magazaSnap = await getDocs(
      query(collection(db, "magazalar"), limit(100))
    );

    setMagazalar(
      magazaSnap.docs.map((belge) => ({ id: belge.id, ...belge.data() }))
    );

  }

  async function ilanAksiyonu(id, action) {
    if (ilanIslemKilidi.current.has(id)) return;
    ilanIslemKilidi.current.add(id);
    setIlanIslemi(id);
    setIlanHatasi("");
    try {
      await action();
      await getir();
    } catch (error) {
      setIlanHatasi(error.message || "İlan işlemi tamamlanamadı. Lütfen tekrar deneyin.");
    } finally {
      ilanIslemKilidi.current.delete(id);
      setIlanIslemi("");
    }
  }

  async function bakiyeleriGetir() {
    const bakiyeSnap = await getDocs(
      query(collection(db, "bakiyeHareketleri"), limit(100))
    );

    setBakiyeler(

      bakiyeSnap.docs.map((d) => ({

        id: d.id,

        ...d.data()

      }))

    );

  }

  useEffect(() => {
    if (activeSection === "listings") {
      getir();
      magazalariGetir().catch(() => setMagazalar([]));
    }
    if (activeSection === "finance") bakiyeleriGetir().catch(() => setBakiyeler([]));
  }, [activeSection]);

  async function ozellikDegistir(id, alan, deger){
    await ilanAksiyonu(id, () => adminApi(`/listings/${id}/flags`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alan, deger })
    }));
  }

  async function onayla(id) {
    await ilanAksiyonu(id, () => adminApi(`/listings/${id}/approve`, { method: "PUT" }));
  }

  async function reddet(ilan) {
    if (!window.confirm(`${ilan.baslik || "İlan"} reddedilsin mi?`)) return;
    await ilanAksiyonu(ilan.id, () => adminApi(`/listings/${ilan.id}/reject`, { method: "PUT" }));
  }

  async function stokKaydet(ilan) {
    await ilanAksiyonu(ilan.id, async () => {
      const stok = stokTaslaklari[ilan.id] ?? ilan.stok ?? ilan.adet ?? 0;
      await adminApi(`/listings/${ilan.id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stok: Number(stok) })
      });
    });
  }

  async function yayinDurumuDegistir(ilan) {
    await ilanAksiyonu(ilan.id, () => adminApi(`/listings/${ilan.id}/publication`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !isListingPublished(ilan) })
      }));
  }

  async function sil(ilan) {
    if (!window.confirm(`${ilan.baslik || "İlan"} satıştan kaldırılıp arşivlensin mi? Sipariş ve finans geçmişi korunacaktır.`)) return;
    await ilanAksiyonu(ilan.id, () => adminApi(`/listings/${ilan.id}`, { method: "DELETE" }));
  }

  function magazaDurumunuGuncelle(id, aktif) {
    setMagazalar((onceki) =>
      onceki.map((magaza) => magaza.id === id ? { ...magaza, aktif } : magaza)
    );
  }

  const gorunenIlanlar = useMemo(() => {
    const term = ilanArama.trim().toLocaleLowerCase("tr-TR");
    return ilanlar.filter((ilan) => {
      const published = isListingPublished(ilan);
      const statusMatches = ilanFiltre === "tumu"
        || (ilanFiltre === "yayinda" && published)
        || (ilanFiltre === "bekleyen" && ilan.onay !== true && ilan.durum !== "Reddedildi")
        || (ilanFiltre === "kapali" && ilan.onay === true && !published)
        || (ilanFiltre === "reddedildi" && ilan.durum === "Reddedildi");
      const searchable = [ilan.id, ilan.baslik, ilan.sahip, ilan.sahipUid, ilan.kategori, ilan.magazaAdi]
        .join(" ").toLocaleLowerCase("tr-TR");
      return statusMatches && (!term || searchable.includes(term));
    });
  }, [ilanArama, ilanFiltre, ilanlar]);
return (

<div className="admin-page">

<h1 className="admin-title">

👑 Admin Paneli

</h1>

<p className="admin-subtitle">

HediyeAlSat Yönetim Merkezi

</p>

{activeSection === "finance" && <div className="admin-top-buttons">

<Link
to="/admin/withdraw"
className="admin-action-btn admin-approve"
>
💸 Para Çekme Talepleri
</Link>

</div>}

<nav className="admin-section-nav" aria-label="Admin bölümleri">
{[["dashboard","Dashboard"],["actions","İşlem Gerektirenler"],["orders","Siparişler"],["users","Kullanıcılar"],["listings","İlanlar"],["finance","Finans"],["archive","Arşiv"]].map(([key,label]) => <button type="button" key={key} className={activeSection === key ? "active" : ""} onClick={() => setActiveSection(key)}>{label}</button>)}
</nav>

{activeSection === "dashboard" && <AdminOperationsOverview />}
{activeSection === "actions" && <><AdminExceptions onInspectOrder={(orderId) => { setIncelenecekSiparisId(orderId); setActiveSection("orders"); }} /><AdminOrderClaims /></>}
{activeSection === "orders" && <AdminOrders initialOrderId={incelenecekSiparisId} onInitialOrderHandled={() => setIncelenecekSiparisId("")} />}
{activeSection === "finance" && <div className="admin-finance-split"><article><h2>Marketplace Settlement</h2><p>Marketplace satıcı kazançları iyzico settlement akışında izlenir. Bu bölümden manuel ödeme başlatılmaz.</p></article><article><h2>Legacy / İç Bakiye</h2><p>Eski iç bakiye ve para çekme kayıtları ayrı muhasebe alanıdır.</p></article></div>}
{activeSection === "finance" && <div className="admin-section">

<h2>

💸 Satıcı Bakiyeleri

</h2>

<table>

<thead>

<tr>

<th>Satıcı</th>

<th>Satış</th>

<th>Komisyon</th>

<th>Net</th>

<th>Durum</th>

<th>Açıklama</th>

</tr>

</thead>

<tbody>

{

bakiyeler.length===0 ?

<tr>

<td colSpan="6">

Henüz ödeme kaydı bulunmuyor.

</td>

</tr>

:

bakiyeler.map((b)=>(

<tr key={b.id}>

<td>{b.satici}</td>

<td>

₺{fiyatFormat(b.toplamTutar)}

</td>

<td>

₺{fiyatFormat(b.komisyon)}

</td>

<td>

₺{fiyatFormat(b.netTutar)}

</td>

<td>

{

b.durum==="Bekliyor"

?

<span className="status-wait">

🟠 Bekliyor

</span>

:

<span className="status-paid">

🟢 Ödendi

</span>

}

</td>

<td>

{b.durum === "Bekliyor" ? "48 saat/claim kontrolleri backend tarafından yönetilir." : "-"}

</td>

</tr>

))

}

</tbody>

</table>

</div>}

{activeSection === "listings" && <AdminStores
magazalar={magazalar}
onStatusChanged={magazaDurumunuGuncelle}
/>}

{activeSection === "finance" && <AdminFinancialReconciliations />}

{activeSection === "listings" && <AdminSponsorApplications />}

{activeSection === "users" && <AdminUsers />}

{activeSection === "listings" && <div className="admin-section" id="admin-listings">

<h2>

📦 İlan Yönetimi

</h2>

{ilanHatasi && <p className="admin-operation-error" role="alert">{ilanHatasi}</p>}

<div className="admin-listing-tools">
<input value={ilanArama} onChange={(event)=>setIlanArama(event.target.value)} placeholder="İlan, satıcı, kategori veya ID ara" />
<select value={ilanFiltre} onChange={(event)=>setIlanFiltre(event.target.value)} aria-label="İlan durum filtresi">
<option value="tumu">Tüm durumlar</option><option value="yayinda">Yayında</option><option value="bekleyen">Onay bekliyor</option><option value="kapali">Yayında değil</option><option value="reddedildi">Reddedildi</option>
</select>
</div>

<div className="admin-products">

{ilanlarYukleniyor && <p role="status">İlanlar yükleniyor...</p>}
{!ilanlarYukleniyor && !ilanHatasi && gorunenIlanlar.length === 0 && <p>Bu filtreye uygun ilan bulunamadı.</p>}

{

gorunenIlanlar.map((ilan)=>(

<div

key={ilan.id}

className="admin-product-card"

>

<img

className="admin-product-image"

src={

ilan.resimler?.length>0

?

ilan.resimler[0]

:

ilan.resim ||

"https://via.placeholder.com/500x500"

}

alt={ilan.baslik}

/>

<div className="admin-product-body">

<div className="admin-product-title">

{ilan.baslik}

</div>

<div className="admin-product-owner">

📂 {formatListingCategory(ilan) || "-"}

</div>

<div className="admin-product-price">

₺{fiyatFormat(ilan.fiyat)}

</div>

<div className="admin-product-owner">

👤 {ilan.sahip || ilan.email}

</div>

<div className="admin-product-city">

📍 {ilan.sehir || "-"}

</div>

<div className={`admin-product-status ${isListingPublished(ilan) ? "published" : ilan.onay === true ? "closed" : "pending"}`}>
{ilan.silindi === true
  ? "🗄️ Arşivlendi"
  : isListingPublished(ilan)
  ? "✅ Yayında"
  : ilan.onay !== true
    ? "⌛ Onay Bekliyor"
    : "⛔ Yayında Değil"}

</div>

<div className="admin-product-stock-status">
{isDigitalListing(ilan)
  ? "💻 Dijital ürün · stok sınırsız"
  : Number(ilan.stok ?? ilan.adet ?? 0) > 0
    ? `📦 Stok: ${Number(ilan.stok ?? ilan.adet)}`
    : "❌ Stok Tükendi"}
</div>

{isListingBoostActive(ilan) && <div className="admin-product-stock-status">
⭐ Ücretli öne çıkarma · {listingBoostEndDate(ilan)?.toLocaleDateString("tr-TR")} tarihine kadar
</div>}

{!isDigitalListing(ilan) && <div className="admin-stock-editor">
<input
type="number"
min="0"
step="1"
aria-label={`${ilan.baslik || "İlan"} stok miktarı`}
value={stokTaslaklari[ilan.id] ?? ilan.stok ?? ilan.adet ?? 0}
onChange={(event)=>setStokTaslaklari((onceki)=>({...onceki,[ilan.id]:event.target.value}))}
/>
<button type="button" disabled={ilanIslemi===ilan.id} onClick={()=>stokKaydet(ilan)}>Stok Düzenle</button>
</div>}

<div className="admin-product-actions">

<Link className="admin-action-btn admin-edit" to={`/admin/${ilan.id}`}>Detay</Link>

<button
className="admin-action-btn admin-approve"
disabled={ilanIslemi===ilan.id || ilan.durum === "Reddedildi" || ilan.silindi === true}
onClick={()=>ilan.onay===true ? yayinDurumuDegistir(ilan) : onayla(ilan.id)}
>
{ilan.silindi === true ? "Arşivlendi" : ilan.durum === "Reddedildi" ? "Reddedildi" : isListingPublished(ilan) ? "Yayından Kaldır" : ilan.onay === true ? "Tekrar Yayınla" : "Onayla ve Yayınla"}
</button>

{ilan.onay !== true && ilan.durum !== "Reddedildi" && <button
className="admin-action-btn admin-delete"
disabled={ilanIslemi===ilan.id}
onClick={()=>reddet(ilan)}
>Reddet</button>}

<Link className="admin-action-btn admin-edit" to={`/duzenle/${ilan.id}`}>Düzenle</Link>

<button
className={
ilan.trend
?
"admin-action-btn admin-trend active"
:
"admin-action-btn admin-trend"
}
disabled={ilanIslemi===ilan.id || (!ilan.trend && !isListingPublished(ilan))}
onClick={()=>
ozellikDegistir(
ilan.id,
"trend",
!ilan.trend
)
}
>
{ilan.trend ? "⭐ Öne Çıkarmayı Kaldır" : "⭐ Öne Çıkar"}
</button>

<button
className={
ilan.oneCikan
?
"admin-action-btn admin-featured active"
:
"admin-action-btn admin-featured"
}
disabled={ilanIslemi===ilan.id || (!ilan.oneCikan && !isListingPublished(ilan))}
onClick={()=>
ozellikDegistir(
ilan.id,
"oneCikan",
!ilan.oneCikan
)
}
>
{ilan.oneCikan ? "👑 Editör Seçiminden Kaldır" : "👑 Editör Seçimi"}
</button>

<button
className="admin-action-btn admin-delete"
disabled={ilanIslemi===ilan.id || ilan.silindi === true}
onClick={()=>sil(ilan)}
>
🗄️ Arşivle
</button>

</div>

</div>

</div>

))

}

</div>

</div>}

{activeSection === "finance" && <div className="admin-section">

<h2>

💳 Ödeme Geçmişi

</h2>

<table>

<thead>

<tr>

<th>Satıcı</th>

<th>Net Ödeme</th>

<th>Tarih</th>

<th>Durum</th>

</tr>

</thead>

<tbody>

{

bakiyeler

.filter(b=>b.durum==="Ödendi")

.length===0 ?

<tr>

<td colSpan="4">

Henüz ödeme yapılmamış.

</td>

</tr>

:

bakiyeler

.filter(b=>b.durum==="Ödendi")

.map((b)=>(

<tr key={b.id}>

<td>{b.satici}</td>

<td>

₺{fiyatFormat(b.netTutar)}

</td>

<td>

{

b.odemeTarihi

?

new Date(

b.odemeTarihi.seconds*1000

).toLocaleString("tr-TR")

:

"-"

}

</td>

<td>

<span className="status-paid">

✅ Ödendi

</span>

</td>

</tr>

))

}

</tbody>

</table>

</div>}

{activeSection === "archive" && <><AdminArchive /><AdminAuditLog /></>}

</div>

);

}

export default Admin;
