import SellerWallet from "../components/seller/SellerWallet";
import WithdrawRequest from "../components/seller/WithdrawRequest";
import BankAccount from "../components/seller/BankAccount";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { auth, db } from "../firebase";

import "../App.css";

/* Seller Components */

import SellerDashboard from "../components/seller/SellerDashboard";
import SellerProducts from "../components/seller/SellerProducts";
import SellerOrders from "../components/seller/SellerOrders";
import SellerFinance from "../components/seller/SellerFinance";
import SellerPerformance from "../components/seller/SellerPerformance";
import SellerStatistics from "../components/seller/SellerStatistics";
import SellerChart from "../components/seller/SellerChart";
function Seller(){

const [urunler,setUrunler]=useState([]);

const [siparisler,setSiparisler]=useState([]);

const [bugunKazanc,setBugunKazanc]=useState(0);

const [aylikKazanc,setAylikKazanc]=useState(0);

const [toplamKazanc,setToplamKazanc]=useState(0);

const [bekleyen,setBekleyen]=useState(0);

const [kargoda,setKargoda]=useState(0);

const [teslim,setTeslim]=useState(0);

const [toplamFavori,setToplamFavori]=useState(0);

const [toplamGoruntulenme,setToplamGoruntulenme]=useState(0);

async function getir(){

const user=auth.currentUser;

if(!user) return;

const urunQuery=query(

collection(db,"ilanlar"),

where("sahip","==",user.email)

);

const urunSnap=await getDocs(urunQuery);

const urunListe=urunSnap.docs.map(doc=>({

id:doc.id,

...doc.data()

}));

setUrunler(urunListe);

let favori=0;

let goruntulenme=0;

urunListe.forEach(u=>{

favori+=Number(u.favori||0);

goruntulenme+=Number(u.goruntulenme||0);

});

setToplamFavori(favori);

setToplamGoruntulenme(goruntulenme);
const siparisQuery=query(

collection(db,"siparisler"),

where("satici","==",user.email)

);

const siparisSnap=await getDocs(siparisQuery);

const siparisListe=siparisSnap.docs.map(doc=>({

id:doc.id,

...doc.data()

}));

setSiparisler(siparisListe);

let toplam=0;

let bugun=0;

let ay=0;

let bekleyenSayisi=0;

let kargodaSayisi=0;

let teslimSayisi=0;

const bugunTarih=new Date();

const bugunStr=bugunTarih.toDateString();

siparisListe.forEach(s=>{

const tutar=Number(s.toplam||0);

if(s.odemeDurumu===true){

toplam+=tutar;

}

if(s.durum==="Bekliyor"){

bekleyenSayisi++;

}

if(s.durum==="Kargoda"){

kargodaSayisi++;

}

if(s.durum==="Teslim"){

teslimSayisi++;

}

if(s.tarih){

const tarih=s.tarih.toDate

?

s.tarih.toDate()

:

new Date(s.tarih);

if(

s.odemeDurumu===true &&

tarih.toDateString()===bugunStr

){

bugun+=tutar;

}

if(

s.odemeDurumu===true &&

tarih.getMonth()===bugunTarih.getMonth() &&

tarih.getFullYear()===bugunTarih.getFullYear()

){

ay+=tutar;

}

}

});

setToplamKazanc(toplam);

setBugunKazanc(bugun);

setAylikKazanc(ay);

setBekleyen(bekleyenSayisi);

setKargoda(kargodaSayisi);

setTeslim(teslimSayisi);

}

useEffect(()=>{

const unsubscribe=onAuthStateChanged(

auth,

(user)=>{

if(user){

getir();

}

}

);

return()=>unsubscribe();

},[]);
return(

<div className="page seller-page">

<h1>

🏪 Satıcı Paneli

</h1>

<p className="seller-user">

Aktif Kullanıcı :

<b>

{

auth.currentUser

?

auth.currentUser.email

:

"-"

}

</b>

</p>

<SellerDashboard

bugunKazanc={bugunKazanc}

aylikKazanc={aylikKazanc}

toplamKazanc={toplamKazanc}

urunler={urunler}

toplamGoruntulenme={toplamGoruntulenme}

toplamFavori={toplamFavori}

bekleyen={bekleyen}

kargoda={kargoda}

teslim={teslim}

/>

<SellerProducts

urunler={urunler}

/>

<SellerOrders

siparisler={siparisler}

getir={getir}

/>

<SellerFinance

siparisler={siparisler}

toplamKazanc={toplamKazanc}

toplamGoruntulenme={toplamGoruntulenme}

/>

<SellerPerformance

urunler={urunler}

siparisler={siparisler}

toplamKazanc={toplamKazanc}

/>

<SellerStatistics
siparisler={siparisler}
toplamKazanc={toplamKazanc}
/>

<SellerChart
siparisler={siparisler}
/>

<SellerWallet/>

<BankAccount/>

<WithdrawRequest />


</div>

);

}

export default Seller;
