import { useEffect, useState } from "react";
import {
collection,
query,
where,
getDocs
} from "firebase/firestore";

import { auth, db } from "../../firebase";

function PaymentHistory(){

const [odemeler,setOdemeler]=useState([]);

useEffect(()=>{

getir();

},[]);

async function getir(){

const user=auth.currentUser;

if(!user) return;

const q=query(

collection(db,"withdrawRequests"),

where("uid","==",user.uid)

);

const snap=await getDocs(q);

setOdemeler(

snap.docs.map(doc=>({

id:doc.id,

...doc.data()

}))

);

}

return(

<>

<hr/>

<h2>📋 Para Çekme Geçmişi</h2>

<table className="wallet-table">

<thead>

<tr>

<th>Tarih</th>

<th>Tutar</th>

<th>Durum</th>

</tr>

</thead>

<tbody>

{

odemeler.length===0

?

<tr>

<td colSpan="3">

Henüz kayıt yok.

</td>

</tr>

:

odemeler.map(o=>(

<tr key={o.id}>

<td>

{

o.tarih?.toDate

?

o.tarih.toDate().toLocaleDateString("tr-TR")

:

"-"

}

</td>

<td>

₺{Number(o.tutar).toLocaleString("tr-TR")}

</td>

<td>

{

o.durum==="Bekliyor" &&

<span style={{color:"#f59e0b"}}>

⌛ Bekliyor

</span>

}

{

o.durum==="Onaylandı" &&

<span style={{color:"#2563eb"}}>

✔ Onaylandı

</span>

}

{

o.durum==="Ödendi" &&

<span style={{color:"#16a34a"}}>

💰 Ödendi

</span>

}

</td>

</tr>

))

}

</tbody>

</table>

</>

);

}

export default PaymentHistory;