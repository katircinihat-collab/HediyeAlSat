import { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { apiUrl } from "../../config/api";
import { updateSellerOrderStatus } from "../../services/sellerOrderStatusApi";
import SellerReturnStatus from "../seller/SellerReturnStatus";
import { orderImage, orderMoney, orderText } from "../../utils/storeOrders";
import { sellerArchiveRequest } from "../../services/sellerOrderArchiveApi";

export default function StoreOrderCard({ order, view }) {
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archived, setArchived] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [shipping, setShipping] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [addressOpen, setAddressOpen] = useState(false);
  const [delivery, setDelivery] = useState(null);
  const [deliveryError, setDeliveryError] = useState("");
  const [imageFailed, setImageFailed] = useState("");
  const [listingImage, setListingImage] = useState(null);
  const imageAnchor = useRef(null);
  const listingId = orderText(order.ilanId) || orderText(order.urunId);
  const image = view.image || (listingImage?.id === listingId ? listingImage.url : "");
  useEffect(() => {
    // Older order snapshots lack an image. Fetch only visible cards, never block orders.
    if (view.image || !listingId || listingId.includes("/")) return undefined;
    let active = true;
    const load = () => getDoc(doc(db, "ilanlar", listingId)).then((snapshot) => {
      if (active && snapshot.exists()) {
        const listing = snapshot.data();
        setListingImage({ id: listingId, url: orderImage(listing.resimler?.[0]) || orderImage(listing.resim) });
      }
    }).catch(() => {});
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); load(); }
    });
    if (observer && imageAnchor.current) observer.observe(imageAnchor.current);
    else load();
    return () => { active = false; observer?.disconnect(); };
  }, [listingId, view.image]);
  useEffect(() => {
    if (!addressOpen || order.isRaffleGift !== true) return undefined;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    async function loadDelivery() {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error();
        const response = await fetch(apiUrl(`/api/raffles/orders/${encodeURIComponent(view.id)}/fulfillment`), { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.delivery) throw new Error();
        if (active) setDelivery(result.delivery);
      } catch {
        if (active) setDeliveryError("Teslimat bilgisi alınamadı. Alanı kapatıp yeniden deneyebilirsiniz.");
      } finally { clearTimeout(timer); }
    }
    loadDelivery();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [addressOpen, order.isRaffleGift, view.id]);

  async function update(payload) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setError(""); setMessage("");
    try {
      await updateSellerOrderStatus(view.id, payload);
      setMessage("Sipariş durumu güncellendi."); setShipping(false);
    } catch (failure) {
      setError(failure.message || "İşlem tamamlanamadı. Lütfen tekrar deneyin.");
    } finally { lock.current = false; setBusy(false); }
  }
  const destination = order.isRaffleGift === true ? delivery : { fullName: order.adSoyad, address: order.adres, city: order.il, district: order.ilce, phone: order.telefon };
  const canShowAddress = !view.digital && view.paid && ["Ödendi", "Hazırlanıyor", "Kargoda"].includes(view.status);
  async function archive() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await sellerArchiveRequest(`${encodeURIComponent(view.id)}/archive-failed`);
      setArchived(true); // Firestore listener subsequently recalculates the shared list and counters.
    } catch (failure) { setError(failure.message || "Bu kayıt silinemedi."); }
    finally { lock.current = false; setBusy(false); }
  }
  if (archived && view.paymentAttempt) return null;
  return <article className="store-orders__card" aria-label={`Sipariş ${view.number}`}>
    <div className="store-orders__card-head"><div><strong>Sipariş #{view.number}</strong><time dateTime={view.date?.toISOString()}>{view.date ? view.date.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "Tarih bilgisi yok"}</time></div><span className={`store-orders__badge ${view.problem ? "is-problem" : view.delivered ? "is-delivered" : ""}`}>{view.status === "Ödendi" ? "Yeni sipariş" : view.status}</span></div>
    <div className="store-orders__product"><div className="store-orders__image" ref={imageAnchor}>{image && imageFailed !== image ? <img src={image} alt={view.title} loading="lazy" onError={() => setImageFailed(image)} /> : <span>Görsel mevcut değil</span>}</div><div><h2>{view.title}</h2>{view.variant && <p>Varyant: {view.variant}</p>}<p className="store-orders__muted">{view.digital ? "💻 Dijital Teslimat" : "Fiziksel teslimat"}{order.isRaffleGift === true ? " · Kura Hediyesi" : ""}</p><dl><div><dt>Alıcı</dt><dd>{view.buyer}</dd></div><div><dt>Adet</dt><dd>{view.quantity ?? "Bilgi yok"}</dd></div><div><dt>Sipariş toplamı</dt><dd>{orderMoney(view.amount)}</dd></div></dl></div></div>
    {view.digital ? <p className="store-orders__notice">Fiziksel kargo yok. Ödeme sonrası güvenli teslimat mevcut dijital teslimat sistemiyle sağlanır.</p>
      : <ol className="store-orders__timeline" aria-label="Teslimat aşamaları">{["Sipariş alındı", "Hazırlanıyor", "Kargoda", "Teslim"].map((label, index) => <li key={label} className={index <= view.step ? "is-complete" : ""} aria-current={index === view.step ? "step" : undefined}><span aria-hidden="true">{index < view.step ? "✓" : index + 1}</span>{label}</li>)}</ol>}
    {view.payout && <div className="store-orders__notice"><strong>{view.payout.label}</strong><p>{view.payout.detail}</p></div>}
    {!view.digital && orderText(order.kargoNo) && <p>Kargo: {orderText(order.kargoFirma) || "Firma bilgisi yok"} · Takip no: {orderText(order.kargoNo)}</p>}
    <div className="store-orders__actions">
      {view.action.kind === "PREPARE" ? <button type="button" disabled={busy} onClick={() => update({ durum: "Hazırlanıyor" })}>{busy ? "Güncelleniyor…" : "Siparişi Hazırla"}</button>
        : view.action.kind === "SHIP" ? <button type="button" disabled={busy} aria-expanded={shipping} onClick={() => setShipping((value) => !value)}>Kargoya Ver</button>
          : <span className="store-orders__muted">{view.status === "Teslim Edildi" ? "Teslimat tamamlandı." : view.action.label}</span>}
      {canShowAddress && <button className="store-orders__secondary" type="button" aria-expanded={addressOpen} onClick={() => { setDelivery(null); setDeliveryError(""); setAddressOpen((value) => !value); }}>{addressOpen ? "Teslimat bilgisini gizle" : "Kargo için teslimat bilgisi"}</button>}
    </div>
    {view.cleanupEligible && view.paymentAttempt && <div className="store-orders__cleanup">
      {!confirmArchive ? <button className="store-orders__danger" type="button" disabled={busy} onClick={() => setConfirmArchive(true)}>Başarısız Kaydı Sil</button>
        : <section role="group" aria-label="Başarısız kayıt temizleme onayı"><p>Bu ödeme tamamlanmadı. Bu başarısız sipariş kaydını silmek istediğine emin misin?</p><p>Tamamlanmış satışlar ve finansal kayıtlar silinemez. Kayıt listeden kaldırılır; denetim geçmişi güvenli arşivde korunur.</p><div className="store-orders__actions"><button type="button" disabled={busy} onClick={() => setConfirmArchive(false)}>Vazgeç</button><button className="store-orders__danger" type="button" disabled={busy} onClick={archive}>{busy ? "Siliniyor…" : "Kaydı Sil"}</button></div></section>}
    </div>}
    {shipping && view.action.kind === "SHIP" && <form className="store-orders__shipment" onSubmit={(event) => { event.preventDefault(); if (carrier.trim() && tracking.trim()) update({ durum: "Kargoda", kargoFirma: carrier.trim(), kargoNo: tracking.trim() }); }}><label>Kargo firması<input required maxLength={80} value={carrier} onChange={(e) => setCarrier(e.target.value)} disabled={busy} /></label><label>Takip numarası<input required maxLength={120} value={tracking} onChange={(e) => setTracking(e.target.value)} disabled={busy} /></label><button disabled={busy || !carrier.trim() || !tracking.trim()} type="submit">{busy ? "Kaydediliyor…" : "Kargoya verildiğini onayla"}</button></form>}
    {addressOpen && canShowAddress && <section className="store-orders__delivery" aria-label="Kargo teslimat bilgisi"><strong>Yalnızca siparişin teslimatı için kullanın.</strong>{deliveryError ? <p role="alert">{deliveryError}</p> : destination ? <address>{orderText(destination.fullName)}<br />{orderText(destination.address) || "Adres bilgisi kayıtta bulunmuyor."}<br />{orderText(destination.district)} {orderText(destination.city)}{orderText(destination.phone) && <><br />{orderText(destination.phone)}</>}</address> : <p role="status">Teslimat bilgisi yükleniyor…</p>}</section>}
    {orderText(order.aktifTalepId) && <div className="store-orders__notice"><strong>İade / itiraz kaydı</strong><SellerReturnStatus claimId={order.aktifTalepId} /></div>}
    {error && <p role="alert" className="store-orders__error">{error}</p>}{message && <p role="status">{message}</p>}
  </article>;
}
