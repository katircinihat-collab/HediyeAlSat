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
  updateDoc,
  deleteDoc,
  addDoc
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

function Cart() {

  const navigate = useNavigate();

  const [kupon, setKupon] = useState("");
  const [urunler, setUrunler] = useState([]);

  const KARGO_LIMIT = 750;
  const KARGO_UCRETI = 149;
  useEffect(() => {

    const unsubscribe = auth.onAuthStateChanged(async (user) => {

      if (!user) {
        setUrunler([]);
        return;
      }

      console.log("Giriş yapan:", user.email);

      const q = query(
        collection(db, "sepet"),
        where("kullanici", "==", user.email)
      );

      const unsub = onSnapshot(q, (snap) => {

        const liste = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log("Sepette bulunan:", liste);

        setUrunler(liste);

      });

      return () => unsub();

    });

    return () => unsubscribe();

  }, []);
  async function adetArttir(id, adet) {

    await updateDoc(
      doc(db, "sepet", id),
      {
        adet: adet + 1
      }
    );

  }

  async function adetAzalt(id, adet) {

    if (adet <= 1) {

      await deleteDoc(
        doc(db, "sepet", id)
      );

      return;

    }

    await updateDoc(
      doc(db, "sepet", id),
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
    (t, u) => t + (u.fiyat * u.adet),
    0
  );

  const kargo =
    toplam >= KARGO_LIMIT
      ? 0
      : KARGO_UCRETI;

  const genelToplam = toplam + kargo;
  return (

    <div className="page">

      <h1>🛒 Sepetim ({urunler.length})</h1>

      {
        urunler.length === 0 ? (

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
                kargo={kargo}
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