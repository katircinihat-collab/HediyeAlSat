import { Helmet } from "react-helmet-async";

import { Link, useParams } from "react-router-dom";

import { useEffect, useState } from "react";

import {

doc,

getDoc,

getDocs,

collection,

query,

where,

addDoc,

deleteDoc

} from "firebase/firestore";

import { auth, db } from "../firebase";
import { isLegacySecondHandListing } from "../data/categories";

import StoreHero from "../components/StoreHero";
import StoreStats from "../components/StoreStats";
import StoreAbout from "../components/StoreAbout";
import StoreRating from "../components/StoreRating";
import StoreComments from "../components/StoreComments";
import StoreProducts from "../components/StoreProducts";

import "../styles/pages/store-detail.css";

function StoreDetail() {

const { id } = useParams();

const [magaza,setMagaza]=useState(null);

const [ilanlar,setIlanlar]=useState([]);

const [yorumlar,setYorumlar]=useState([]);

const [yorum,setYorum]=useState("");

const [ortalamaPuan,setOrtalamaPuan]=useState(0);

const [oySayisi,setOySayisi]=useState(0);

const [puanVerdiMi,setPuanVerdiMi]=useState(false);

const [takipEdiyor,setTakipEdiyor]=useState(false);

const [takipDoc,setTakipDoc]=useState(null);

useEffect(()=>{

getir();

takipKontrol();

puanlariGetir();

yorumlariGetir();

// TODO: Mağaza görüntülenme sayacı güvenilir bir backend işlemi veya
// Cloud Function üzerinden atomik olarak artırılmalı.

// Store detail data is reloaded only when the route id changes.
// eslint-disable-next-line react-hooks/exhaustive-deps
},[id]);
async function getir(){

const snap=await getDoc(

doc(db,"magazalar",id)

);

if(snap.exists()){

setMagaza({

id:snap.id,

...snap.data()

});

}

const q=query(

collection(db,"ilanlar"),

where("magazaId","==",id),

where("onay","==",true)

);

const ilanSnap=await getDocs(q);

setIlanlar(
  ilanSnap.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id
  })).filter((ilan) => !isLegacySecondHandListing(ilan))
);

}

async function takipKontrol(){

if(!auth.currentUser) return;

const q=query(

collection(db,"takipciler"),

where("magazaId","==",id),

where("kullanici","==",auth.currentUser.email)

);

const snap=await getDocs(q);

if(!snap.empty){

setTakipEdiyor(true);

setTakipDoc(snap.docs[0].id);

}

}

async function takipEt(){

if(!auth.currentUser){

alert("Önce giriş yap.");

return;

}

await addDoc(

collection(db,"takipciler"),

{

magazaId:id,

kullanici:auth.currentUser.email,

tarih:new Date()

}

);

// TODO: Takipçi sayacı backend transaction veya Cloud Function ile
// takip belgelerinden güvenilir biçimde hesaplanmalı.

setTakipEdiyor(true);

takipKontrol();

getir();

}

async function takipBirak(){

if(!takipDoc) return;

await deleteDoc(

doc(db,"takipciler",takipDoc)

);

// TODO: Takipçi sayacı backend transaction veya Cloud Function ile
// takip belgelerinden güvenilir biçimde hesaplanmalı.

setTakipEdiyor(false);

setTakipDoc(null);

getir();

}

async function puanlariGetir(){

const q=query(

collection(db,"magazaPuanlari"),

where("magazaId","==",id)

);

const snap=await getDocs(q);

setOySayisi(snap.size);

if(snap.empty){

setOrtalamaPuan(0);

return;

}

let toplam=0;

snap.docs.forEach(doc=>{

toplam+=doc.data().puan;

if(

auth.currentUser &&

doc.data().kullanici===auth.currentUser.email

){

setPuanVerdiMi(true);

}

});

setOrtalamaPuan(

(toplam/snap.size).toFixed(1)

);

}

async function puanVer(puan){

if(!auth.currentUser){

alert("Önce giriş yap.");

return;

}

if(puanVerdiMi){

alert("Bu mağazayı zaten puanladınız.");

return;

}

await addDoc(

collection(db,"magazaPuanlari"),

{

magazaId:id,

kullanici:auth.currentUser.email,

puan,

tarih:new Date()

}

);

setPuanVerdiMi(true);

puanlariGetir();

}

async function yorumlariGetir(){

const q=query(

collection(db,"magazaYorumlari"),

where("magazaId","==",id)

);

const snap=await getDocs(q);

setYorumlar(

snap.docs.map(doc=>({

id:doc.id,

...doc.data()

}))

);

}

async function yorumGonder(){

if(!auth.currentUser){

alert("Önce giriş yap.");

return;

}

if(yorum.trim()===""){

alert("Yorum yazınız.");

return;

}

await addDoc(

collection(db,"magazaYorumlari"),

{

magazaId:id,

kullanici:auth.currentUser.email,

yorum,

tarih:new Date()

}

);

setYorum("");

yorumlariGetir();

}

if(!magaza){

return <h2>Mağaza yükleniyor...</h2>;

}
return (

<>

<Helmet>

<title>

{magaza.magazaAdi} | HediyeAlSat

</title>

<meta

name="description"

content={

magaza.aciklama ||

`${magaza.magazaAdi} mağazasını ziyaret edin.`

}

/>

<meta

name="keywords"

content={`${magaza.magazaAdi}, mağaza, ${magaza.sehir}, hediye`}

/>

<link

rel="canonical"

href={`https://hediyealsat.com/magaza/${id}`}

/>

<meta

property="og:type"

content="website"

/>

<meta

property="og:title"

content={magaza.magazaAdi}

/>

<meta

property="og:description"

content={

magaza.aciklama ||

magaza.magazaAdi

}

/>

<meta

property="og:image"

content={magaza.logo}

/>

<meta

property="og:url"

content={`https://hediyealsat.com/magaza/${id}`}

/>

<script

type="application/ld+json"

dangerouslySetInnerHTML={{

__html: JSON.stringify({

"@context":"https://schema.org",

"@type":"Store",

name:magaza.magazaAdi,

image:magaza.logo,

telephone:magaza.telefon,

description:magaza.aciklama,

address:{

"@type":"PostalAddress",

addressLocality:magaza.sehir,

addressCountry:"TR"

},

url:`https://hediyealsat.com/magaza/${id}`

})

}}

/>

</Helmet>

<div className="store-page">

<Link to="/magazalar">

← Mağazalara Dön

</Link>

<div className="store-content">

<StoreHero

magaza={magaza}

takipEdiyor={takipEdiyor}

takipEt={takipEt}

takipBirak={takipBirak}

/>

<div className="store-grid">

<div className="store-left">

<StoreAbout

magaza={magaza}

/>

<StoreComments

yorumlar={yorumlar}

yorum={yorum}

setYorum={setYorum}

yorumGonder={yorumGonder}

/>

</div>

<div className="store-right">

<StoreStats

magaza={magaza}

ilanSayisi={ilanlar.length}

ortalamaPuan={ortalamaPuan}

oySayisi={oySayisi}

/>

<StoreRating

puanVer={puanVer}

puanVerdiMi={puanVerdiMi}

/>

</div>

</div>
<StoreProducts

ilanlar={ilanlar}

/>

</div>

</div>

</>

);

}

export default StoreDetail;
