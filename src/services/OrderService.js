import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase";

export async function siparisOlustur({

kullanici,

urunler,

toplam,

kargo,

genelToplam,

adres,

odemeTipi

}){

const siparisNo=

Date.now().toString();

await addDoc(

collection(db,"siparisler"),

{

siparisNo,

kullanici,

urunler,

toplam,

kargo,

genelToplam,

adres,

odemeTipi,

durum:"Ödeme Bekleniyor",

odemeDurumu:false,

tarih:serverTimestamp()

}

);

return siparisNo;

}