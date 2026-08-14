import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import "../styles/pages/checkout.css";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "firebase/firestore";

function Checkout() {

  const [urunler, setUrunler] = useState([]);
  const [loading, setLoading] = useState(false);

  const [adSoyad,setAdSoyad]=useState("");
  const [telefon,setTelefon]=useState("");
  const [adres,setAdres]=useState("");
  const [il,setIl]=useState("");
  const [ilce,setIlce]=useState("");
  const [kargo,setKargo]=useState("MNG");
  const [not,setNot]=useState("");
  const [kupon,setKupon]=useState("");

  useEffect(()=>{

    if(auth.currentUser){

      sepetiGetir();

    }

  },[]);

  async function sepetiGetir(){

    const q=query(

      collection(db,"sepet"),

      where("kullanici","==",auth.currentUser.email)

    );

    const snap=await getDocs(q);

    setUrunler(

      snap.docs.map(doc=>({

        id:doc.id,

        ...doc.data()

      }))

    );

  }

  const araToplam=urunler.reduce(

    (t,u)=>t+(u.fiyat*u.adet),

    0

  );

  const indirim=

    kupon==="HEDIYE10"

    ? araToplam*0.10

    :0;

  const kargoUcreti=

    araToplam>1000

    ?0

    :79.90;

  const genelToplam=

    araToplam-

    indirim+

    kargoUcreti;
  async function odemeYap(){

    if(!auth.currentUser){

      alert("Lütfen giriş yapınız.");

      return;

    }

    if(urunler.length===0){

      alert("Sepetiniz boş.");

      return;

    }

    setLoading(true);

try{

  const adParcalari = adSoyad.trim().split(" ");

  const buyerName = adParcalari.shift() || "";

  const buyerSurname = adParcalari.join(" ") || "-";

  const siparisler=[];

  for(const urun of urunler){

        const ref=await addDoc(

          collection(db,"siparisler"),

          {

            alici:auth.currentUser.email,

            satici:urun.satici,

            ilanId:urun.ilanId,

            ilanBaslik:urun.baslik,

            fiyat:urun.fiyat,

            adet:urun.adet,

            toplam:urun.fiyat*urun.adet,

            adSoyad,

            telefon,

            adres,

            il,

            ilce,

            kargo,

            siparisNotu:not,

            durum:"Ödeme Bekleniyor",

            odemeDurumu:false,

            tarih:new Date()

          }

        );

        siparisler.push(ref.id);

      }

      const response=await fetch(

        "http://localhost:5000/api/payment",

        {

          method:"POST",

          headers: {
  "Content-Type": "application/json"
},

body: JSON.stringify({

  siparisIds: siparisler,

  price: Number(genelToplam).toFixed(2),

  buyerName: buyerName,

  buyerSurname: buyerSurname,

  email: auth.currentUser.email,
productName: "HediyeAlSat Siparişi",

basketItems: [

  ...urunler.map(u => ({

    id: u.id,

    name: u.baslik,

    category1: "Genel",

    itemType: "PHYSICAL",

    price: String((u.fiyat * u.adet).toFixed(2))

  })),

  ...(kargoUcreti > 0
    ? [{
        id: "KARGO",
        name: "Kargo Ücreti",
        category1: "Kargo",
        itemType: "VIRTUAL",
        price: String(Number(kargoUcreti).toFixed(2))
      }]
    : [])

]
})

}

);

const data = await response.json();

if (data.paymentPageUrl) {

    window.location.href = data.paymentPageUrl;

} else {

    alert("Ödeme oluşturulamadı.");

}            
    }catch(e){

      console.error(e);

      alert("Ödeme sırasında hata oluştu.");

    }finally{

      setLoading(false);

    }

  }

  return(
<div className="checkout-page">

<h1>💳 Güvenli Ödeme</h1>

{

urunler.length===0

?

<h2>Sepetiniz boş.</h2>

:

<div className="checkout-layout">

<div className="checkout-left">

<div className="checkout-box">

<h2>📦 Teslimat Bilgileri</h2>

<input
placeholder="Ad Soyad"
value={adSoyad}
onChange={(e)=>setAdSoyad(e.target.value)}
/>

<input
placeholder="Telefon"
value={telefon}
onChange={(e)=>setTelefon(e.target.value)}
/>

<input
placeholder="İl"
value={il}
onChange={(e)=>setIl(e.target.value)}
/>

<input
placeholder="İlçe"
value={ilce}
onChange={(e)=>setIlce(e.target.value)}
/>

<textarea
placeholder="Teslimat Adresi"
rows="4"
value={adres}
onChange={(e)=>setAdres(e.target.value)}
/>

</div>

<div className="checkout-box">

<h2>🚚 Kargo Firması</h2>

<select
value={kargo}
onChange={(e)=>setKargo(e.target.value)}
>

<option>MNG</option>

<option>Aras</option>

<option>Yurtiçi</option>

<option>Sürat</option>

<option>PTT</option>

</select>

</div>

<div className="checkout-box">

<h2>📝 Sipariş Notu</h2>

<textarea

rows="3"

placeholder="Satıcıya notunuz"

value={not}

onChange={(e)=>setNot(e.target.value)}

/>

</div>

</div>

<div className="checkout-right">

<div className="checkout-summary">

<h2>📋 Sipariş Özeti</h2>

<div className="summary-row">

<span>Ara Toplam</span>

<b>{araToplam.toFixed(2)} TL</b>

</div>

<div className="summary-row">

<span>Kargo</span>

<b>

{kargoUcreti===0

?

"Ücretsiz"

:

kargoUcreti.toFixed(2)+" TL"}

</b>

</div>

<div className="summary-row">

<span>İndirim</span>

<b style={{color:"green"}}>

-{indirim.toFixed(2)} TL

</b>

</div>
<div className="coupon-box">

<input
placeholder="🎁 İndirim Kodu"
value={kupon}
onChange={(e)=>setKupon(e.target.value)}
/>

</div>

<hr />

<div className="summary-row total">

<span>Genel Toplam</span>

<b>{genelToplam.toFixed(2)} TL</b>

</div>

<div className="secure-box">

<p>🛡 SSL Güvenlik Sertifikası</p>

<p>💳 iyzico Güvenli Ödeme</p>

<p>🚚 Ücretsiz Kargo</p>

<p>↩ 14 Gün Kolay İade</p>

</div>

<button

className="checkout-btn"

disabled={loading}

onClick={odemeYap}

>

{

loading

?

"Ödeme Hazırlanıyor..."

:

"💳 Güvenli Ödemeye Geç"

}

</button>

</div>

</div>

</div>

}

</div>

);

}

export default Checkout;