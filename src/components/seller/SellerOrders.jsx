import { useState } from "react";

import {

updateDoc,

doc

} from "firebase/firestore";

import { db } from "../../firebase";

import "../../styles/pages/seller-orders.css";

function SellerOrders({

siparisler,

getir

}){

const [kargoBilgileri,setKargoBilgileri]=useState({});

const [acikSiparis,setAcikSiparis]=useState(null);

const toplamSatis=siparisler.reduce(

(toplam,s)=>

toplam+Number(s.toplam||0),

0

);

const bekleyen=siparisler.filter(

s=>s.durum==="Bekliyor"

).length;

const hazirlanan=siparisler.filter(

s=>s.durum==="Hazırlanıyor"

).length;

const kargoda=siparisler.filter(

s=>s.durum==="Kargoda"

).length;

const teslim=siparisler.filter(

s=>s.durum==="Teslim"

).length;

return(

<>

<div className="seller-dashboard">

<div className="dashboard-box">

<h3>💰 Toplam Satış</h3>

<b>

₺{toplamSatis.toLocaleString("tr-TR")}

</b>

</div>

<div className="dashboard-box">

<h3>⌛ Bekleyen</h3>

<b>{bekleyen}</b>

</div>

<div className="dashboard-box">

<h3>📦 Hazırlanan</h3>

<b>{hazirlanan}</b>

</div>

<div className="dashboard-box">

<h3>🚚 Kargoda</h3>

<b>{kargoda}</b>

</div>

<div className="dashboard-box">

<h3>✅ Teslim</h3>

<b>{teslim}</b>

</div>

</div>

<hr/>

<h2>

🛒 Siparişlerim

</h2>

<div className="orders-table">

<div className="orders-header">

<div>Ürün</div>

<div>Sipariş No</div>

<div>Alıcı</div>

<div>Tarih</div>

<div>Tutar</div>

<div>Durum</div>

<div>İşlem</div>

</div>
{

siparisler.length===0 ?

<p>

Henüz sipariş bulunmuyor.

</p>

:

siparisler.map((s)=>(

<>

<div

key={s.id}

className="orders-row"

>

<div className="table-product">

<img

src={

s.resim ||

"/no-image.png"

}

className="table-image"

alt=""

/>

<span>

{s.ilanBaslik}

</span>

</div>

<div>

{s.siparisNo || s.id.substring(0,8)}

</div>

<div>

{s.alici}

</div>

<div>

{

s.tarih?.toDate

?

s.tarih

.toDate()

.toLocaleDateString("tr-TR")

:

"-"

}

</div>

<div>

<b>

₺{

Number(

s.toplam||0

).toLocaleString("tr-TR")

}

</b>

</div>

<div>

{

s.durum==="Bekliyor" &&

<span className="badge waiting">

⌛ Bekliyor

</span>

}

{

s.durum==="Hazırlanıyor" &&

<span className="badge preparing">

📦 Hazırlanıyor

</span>

}

{

s.durum==="Kargoda" &&

<span className="badge shipping">

🚚 Kargoda

</span>

}

{

s.durum==="Teslim" &&

<span className="badge delivered">

✅ Teslim

</span>

}

</div>

<div>

<button

className="detail-btn"

onClick={()=>

setAcikSiparis(

acikSiparis===s.id

?

null

:

s.id

)

}

>

{

acikSiparis===s.id

?

"Gizle"

:

"Detay"

}

</button>

</div>

</div>
{

acikSiparis===s.id &&

<div className="order-detail">

<div className="detail-grid">

<div>

<b>👤 Alıcı</b>

<p>{s.alici}</p>

</div>

<div>

<b>🏪 Satıcı</b>

<p>{s.satici}</p>

</div>

<div>

<b>📞 Telefon</b>

<p>{s.telefon || "-"}</p>

</div>

<div>

<b>💸 Komisyon</b>

<p>

₺{

(

Number(s.toplam||0)

*0.08

).toFixed(2)

}

</p>

</div>

<div>

<b>🚚 Kargo Firması</b>

<select

value={

kargoBilgileri[s.id]?.firma ||

"Yurtiçi"

}

onChange={(e)=>

setKargoBilgileri({

...kargoBilgileri,

[s.id]:{

...kargoBilgileri[s.id],

firma:e.target.value

}

})

}

>

<option>Yurtiçi</option>

<option>MNG</option>

<option>Aras</option>

<option>Sürat</option>

<option>PTT</option>

<option>UPS</option>

<option>DHL</option>

</select>

</div>

<div>

<b>📦 Takip No</b>

<input

type="text"

placeholder="Takip No"

value={

kargoBilgileri[s.id]?.no || ""

}

onChange={(e)=>

setKargoBilgileri({

...kargoBilgileri,

[s.id]:{

...kargoBilgileri[s.id],

no:e.target.value

}

})

}

/>

</div>

</div>

<div className="detail-links">

<a

href={`tel:${s.telefon || ""}`}

className="phone-btn"

>

📞 Ara

</a>

<a

href={`https://wa.me/90${s.telefon || ""}`}

target="_blank"

rel="noreferrer"

className="whatsapp-btn"

>

💬 WhatsApp

</a>

</div>

<div className="detail-buttons">
<button
className="edit-btn"
onClick={async()=>{

await updateDoc(
doc(db,"siparisler",s.id),
{
durum:"Hazırlanıyor"
}
);

getir();

}}
>

📦 Hazırla

</button>

<button
className="cart-btn"
onClick={async()=>{

const firma=

kargoBilgileri[s.id]?.firma ||

"Yurtiçi";

const takipNo=

kargoBilgileri[s.id]?.no ||

"";

if(!takipNo){

alert("Takip numarası giriniz.");

return;

}

await updateDoc(

doc(db,"siparisler",s.id),

{

durum:"Kargoda",

kargoFirma:firma,

kargoNo:takipNo,

kargoTarihi:new Date()

}

);

alert("🚚 Kargo bilgisi kaydedildi.");

getir();

}}

>

🚚 Kargoya Ver

</button>

<button
className="buy-btn"
onClick={async()=>{

await updateDoc(

doc(db,"siparisler",s.id),

{

durum:"Teslim",

teslimTarihi:new Date()

}

);

alert("✅ Sipariş teslim edildi.");

getir();

}}

>

✅ Teslim

</button>

<button
className="detail-btn"
onClick={()=>window.print()}
>

🖨 Yazdır

</button>

</div>

</div>

}

</>

))

}

</div>

</>

);

}

export default SellerOrders;