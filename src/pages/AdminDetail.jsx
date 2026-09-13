import { useEffect,useState } from "react";
import { useParams,useNavigate } from "react-router-dom";

import {
doc,
getDoc
} from "firebase/firestore";

import { db } from "../firebase";
import { adminApi } from "../config/adminApi";
import { formatListingCategory } from "../data/categories";
import { isListingPublished } from "../utils/listingAvailability";


function AdminDetail(){


const {id}=useParams();

const navigate=useNavigate();

const [ilan,setIlan]=useState(null);
const [busy,setBusy]=useState(false);
const [error,setError]=useState("");



useEffect(()=>{


async function getir(){

try {
const snap =
await getDoc(
doc(db,"ilanlar",id)
);


if(snap.exists()){

setIlan({

id:snap.id,
...snap.data()

});

} else {
setError("İlan bulunamadı.");
}
} catch {
setError("İlan detayları şu anda alınamıyor.");
}

}


getir();


},[id]);




async function onayla(){
const published=isListingPublished(ilan);
if(ilan.onay===true){
await runAction(() => adminApi(`/listings/${id}/publication`, {
method:"PATCH",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({published:!published})
}), published ? "İlan yayından kaldırıldı" : "İlan yayınlandı ✅");
return;
}
await runAction(() => adminApi(`/listings/${id}/approve`, { method: "PUT" }), "İlan onaylandı ve yayınlandı ✅");
}




async function reddet(){
if(!confirm("İlan reddedilsin mi?")) return;
await runAction(() => adminApi(`/listings/${id}/reject`, { method: "PUT" }), "İlan reddedildi");
}




async function sil(){


if(!confirm("İlan satıştan kaldırılıp arşivlensin mi? Sipariş ve finans geçmişi korunacaktır."))
return;

await runAction(() => adminApi(`/listings/${id}`, { method: "DELETE" }), "İlan arşivlendi");


}

async function runAction(action, successMessage){
if(busy) return;
setBusy(true);
setError("");
try {
await action();
alert(successMessage);
navigate("/admin");
} catch (actionError) {
setError(actionError.message || "İlan işlemi tamamlanamadı.");
} finally {
setBusy(false);
}
}





if(!ilan){

return <div className="page"><h2>{error || "Yükleniyor..."}</h2></div>

}




return (

<div className="page">


<h1>
👑 Yönetici Kontrol
</h1>

{error && <p className="admin-operation-error" role="alert">{error}</p>}




<div className="detail-container">



<div className="detail-photo">



{

ilan.resimler?.map((foto,index)=>(


<img

key={index}

src={foto}

className="detail-img"

/>


))

}



</div>





<div className="detail-info">



<h2>

{ilan.baslik}

</h2>


<h2>

{ilan.fiyat}

</h2>



<p>
👤 Satıcı:
{ilan.sahip}
</p>



<p>
☎️ Telefon:
{ilan.telefon}
</p>



<p>
📍 Konum:
{ilan.sehir}
</p>



<p>
📦 Kategori:
{formatListingCategory(ilan)}
</p>



<p>
🏷️ Tür:
{ilan.tip}
</p>



<hr/>


<h3>
Ürün Bilgileri
</h3>


<p>
Marka:
{ilan.marka || "-"}
</p>


<p>
Renk:
{ilan.renk || "-"}
</p>


<p>
Adet:
{ilan.adet || "-"}
</p>



<p>
Durum:
{ilan.durum || "-"}
</p>



<p>

📝 Açıklama:

</p>


<p>

{ilan.aciklama}

</p>



<button disabled={busy || ilan.durum === "Reddedildi" || ilan.silindi === true} onClick={onayla}>
{isListingPublished(ilan) ? "⛔ Yayından Kaldır" : ilan.onay === true ? "✅ Tekrar Yayınla" : "✅ Onayla ve Yayınla"}
</button>


<button disabled={busy || ilan.silindi === true} onClick={reddet}>
❌ Reddet
</button>


<button disabled={busy || ilan.silindi === true} onClick={()=>navigate(`/duzenle/${id}`)}>
✏️ Düzenle
</button>

<button disabled={busy || ilan.silindi === true} onClick={sil}>
🗄️ Arşivle
</button>




</div>


</div>



</div>


)

}


export default AdminDetail;
