import { useEffect,useState } from "react";

import { auth,db } from "../firebase";

import "../styles/pages/seller-orders.css";

import {

collection,

query,

where,

onSnapshot,

doc,

updateDoc

} from "firebase/firestore";

function SellerOrders(){

const [siparisler,setSiparisler]=useState([]);

const [arama,setArama]=useState("");

const [filtre,setFiltre]=useState("Tümü");

useEffect(()=>{

if(!auth.currentUser)return;

const q=query(

collection(db,"siparisler"),

where(

"satici",

"==",

auth.currentUser.email

)

);

const unsub=onSnapshot(q,(snap)=>{

setSiparisler(

snap.docs.map(d=>({

id:d.id,

...d.data()

}))

);

});

return()=>unsub();

},[]);

async function durumGuncelle(id,durum){

await updateDoc(

doc(db,"siparisler",id),

{

durum

}

);

}

const liste=siparisler.filter((s)=>{

const uygunDurum=

filtre==="Tümü"

||

s.durum===filtre;

const uygunArama=

(s.ilanBaslik||"")

.toLowerCase()

.includes(

arama.toLowerCase()

)

||

(s.alici||"")

.toLowerCase()

.includes(

arama.toLowerCase()

);

return uygunDurum&&uygunArama;

});
return(

<div className="seller-orders-page">

<h1>

📦 Siparişlerim

</h1>

<div className="seller-summary">

<div className="summary-box">

<h2>{siparisler.filter(x=>x.durum==="Hazırlanıyor").length}</h2>

<span>📦 Hazırlanıyor</span>

</div>

<div className="summary-box">

<h2>{siparisler.filter(x=>x.durum==="Kargoya Verildi").length}</h2>

<span>🚚 Kargoda</span>

</div>

<div className="summary-box">

<h2>{siparisler.filter(x=>x.durum==="Teslim Edildi").length}</h2>

<span>✅ Teslim</span>

</div>

<div className="summary-box">

<h2>

₺{

siparisler

.reduce(

(a,b)=>a+Number(b.toplam||0),

0

)

.toLocaleString("tr-TR")

}

</h2>

<span>💰 Toplam Ciro</span>

</div>

</div>

<div className="seller-toolbar">

<input

type="text"

placeholder="🔍 Ürün veya Alıcı Ara..."

value={arama}

onChange={(e)=>setArama(e.target.value)}

/>

<select

value={filtre}

onChange={(e)=>setFiltre(e.target.value)}

>

<option>Tümü</option>

<option>Hazırlanıyor</option>

<option>Kargoya Verildi</option>

<option>Teslim Edildi</option>

</select>

</div>

<div className="seller-orders-list">
{

liste.length===0

?

(

<div className="empty-orders">

<h2>

Henüz sipariş bulunmuyor.

</h2>

</div>

)

:

(

liste.map((s)=>(

<div

className="seller-order-card"

key={s.id}

>

<div className="seller-order-image">

<img

src={

s.resim||

"/no-image.png"

}

alt={s.ilanBaslik}

/>

</div>

<div className="seller-order-info">

<h2>

{s.ilanBaslik}

</h2>

<p>

👤 <b>Alıcı:</b> {s.alici}

</p>

<p>

📦 <b>Adet:</b> {s.adet||1}

</p>

<p>

💰 <b>Tutar:</b>

₺{Number(s.toplam||0).toLocaleString("tr-TR")}

</p>

<p>

📅 <b>Tarih:</b>

{

s.odemeTarihi

?

new Date(

s.odemeTarihi.seconds

?

s.odemeTarihi.seconds*1000

:

s.odemeTarihi

).toLocaleDateString("tr-TR")

:

"-"

}

</p>

<div

className={`order-status ${

s.durum==="Hazırlanıyor"

?

"waiting"

:

s.durum==="Kargoya Verildi"

?

"cargo"

:

"success"

}`}

>

{s.durum}

</div>

</div>

<div className="seller-order-actions">

<button

className="prepare-btn"

onClick={()=>durumGuncelle(

s.id,

"Hazırlanıyor"

)}

>

📦 Hazırla

</button>

<button

className="cargo-btn"

onClick={()=>durumGuncelle(

s.id,

"Kargoya Verildi"

)}

>

🚚 Kargoya Ver

</button>

<button

className="complete-btn"

onClick={()=>durumGuncelle(

s.id,

"Teslim Edildi"

)}

>

✅ Teslim

</button>

</div>

</div>

))

)

}
</div>

</div>

);

}

export default SellerOrders;