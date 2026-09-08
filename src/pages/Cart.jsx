import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import CartItem from "../components/CartItem";
import CartSummary from "../components/CartSummary";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

function Cart() {

  const navigate = useNavigate();

  const [kupon, setKupon] = useState("");
  const [urunler, setUrunler] = useState([]);
  const [sepetYukleniyor, setSepetYukleniyor] = useState(true);

  useEffect(() => {

    const unsubscribe = auth.onAuthStateChanged(async (user) => {

      if (!user) {
        setUrunler([]);
        setSepetYukleniyor(false);
        return;
      }

      console.log("Giriş yapan:", user.email);

      const q = query(
        collection(db, "sepet"),
        where("kullanici", "==", user.email)
      );

      const unsub = onSnapshot(q, async (snap) => {

        const liste = await Promise.all(snap.docs.map(async (sepetDoc) => {
          const sepetVerisi = sepetDoc.data();
          let ilan = null;
          let ilanMevcut = false;

          if (sepetVerisi.ilanId) {
            try {
              const ilanSnap = await getDoc(doc(db, "ilanlar", sepetVerisi.ilanId));
              ilanMevcut = ilanSnap.exists();
              ilan = ilanMevcut ? ilanSnap.data() : null;
            } catch (error) {
              console.error("Sepet ürünü ilan bilgisi alınamadı:", sepetVerisi.ilanId, error);
            }
          }

          const dijital =
            ilan?.urunTipi === "dijital" ||
            ilan?.fizikselKargo === false ||
            ilan?.dijitalTeslimat === true;
          const stok = dijital ? null : Number(ilan?.stok ?? ilan?.adet);
          const mevcutAdet = Math.max(1, Number.parseInt(sepetVerisi.adet, 10) || 1);
          const guvenliAdet = Number.isInteger(stok) && stok > 0
            ? Math.min(mevcutAdet, stok)
            : mevcutAdet;

          if (guvenliAdet !== mevcutAdet) {
            await updateDoc(doc(db, "sepet", sepetDoc.id), { adet: guvenliAdet });
          }

          return {
            id: sepetDoc.id,
            ...sepetVerisi,
            ilanId: sepetVerisi.ilanId,
            adet: guvenliAdet,
            baslik: ilan?.baslik || sepetVerisi.baslik || "Ürün",
            fiyat: ilan?.fiyat ?? sepetVerisi.fiyat,
            resim: ilan?.resim || sepetVerisi.resim,
            satici: ilan?.sahip || sepetVerisi.satici,
            urunTipi: ilan?.urunTipi || sepetVerisi.urunTipi || "",
            fizikselKargo: typeof ilan?.fizikselKargo === "boolean"
              ? ilan.fizikselKargo
              : sepetVerisi.fizikselKargo,
            dijitalTeslimat: typeof ilan?.dijitalTeslimat === "boolean"
              ? ilan.dijitalTeslimat
              : sepetVerisi.dijitalTeslimat,
            kategori: ilan?.kategori || sepetVerisi.kategori || "",
            stok,
            ilanMevcut
          };
        }));

        console.log("Sepette bulunan:", liste);

        setUrunler(liste);
        setSepetYukleniyor(false);

      }, (error) => {
        console.error("Sepet dinlenemedi:", error);
        setSepetYukleniyor(false);
      });

      return () => unsub();

    });

    return () => unsubscribe();

  }, []);
  async function adetArttir(urun) {

    const adet = Number(urun.adet) || 1;
    const dijital =
      urun.urunTipi === "dijital" ||
      urun.fizikselKargo === false ||
      urun.dijitalTeslimat === true ||
      urun.kategori === "A4 Tasarım";

    if (!dijital && Number.isInteger(urun.stok) && adet >= urun.stok) {
      alert("Bu ürün için mevcut stok sınırına ulaştınız.");
      return;
    }

    await updateDoc(
      doc(db, "sepet", urun.id),
      {
        adet: adet + 1
      }
    );

  }

  async function adetAzalt(urun) {

    const adet = Number(urun.adet) || 1;

    if (adet <= 1) {

      if (!window.confirm("Bu ürünü sepetten kaldırmak istiyor musunuz?")) {
        return;
      }

      await deleteDoc(
        doc(db, "sepet", urun.id)
      );

      return;

    }

    await updateDoc(
      doc(db, "sepet", urun.id),
      {
        adet: adet - 1
      }
    );

  }

  async function sil(id) {

    if (!window.confirm("Ürün sepetten silinsin mi?"))
      return;

    await deleteDoc(
      doc(db, "sepet", id)
    );

  }

  async function favorilereTasi(urun) {

    await addDoc(
      collection(db, "favoriler"),
      {
        kullanici: auth.currentUser.email,
        ilanId: urun.ilanId,
        baslik: urun.baslik,
        fiyat: urun.fiyat,
        resim: urun.resim,
        tarih: new Date()
      }
    );

    await deleteDoc(
      doc(db, "sepet", urun.id)
    );

    alert("❤️ Favorilere taşındı");

  }

  function kuponUygula() {

    if (kupon === "HEDIYE10") {

      alert("%10 indirim uygulanacak.");

    } else {

      alert("Geçersiz kupon.");

    }

  }

  const toplam = urunler.reduce(
    (t, u) => t + (Number(u.fiyat || 0) * Number(u.adet || 1)),
    0
  );

  // Kargo maliyeti alıcıya yansıtılmaz; fiziksel gönderimi satıcı karşılar.
  const kargo = 0;

  const genelToplam = toplam + kargo;
  return (

    <div className="page">

      <h1>🛒 Sepetim ({urunler.length})</h1>

      {
        sepetYukleniyor ? (

          <h2>Sepetiniz yükleniyor...</h2>

        ) : urunler.length === 0 ? (

          <h2>Sepetiniz boş.</h2>

        ) : (

          <div className="cart-layout">

            <div className="cart-left">

              {
                urunler.map((urun) => (

                  <CartItem
                    key={urun.id}
                    urun={urun}
                    adetArttir={adetArttir}
                    adetAzalt={adetAzalt}
                    sil={sil}
                    favorilereTasi={favorilereTasi}
                  />

                ))
              }

            </div>

            <div className="cart-right">

              <CartSummary
                toplam={toplam}
                genelToplam={genelToplam}
                kupon={kupon}
                setKupon={setKupon}
                kuponUygula={kuponUygula}
                navigate={navigate}
              />

            </div>

          </div>

        )
      }

    </div>

  );

}

export default Cart;
