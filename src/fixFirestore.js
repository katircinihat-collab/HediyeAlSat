import { db } from "./firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "firebase/firestore";

function parsePrice(value) {
  if (value === undefined || value === null) return 0;

  if (typeof value === "number") return value;

  let text = String(value);

  text = text
    .replace(/₺/g, "")
    .replace(/TL/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const number = parseFloat(text);

  return isNaN(number) ? 0 : number;
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return 0;

  if (typeof value === "number") return value;

  const number = parseInt(String(value).replace(/\D/g, ""));

  return isNaN(number) ? 0 : number;
}

function cleanPhone(phone) {
  if (!phone) return "";

  return String(phone).replace(/\D/g, "");
}

async function fixFirestore() {

  const snap = await getDocs(collection(db, "ilanlar"));

  let duzeltilen = 0;

  for (const belge of snap.docs) {

    const veri = belge.data();

    const yeni = {

      fiyat: parsePrice(veri.fiyat),

      adet: parseNumber(veri.adet),

      favori: parseNumber(veri.favori),

      goruntulenme: parseNumber(veri.goruntulenme),

      telefon: cleanPhone(veri.telefon),

      premium: veri.premium ?? false,

      trend: veri.trend ?? false,

      oneCikan: veri.oneCikan ?? false,

      onay: veri.onay ?? false,

      stokta: veri.stokta ?? true

    };

    await updateDoc(
      doc(db, "ilanlar", belge.id),
      yeni
    );

    console.log(
      "✔",
      veri.baslik,
      "düzeltildi."
    );

    duzeltilen++;

  }

  console.log("================================");

  console.log("Toplam düzeltilen ilan:", duzeltilen);

  console.log("Firestore temizleme tamamlandı ✅");

}

fixFirestore();