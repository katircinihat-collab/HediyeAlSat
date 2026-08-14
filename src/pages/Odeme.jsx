import { useState } from "react";
import { auth } from "../firebase";
import { siparisOlustur } from "../services/OrderService";
import AddressForm from "../components/AddressForm";
import PaymentCard from "../components/PaymentCard";
import OrderSummary from "../components/OrderSummary";

import "../styles/pages/odeme.css";

function Odeme(){

const [adres,setAdres]=useState({

adSoyad:"",

telefon:"",

adres:"",

il:"",

ilce:""

});

const [kart,setKart]=useState({

ad:"",

no:"",

ay:"",

yil:"",

cvv:""

});

const [odemeTipi,setOdemeTipi]=useState("kart");

const [faturaAyni,setFaturaAyni]=useState(true);

const siparis = {

urunler: JSON.parse(

localStorage.getItem("sepet") || "[]"

),

urunToplam:25000,

kargo:0,

indirim:0,

genelToplam:25000

};

async function odemeyiTamamla(){

if(

adres.adSoyad===""

||

adres.telefon===""

||

adres.adres===""

){

alert("Adres bilgileri eksik.");

return;

}

if(

odemeTipi==="kart"

&&

(

kart.ad===""

||

kart.no===""

||

kart.ay===""

||

kart.yil===""

||

kart.cvv===""

)

){

alert("Kart bilgileri eksik.");

return;

}

const siparisNo=

await siparisOlustur({

kullanici:auth.currentUser.email,

urunler:siparis.urunler,

toplam:siparis.urunToplam,

kargo:siparis.kargo,

genelToplam:siparis.genelToplam,

adres,

odemeTipi

});

alert(

"Sipariş oluşturuldu.\n\nSipariş No : "+siparisNo

);

}

return(

<div className="payment-page">

<h1>

💳 Güvenli Ödeme

</h1>

<div className="payment-layout">

<div className="payment-left">

<AddressForm

adres={adres}

setAdres={setAdres}

faturaAyni={faturaAyni}

setFaturaAyni={setFaturaAyni}

/>

<PaymentCard

kart={kart}

setKart={setKart}

odemeTipi={odemeTipi}

setOdemeTipi={setOdemeTipi}

/>

</div>

<div className="payment-right">

<OrderSummary

siparis={siparis}

odemeyiTamamla={odemeyiTamamla}

/>

</div>

</div>

</div>

);

}

export default Odeme;