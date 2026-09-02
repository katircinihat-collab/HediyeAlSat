import { useEffect, useState } from "react";

import { useParams } from "react-router-dom";

import {

doc,

getDoc

} from "firebase/firestore";

import { auth, db } from "../firebase";
import { confirmOrderDelivery } from "../services/orderDeliveryApi";
import OrderClaimForm from "../components/OrderClaimForm";

import "../styles/pages/order-detail.css";

function OrderDetail(){

const { id } = useParams();

const [siparis,setSiparis]=useState(null);

const [loading,setLoading]=useState(true);
const [dogrulaniyor,setDogrulaniyor]=useState(false);

async function teslimAldim(){
if(!auth.currentUser||!window.confirm("Ürünü teslim aldığınızı onaylıyor musunuz?"))return;
try{
setDogrulaniyor(true);
await confirmOrderDelivery(siparis.id);
setSiparis((onceki)=>({...onceki,durum:"Teslim Edildi",teslimatDogrulandi:true}));
}catch(error){
alert(error.message);
}finally{
setDogrulaniyor(false);
}
}

useEffect(()=>{

async function getir(){

try{

const ref=doc(db,"siparisler",id);

const snap=await getDoc(ref);

if(snap.exists()){

setSiparis({

id:snap.id,

...snap.data()

});

}

}

catch(err){

console.log(err);

}

finally{

setLoading(false);

}

}

getir();

},[id]);

if(loading){

return(

<div className="page">

<h2>

Yükleniyor...

</h2>

</div>

);

}

if(!siparis){

return(

<div className="page">

<h2>

Sipariş bulunamadı.

</h2>

</div>

);

}

return(

<div className="page order-page">

<div className="order-header">

<div>

<h1>

📦 Sipariş Detayı

</h1>

<h3>

Sipariş No

#{siparis.siparisNo || siparis.id.substring(0,8)}

</h3>

<p>

{

siparis.tarih?.toDate

?

siparis.tarih

.toDate()

.toLocaleString("tr-TR")

:

""

}

</p>

</div>

<div
className={`order-status ${

siparis.durum==="Teslim"

?

"done"

:

siparis.durum==="Kargoda"

?

"cargo"

:

siparis.durum==="Hazırlanıyor"

?

"prepare"

:

"wait"

}`}
>

{

siparis.durum

}

</div>

</div>
<div className="order-grid">

<div className="order-box">

<h2>

👤 Alıcı Bilgileri

</h2>

<p>

<b>Ad Soyad</b>

<br/>

{siparis.alici || "-"}

</p>

<p>

<b>Telefon</b>

<br/>

{siparis.telefon || "-"}

</p>

<p>

<b>E-Posta</b>

<br/>

{siparis.kullanici || "-"}

</p>

</div>

<div className="order-box">

<h2>

🏠 Teslimat Adresi

</h2>

<p>

{siparis.adres || "Adres bulunamadı."}

</p>

<p>

{siparis.ilce || ""}

{" "}

{siparis.sehir || ""}

</p>

</div>

</div>

<div className="order-box">

<h2>

🛍️ Sipariş Edilen Ürünler

</h2>

{

siparis.urunler?.map((urun,index)=>(

<div

key={index}

className="order-product"

>

<img

src={

urun.resim ||

"/no-image.png"

}

alt=""

className="order-product-image"

/>

<div className="order-product-info">

<h3>

{urun.baslik}

</h3>

<p>

Adet :

<b>

{urun.adet || 1}

</b>

</p>

<p>

Birim Fiyat :

<b>

₺{

Number(

urun.fiyat || 0

).toLocaleString("tr-TR")

}

</b>

</p>

<p>

Ara Toplam :

<b>

₺{

Number(

(urun.fiyat || 0) *

(urun.adet || 1)

).toLocaleString("tr-TR")

}

</b>

</p>

</div>

</div>

))

  }

</div>
<div className="order-grid">

<div className="order-box">

<h2>

💳 Ödeme Özeti

</h2>

<div className="summary-line">

<span>Ürün Toplamı</span>

<b>

₺{Number(siparis.toplam || 0).toLocaleString("tr-TR")}

</b>

</div>

<div className="summary-line">

<span>Kargo</span>

<b>

{

Number(siparis.kargoUcreti || 0)===0

?

"Ücretsiz"

:

"₺"+Number(siparis.kargoUcreti).toLocaleString("tr-TR")

}

</b>

</div>

<div className="summary-line">

<span>İndirim</span>

<b style={{color:"#16a34a"}}>

₺{

Number(siparis.indirim || 0).toLocaleString("tr-TR")

}

</b>

</div>

<div className="summary-line total">

<span>Genel Toplam</span>

<b>

₺{

Number(

siparis.genelToplam ||

siparis.toplam ||

0

).toLocaleString("tr-TR")

}

</b>

</div>

</div>



<div className="order-box">

<h2>

🚚 Kargo Bilgileri

</h2>

<p>

<b>Firma</b>

<br/>

{

siparis.kargoFirma ||

"Henüz girilmedi"

}

</p>

<p>

<b>Takip No</b>

<br/>

{

siparis.kargoNo ||

"-"

}

</p>

<p>

<b>Durum</b>

<br/>

{

siparis.durum

}

</p>

<p>

<b>Kargoya Veriliş</b>

<br/>

{

siparis.kargoTarihi?.toDate

?

siparis.kargoTarihi

.toDate()

.toLocaleString("tr-TR")

:

"-"

}

</p>

</div>

</div>



<div className="order-box">

<h2>

🏪 Satıcı Bilgileri

</h2>

<p>

<b>Firma</b>

<br/>

{

siparis.satici ||

""

}

</p>

<p>

<b>Telefon</b>

<br/>

{

siparis.saticiTelefon ||

"-"

}

</p>

<p>

<b>E-Posta</b>

<br/>

{

siparis.saticiEmail ||

"-"

}

</p>

<div className="seller-buttons">

<a

href={`tel:${siparis.saticiTelefon || ""}`}

className="phone-btn"

>

📞 Ara

</a>

<a

target="_blank"

rel="noreferrer"

href={`https://wa.me/90${siparis.saticiTelefon || ""}`}

className="whatsapp-btn"

>

💬 WhatsApp

</a>

</div>

</div>
<div className="order-actions">
<OrderClaimForm order={siparis} onSubmitted={(result)=>setSiparis((onceki)=>({...onceki,hakEdisBlokeli:true,aktifTalepId:result.claimId}))} onCancelled={()=>setSiparis((onceki)=>({...onceki,hakEdisBlokeli:false,aktifTalepId:null}))}/>

{(siparis.durum==="Kargoda"||siparis.durum==="Kargoya Verildi")&&(
<button type="button" className="buy-btn" disabled={dogrulaniyor} onClick={teslimAldim}>
{dogrulaniyor?"Doğrulanıyor...":"Teslim Aldım"}
</button>
)}

<button

className="detail-btn"

onClick={()=>window.print()}

>

🖨 Yazdır

</button>

<button

className="edit-btn"

onClick={()=>alert("PDF oluşturulacak")}

>

📄 PDF İndir

</button>

{

siparis.durum==="Teslim" &&

<button

className="buy-btn"

onClick={()=>alert("Değerlendirme sayfası açılacak.")}

>

⭐ Ürünü Değerlendir

</button>

}

<button

className="cart-btn"

onClick={()=>history.back()}

>

⬅ Siparişlerime Dön

</button>

</div>

</div>

);

}

export default OrderDetail;
