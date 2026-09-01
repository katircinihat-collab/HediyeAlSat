import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "firebase/firestore";

import { db } from "../firebase";
import { Link } from "react-router-dom";
import { adminApi } from "../config/adminApi";
import { formatListingCategory } from "../data/categories";
import AdminStores from "../components/admin/AdminStores";

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

  const [ilanlar, setIlanlar] = useState([]);

  const [toplamSatis, setToplamSatis] = useState(0);
  const [toplamKomisyon, setToplamKomisyon] = useState(0);
  const [saticiyaOdenecek, setSaticiyaOdenecek] = useState(0);

  const [toplamSiparis, setToplamSiparis] = useState(0);
  const [, setOdenenSiparis] = useState(0);
  const [, setBekleyenSiparis] = useState(0);

  const [toplamMagaza, setToplamMagaza] = useState(0);
  const [toplamKullanici, setToplamKullanici] = useState(0);

  const [sonSiparisler, setSonSiparisler] = useState([]);

  const [bakiyeler, setBakiyeler] = useState([]);
  const [magazalar, setMagazalar] = useState([]);

  async function getir() {

    const snap = await getDocs(
      collection(db, "ilanlar")
    );

    setIlanlar(

      snap.docs.map((d) => ({

        id: d.id,

        ...d.data()

      }))

    );

  }
  async function dashboardGetir() {

    const siparisSnap = await getDocs(
      collection(db, "siparisler")
    );

    let satis = 0;
    let komisyon = 0;
    let satici = 0;

    let odenen = 0;
    let bekleyen = 0;

    const sonListe = [];

    siparisSnap.forEach((d) => {

      const s = d.data();

      const toplam = Number(s.toplam || 0);

      satis += toplam;

      const komisyonTutari = toplam * 0.05;

      komisyon += komisyonTutari;

      satici += (toplam - komisyonTutari);

      if (s.odemeDurumu) {

        odenen++;

      } else {

        bekleyen++;

      }

      sonListe.push({

        id: d.id,

        ...s

      });

    });

    setToplamSatis(satis);

    setToplamKomisyon(komisyon);

    setSaticiyaOdenecek(satici);

    setToplamSiparis(siparisSnap.size);

    setOdenenSiparis(odenen);

    setBekleyenSiparis(bekleyen);

    setSonSiparisler(
      sonListe.reverse().slice(0, 5)
    );

    const kullaniciSnap = await getDocs(
      collection(db, "users")
    );

    setToplamKullanici(
      kullaniciSnap.size
    );

    const magazaSnap = await getDocs(
      collection(db, "magazalar")
    );

    setMagazalar(
      magazaSnap.docs.map((belge) => ({ id: belge.id, ...belge.data() }))
    );

    setToplamMagaza(
      magazaSnap.size
    );

    const bakiyeSnap = await getDocs(
      collection(db, "bakiyeHareketleri")
    );

    setBakiyeler(

      bakiyeSnap.docs.map((d) => ({

        id: d.id,

        ...d.data()

      }))

    );

  }

  useEffect(() => {

    getir();

    dashboardGetir();

  }, []);

  async function ozellikDegistir(id, alan, deger){

  await adminApi(`/listings/${id}/flags`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alan, deger })
  });

  getir();

  }

  async function onayla(id) {
    await adminApi(`/listings/${id}/approve`, { method: "PUT" });

    getir();

  }

  async function sil(id) {

    if (!window.confirm("İlan silinsin mi?")) return;

    await adminApi(`/listings/${id}`, { method: "DELETE" });

    getir();

    dashboardGetir();

  }

  async function odemeYap(id) {

    if (!window.confirm("Satıcı ödemesi yapılsın mı?"))
      return;

    await updateDoc(

      doc(db, "bakiyeHareketleri", id),

      {

        durum: "Ödendi",

        odemeTarihi: new Date()

      }

    );

    dashboardGetir();

  }

  function magazaDurumunuGuncelle(id, aktif) {
    setMagazalar((onceki) =>
      onceki.map((magaza) => magaza.id === id ? { ...magaza, aktif } : magaza)
    );
  }
return (

<div className="admin-page">

<h1 className="admin-title">

👑 Admin Paneli

</h1>

<p className="admin-subtitle">

HediyeAlSat Yönetim Merkezi

</p>

<div className="admin-top-buttons">

<Link
to="/admin/withdraw"
className="admin-action-btn admin-approve"
>
💸 Para Çekme Talepleri
</Link>

</div>

<div className="dashboard-cards">

<div className="dashboard-card dashboard-green">

<div className="dashboard-icon">💰</div>

<h2>

{toplamSatis.toLocaleString("tr-TR")} ₺

</h2>

<p>Toplam Satış</p>

</div>

<div className="dashboard-card dashboard-blue">

<div className="dashboard-icon">💵</div>

<h2>

{toplamKomisyon.toLocaleString("tr-TR")} ₺

</h2>

<p>Komisyon</p>

</div>

<div className="dashboard-card dashboard-orange">

<div className="dashboard-icon">🏦</div>

<h2>

{saticiyaOdenecek.toLocaleString("tr-TR")} ₺

</h2>

<p>Satıcıya Ödenecek</p>

</div>

<div className="dashboard-card dashboard-purple">

<div className="dashboard-icon">📦</div>

<h2>

{toplamSiparis}

</h2>

<p>Sipariş</p>

</div>

<div className="dashboard-card dashboard-pink">

<div className="dashboard-icon">🏪</div>

<h2>

{toplamMagaza}

</h2>

<p>Mağaza</p>

</div>

<div className="dashboard-card dashboard-red">

<div className="dashboard-icon">👥</div>

<h2>

{toplamKullanici}

</h2>

<p>Kullanıcı</p>

</div>

</div>

<div className="admin-section">

<h2>

🛒 Son Siparişler

</h2>

<table>

<thead>

<tr>

<th>Ürün</th>

<th>Alıcı</th>

<th>Satıcı</th>

<th>Tutar</th>

<th>Durum</th>

</tr>

</thead>

<tbody>

{

sonSiparisler.length===0 ?

<tr>

<td colSpan="5">

Henüz sipariş bulunamadı.

</td>

</tr>

:

sonSiparisler.map((s)=>(

<tr key={s.id}>

<td>{s.ilanBaslik}</td>

<td>{s.alici}</td>

<td>{s.satici}</td>

<td>

{Number(s.toplam).toLocaleString("tr-TR")} ₺

</td>

<td>

{

s.odemeDurumu ?

<span className="status-paid">

✅ Ödendi

</span>

:

<span className="status-wait">

⌛ Bekliyor

</span>

}

</td>

</tr>

))

}

</tbody>

</table>

</div>
<div className="admin-section">

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

<th>İşlem</th>

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

{

b.durum==="Bekliyor" &&

<button

className="admin-action-btn admin-approve"

onClick={()=>odemeYap(b.id)}

>

💸 Öde

</button>

}

</td>

</tr>

))

}

</tbody>

</table>

</div>

<AdminStores
magazalar={magazalar}
onStatusChanged={magazaDurumunuGuncelle}
/>

<div className="admin-section">

<h2>

📦 İlan Yönetimi

</h2>

<div className="admin-products">

{

ilanlar.map((ilan)=>(

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

<div className="admin-product-status">

{

ilan.onay

?

"✅ Yayında"

:

"⌛ Onay Bekliyor"

}

</div>

<div className="admin-product-actions">

<button
className="admin-action-btn admin-approve"
onClick={()=>onayla(ilan.id)}
>
✅
</button>

<button
className={
ilan.trend
?
"admin-action-btn admin-trend active"
:
"admin-action-btn admin-trend"
}
onClick={()=>
ozellikDegistir(
ilan.id,
"trend",
!ilan.trend
)
}
>
⭐
</button>

<button
className={
ilan.oneCikan
?
"admin-action-btn admin-featured active"
:
"admin-action-btn admin-featured"
}
onClick={()=>
ozellikDegistir(
ilan.id,
"oneCikan",
!ilan.oneCikan
)
}
>
👑
</button>

<button
className="admin-action-btn admin-delete"
onClick={()=>sil(ilan.id)}
>
🗑️
</button>

</div>

</div>

</div>

))

}

</div>

</div>

<div className="admin-section">

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

</div>

</div>

);

}

export default Admin;
