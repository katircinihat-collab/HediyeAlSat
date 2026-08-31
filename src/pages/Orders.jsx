import { useEffect, useState } from "react";

import { auth, db } from "../firebase";

import "../styles/pages/orders.css";

import {

collection,

query,

where,

onSnapshot

} from "firebase/firestore";

function Orders(){

const [siparisler,setSiparisler]=useState([]);

useEffect(()=>{

if(!auth.currentUser)return;

const q=query(

collection(db,"siparisler"),

where("alici","==",auth.currentUser.email)

);

const unsub=onSnapshot(q,(snap)=>{

setSiparisler(

snap.docs.map(doc=>({

id:doc.id,

...doc.data()

}))

);

});

return()=>unsub();

},[]);

return(

<div className="orders-page">

<h1>

📦 Siparişlerim

</h1>

<div className="orders-list">
{

siparisler.length===0?

(

<div className="empty-orders">

<h2>

Henüz siparişiniz bulunmuyor.

</h2>

<p>

Alışveriş yaparak ilk siparişinizi oluşturabilirsiniz.

</p>

</div>

)

:

(

siparisler.map((s)=>(

<div

className="order-card"

key={s.id}

>

<div className="order-header">

<div>

<h2>

{s.ilanBaslik}

</h2>

<p>

🆔 Sipariş No :

<b>

{s.id}

</b>

</p>

</div>

<div className="order-status">

{

s.durum==="Ödendi"

?

<span className="paid">

✅ Ödendi

</span>

:

<span className="waiting">

⌛ Bekleniyor

</span>

}

</div>

</div>

<div className="order-body">

<div className="order-left">

<p>

🏪 Satıcı

</p>

<h3>

{s.satici}

</h3>

<p>

💰 Ürün Fiyatı

</p>

<h3>

₺{Number(s.fiyat).toLocaleString("tr-TR")}

</h3>

</div>

<div className="order-right">
<p>

🚚 Kargo Durumu

</p>

<h3>

{

s.kargoDurumu ||

"Hazırlanıyor"

}

</h3>

<p>

💳 Ödeme

</p>

<h3>

{

s.odemeDurumu

?

"Ödeme Alındı"

:

"Ödeme Bekleniyor"

}

</h3>

<p>

📅 Sipariş Tarihi

</p>

<h3>

{

s.odemeTarihi

?

new Date(

s.odemeTarihi.seconds

? s.odemeTarihi.seconds * 1000

: s.odemeTarihi

).toLocaleDateString("tr-TR")

:

"-"

}

</h3>

</div>

</div>

<div className="order-footer">

<button

className="detail-btn"

>

👁 Sipariş Detayı

</button>

<button

className="review-btn"

>

⭐ Değerlendir

</button>

<button

className="buy-again-btn"

>

🛒 Tekrar Satın Al

</button>

</div>
</div>

  )))

}

</div>

</div>

);

}

export default Orders;
