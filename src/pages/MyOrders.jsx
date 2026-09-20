import { useEffect, useState } from "react";
import { auth, db } from "../firebase";

import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { Link } from "react-router-dom";
import { confirmOrderDelivery } from "../services/orderDeliveryApi";
import OrderClaimForm from "../components/OrderClaimForm";
import OrderTimeline from "../components/OrderTimeline";
import { getDigitalDownload } from "../services/digitalDownloadApi";

import { isDigitalOrder, normalizeOrderStatus } from "../utils/orderLifecycle";

import "../styles/pages/myorders.css";

function MyOrders() {

  const [siparisler, setSiparisler] = useState([]);
  const [dogrulanan, setDogrulanan] = useState(null);
  const [indirilen, setIndirilen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);

  async function dijitalDosyaIndir(siparis) {
    try {
      setIndirilen(siparis.id);
      const download = await getDigitalDownload(siparis.id);
      window.location.assign(download.url);
    } catch (error) {
      alert(error.message);
    } finally {
      setIndirilen(null);
    }
  }

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
    let unsubscribeOrders = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeOrders();
      unsubscribeOrders = () => {};

      if (!user?.email) {
        setSiparisler([]);
        setLoading(false);
        setError("Siparişlerinizi görmek için giriş yapmalısınız.");
        return;
      }

      setLoading(true);
      setError("");

      const q = query(
        collection(db, "siparisler"),
        where("kullanici", "==", user.email)
      );

      unsubscribeOrders = onSnapshot(q, (snap) => {
        const timestamp = (order) => {
          const value = order.tarih || order.olusturmaTarihi;
          if (typeof value?.toMillis === "function") return value.toMillis();
          if (typeof value?.toDate === "function") return value.toDate().getTime();
          const parsed = new Date(value || 0).getTime();
          return Number.isFinite(parsed) ? parsed : 0;
        };
        const orders = snap.docs
          .map((document) => ({ id: document.id, ...document.data() }))
          .sort((left, right) => timestamp(right) - timestamp(left));
        setSiparisler(orders);
        setLoading(false);
      }, () => {
        setLoading(false);
        setError("Siparişleriniz şu anda alınamıyor. Lütfen tekrar deneyin.");
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeOrders();
    };

  }, [retryVersion]);

  return (

    <div className="page">

      <h1>

        📦 Siparişlerim

      </h1>

      {loading ? <div className="orders-state" role="status">Siparişleriniz yükleniyor...</div>
        : error ? <div className="orders-state error" role="alert"><p>{error}</p><button type="button" className="detail-btn" onClick={() => setRetryVersion((value) => value + 1)}>Tekrar Dene</button></div>
        : siparisler.length === 0 ?

          <div className="empty-orders">

            <h2>

              Henüz siparişiniz bulunmuyor.

            </h2>

          </div>

          :

          <div className="orders-list">

            {

              siparisler.map((siparis) => {
                const digital = isDigitalOrder(siparis);
                const status = normalizeOrderStatus(siparis.durum);
                
                return (
<div
  key={siparis.id}
  className="order-card"
>

  <div className="order-top">

    <div>

      <h3>

        {siparis.siparisNo ? `#${siparis.siparisNo}` : "Sipariş"}

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
        status === "Teslim Edildi" || status === "Tamamlandı"
          ? "done"
          : status === "Kargoda"
          ? "cargo"
          : status === "Hazırlanıyor"
          ? "prepare"
          : "wait"
      }`}
    >

      {status}

    </div>

  </div>

  {siparis.isRaffleGift && <div className="order-claim-message">🎁 Kura Hediyesi · {siparis.raffleRecipientDisplayName || "Eşleşen kişi"} için</div>}

  <OrderTimeline order={siparis} />

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

    {!digital && siparis.kargoNo && (
      <span className="order-claim-message">Kargo: {siparis.kargoFirma || "Kargo firması"} · Takip: {siparis.kargoNo}</span>
    )}

    

    {digital && siparis.odemeDurumu === true && (
      <button type="button" className="buy-btn" disabled={indirilen === siparis.id} onClick={() => dijitalDosyaIndir(siparis)}>
        {indirilen === siparis.id ? "Hazırlanıyor..." : "Dosyayı İndir"}
      </button>
    )}

    {digital && siparis.odemeDurumu === true && (
      <span className="order-claim-message">Dijital teslimat tamamlandı. Sorunları 48 saat içinde bildirebilirsiniz.</span>
    )}

    {!digital && status === "Kargoda" && (
      <button type="button" className="buy-btn" disabled={dogrulanan === siparis.id} onClick={() => teslimAldim(siparis)}>
        {dogrulanan === siparis.id ? "Doğrulanıyor..." : "Teslim Aldım"}
      </button>
    )}
    <OrderClaimForm order={siparis} />

    <Link

      to={`/siparis/${siparis.id}`}

      className="detail-btn"

    >

      Siparişi Gör

    </Link>

  </div>

</div>
              );})

            }

          </div>

      }

    </div>

  );

}

export default MyOrders;
