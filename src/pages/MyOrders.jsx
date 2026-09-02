import { useEffect, useState } from "react";
import { auth, db } from "../firebase";

import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy
} from "firebase/firestore";

import { Link } from "react-router-dom";
import { confirmOrderDelivery } from "../services/orderDeliveryApi";

import "../styles/pages/myorders.css";

function MyOrders() {

  const [siparisler, setSiparisler] = useState([]);
  const [dogrulanan, setDogrulanan] = useState(null);

  async function teslimAldim(siparis) {
    if (!window.confirm("Ürünü teslim aldığınızı onaylıyor musunuz?")) return;
    try {
      setDogrulanan(siparis.id);
      await confirmOrderDelivery(siparis.id);
    } catch (error) {
      alert(error.message);
    } finally {
      setDogrulanan(null);
    }
  }

  useEffect(() => {

    if (!auth.currentUser) return;

    const q = query(
      collection(db, "siparisler"),
      where(
        "kullanici",
        "==",
        auth.currentUser.email
      ),
      orderBy("tarih", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {

      setSiparisler(

        snap.docs.map((doc) => ({

          id: doc.id,

          ...doc.data()

        }))

      );

    });

    return () => unsub();

  }, []);

  return (

    <div className="page">

      <h1>

        📦 Siparişlerim

      </h1>

      {

        siparisler.length === 0 ?

          <div className="empty-orders">

            <h2>

              Henüz siparişiniz bulunmuyor.

            </h2>

          </div>

          :

          <div className="orders-list">

            {

              siparisler.map((siparis) => (
<div
  key={siparis.id}
  className="order-card"
>

  <div className="order-top">

    <div>

      <h3>

        #{siparis.siparisNo}

      </h3>

      <p className="order-date">

        {

          siparis.tarih?.toDate

            ?

            siparis.tarih
              .toDate()
              .toLocaleDateString("tr-TR")

            :

            ""

        }

      </p>

    </div>

    <div
      className={`status ${
        siparis.durum === "Teslim Edildi"
          ? "done"
          : siparis.durum === "Kargoda"
          ? "cargo"
          : siparis.durum === "Hazırlanıyor"
          ? "prepare"
          : "wait"
      }`}
    >

      {siparis.durum}

    </div>

  </div>

  <div className="order-middle">

    <img

      src={

        siparis.urunler?.[0]?.resim ||

        "/no-image.png"

      }

      alt=""

      className="order-image"

    />

    <div className="order-info">

      <h4>

        {

          siparis.urunler?.[0]?.baslik ||

          "Ürün"

        }

      </h4>

      <p>

        {siparis.urunler?.length || 1} ürün

      </p>

      <b>

        ₺{

          Number(

            siparis.genelToplam || 0

          ).toLocaleString("tr-TR")

        }

      </b>

    </div>

  </div>

  <div className="order-bottom">

    {(siparis.durum === "Kargoda" || siparis.durum === "Kargoya Verildi") && (
      <button type="button" className="buy-btn" disabled={dogrulanan === siparis.id} onClick={() => teslimAldim(siparis)}>
        {dogrulanan === siparis.id ? "Doğrulanıyor..." : "Teslim Aldım"}
      </button>
    )}

    <Link

      to={`/siparis/${siparis.id}`}

      className="detail-btn"

    >

      Siparişi Gör

    </Link>

  </div>

</div>
              ))

            }

          </div>

      }

    </div>

  );

}

export default MyOrders;
