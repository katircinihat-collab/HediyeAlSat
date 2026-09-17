import { useEffect, useState } from "react";

import { useParams } from "react-router-dom";

import {

doc,

getDoc

} from "firebase/firestore";

import { auth, db } from "../firebase";
import { confirmOrderDelivery } from "../services/orderDeliveryApi";
import OrderClaimForm from "../components/OrderClaimForm";
import OrderTimeline from "../components/OrderTimeline";
import { getDigitalDownload } from "../services/digitalDownloadApi";
import { isDigitalOrder, normalizeOrderStatus } from "../utils/orderLifecycle";


import "../styles/pages/order-detail.css";

function OrderDetail(){

const { id } = useParams();

const [siparis,setSiparis]=useState(null);

const [loading,setLoading]=useState(true);
const [dogrulaniyor,setDogrulaniyor]=useState(false);
const [indiriliyor,setIndiriliyor]=useState(false);
const [error,setError]=useState("");

async function dijitalDosyaIndir(){
try{
setIndiriliyor(true);
const download=await getDigitalDownload(siparis.id);
window.location.assign(download.url);
}catch(error){
alert(error.message);
}finally{
setIndiriliyor(false);
}
}

async function teslimAldim(){
if(!auth.currentUser||!window.confirm("Ürünü teslim aldığınızı onaylıyor musunuz?"))return;
try{
setDogrulaniyor(true);
const result=await confirmOrderDelivery(siparis.id);
setSiparis((onceki)=>({...onceki,durum:"Teslim Edildi",teslimatDogrulandi:true,teslimatDogrulamaTarihi:result.teslimatDogrulamaTarihi||new Date(),hakEdisBlokeBaslangic:result.hakEdisBlokeBaslangic||new Date(),hakEdisBlokeBitis:result.hakEdisBlokeBitis}));
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
console.error("Sipariş detayı alınamadı", err);
setError("Sipariş bilgileri şu anda alınamıyor. Lütfen tekrar deneyin.");

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

if(error){
return <div className="page orders-state error" role="alert"><h2>{error}</h2><button type="button" className="detail-btn" onClick={()=>history.back()}>Siparişlerime Dön</button></div>;
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

const digital=isDigitalOrder(siparis);
const canonicalDurum=normalizeOrderStatus(siparis.durum);


return(

<div className="page order-page">

<div className="order-header">

<div>

<h1>

📦 Sipariş Detayı

</h1>

<h3>

Sipariş No

{siparis.siparisNo ? `#${siparis.siparisNo}` : "Sipariş"}

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

canonicalDurum==="Teslim Edildi"||canonicalDurum==="Tamamlandı"

?

"done"

:

canonicalDurum==="Kargoda"

?

"cargo"

:

canonicalDurum==="Hazırlanıyor"

?

"prepare"

:

"wait"

}`}
>

{

canonicalDurum

}

</div>

</div>
<OrderTimeline order={siparis}/>
{siparis.teslimatDogrulandi===true&&<div className="order-delivery-notice"><strong>Teslim alındı</strong><span>{siparis.teslimatDogrulamaTarihi?.toDate?siparis.teslimatDogrulamaTarihi.toDate().toLocaleString("tr-TR"):siparis.teslimatDogrulamaTarihi?new Date(siparis.teslimatDogrulamaTarihi).toLocaleString("tr-TR"):"Teslimat doğrulandı"}</span>
</div>}
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

{!digital&&<div className="order-box">

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

</div>}

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

"Satıcı karşılıyor"

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



{!digital&&<div className="order-box">

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

canonicalDurum

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

</div>}

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
{digital&&siparis.odemeDurumu===true&&(
<button type="button" className="buy-btn" disabled={indiriliyor} onClick={dijitalDosyaIndir}>
{indiriliyor?"Hazırlanıyor...":"Dosyayı İndir"}
</button>
)}
{digital&&siparis.odemeDurumu===true&&(
<span className="order-claim-message">Dijital teslimat tamamlandı. Sorunları 48 saat içinde bildirebilirsiniz.</span>
)}
<OrderClaimForm order={siparis} onSubmitted={(result)=>setSiparis((onceki)=>({...onceki,hakEdisBlokeli:true,aktifTalepId:result.claimId}))} onCancelled={()=>setSiparis((onceki)=>({...onceki,hakEdisBlokeli:false,aktifTalepId:null}))}/>

{!digital&&canonicalDurum==="Kargoda"&&(
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
