import { Fragment, useState } from "react";
import { auth } from "../../firebase";
import { apiUrl } from "../../config/api";
import { updateSellerOrderStatus } from "../../services/sellerOrderStatusApi";
import { payoutDisplay } from "../../utils/orderDelivery";
import SellerReturnStatus from "./SellerReturnStatus";
import { isDigitalOrder, normalizeOrderStatus, sellerActionSummary, sellerNextAction } from "../../utils/orderLifecycle";
import "../../styles/pages/seller-orders.css";

function tarihFormatla(siparis) {
  const tarih = siparis.tarih || siparis.olusturmaTarihi;
  if (tarih?.toDate) return tarih.toDate().toLocaleDateString("tr-TR");
  if (tarih instanceof Date) return tarih.toLocaleDateString("tr-TR");
  return "—";
}

function tutarFormatla(siparis) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY"
  }).format(Number(siparis.toplam ?? siparis.fiyat ?? 0));
}

function durumSinifi(durum) {
  const canonical = normalizeOrderStatus(durum);
  if (canonical === "Hazırlanıyor") return "preparing";
  if (canonical === "Kargoda") return "shipping";
  if (canonical === "Teslim Edildi" || canonical === "Tamamlandı") return "delivered";
  return "waiting";
}

function tamamlanmisSiparisMi(siparis) {
  return normalizeOrderStatus(siparis.durum) === "Teslim Edildi";
}

function SellerOrderThumbnail({ src, baslik }) {
  const [gorselHatasi, setGorselHatasi] = useState(false);

  if (!src || gorselHatasi) {
    return (
      <div className="seller-order-thumbnail-placeholder" aria-label="Ürün görseli bulunmuyor">
        📦
      </div>
    );
  }

  return (
    <img
      className="seller-order-thumbnail"
      src={src}
      alt={baslik ? `${baslik} görseli` : "Ürün görseli"}
      onError={() => setGorselHatasi(true)}
    />
  );
}

function SellerOrders({ siparisler, getir }) {
  const [kargoBilgileri, setKargoBilgileri] = useState({});
  const [acikSiparis, setAcikSiparis] = useState(null);
  const [aktifSekme, setAktifSekme] = useState("aktif");
  const [guncellenenSiparis, setGuncellenenSiparis] = useState(null);
  const [raffleDeliveries, setRaffleDeliveries] = useState({});

  async function toggleOrder(siparis, acik) {
    setAcikSiparis(acik ? null : siparis.id);
    if (acik || !siparis.isRaffleGift || raffleDeliveries[siparis.id]) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(apiUrl(`/api/raffles/orders/${siparis.id}/fulfillment`), { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Teslimat bilgisi alınamadı.");
      setRaffleDeliveries((current) => ({ ...current, [siparis.id]: result.delivery }));
    } catch (error) {
      setRaffleDeliveries((current) => ({ ...current, [siparis.id]: { error: error.message } }));
    }
  }

  async function durumGuncelle(siparis, payload) {
    if (guncellenenSiparis) return;
    try {
      setGuncellenenSiparis(siparis.id);
      await updateSellerOrderStatus(siparis.id, payload);
      await getir();
    } catch (error) {
      alert(error.message);
    } finally {
      setGuncellenenSiparis(null);
    }
  }

  const toplamSatis = siparisler.reduce(
    (toplam, siparis) => toplam + Number(siparis.toplam ?? siparis.fiyat ?? 0),
    0
  );
  const bekleyen = siparisler.filter((siparis) => normalizeOrderStatus(siparis.durum) === "Ödendi").length;
  const hazirlanan = siparisler.filter((siparis) => normalizeOrderStatus(siparis.durum) === "Hazırlanıyor").length;
  const kargoda = siparisler.filter((siparis) => normalizeOrderStatus(siparis.durum) === "Kargoda").length;
  const teslim = siparisler.filter((siparis) => normalizeOrderStatus(siparis.durum) === "Teslim Edildi").length;
  const tamamlananSiparisler = siparisler.filter(tamamlanmisSiparisMi);
  const aktifSiparisler = siparisler.filter((siparis) => !tamamlanmisSiparisMi(siparis));
  const goruntulenenSiparisler = aktifSekme === "tamamlanan"
    ? tamamlananSiparisler
    : aktifSiparisler;
  const yapilacaklar = sellerActionSummary(siparisler);
  const yapilacakSayisi = yapilacaklar.prepare.length + yapilacaklar.ship.length + yapilacaklar.trackingMissing.length + yapilacaklar.claims.length;

  return (
    <section className="seller-orders-section" id="seller-orders">
      <div className="seller-action-center">
        <header><span>Öncelikli operasyonlar</span><h2>Yapman Gerekenler</h2></header>
        {yapilacakSayisi === 0 ? <p className="seller-action-clear">✅ Şu anda müdahale gerektiren sipariş bulunmuyor.</p> : <div className="seller-action-list">
          {yapilacaklar.prepare.length > 0 && <button type="button" onClick={() => setAktifSekme("aktif")}>📦 <strong>{yapilacaklar.prepare.length} sipariş hazırlanmayı bekliyor</strong><span>Siparişleri Gör →</span></button>}
          {yapilacaklar.ship.length > 0 && <button type="button" onClick={() => setAktifSekme("aktif")}>🚚 <strong>{yapilacaklar.ship.length} sipariş kargoya verilmeli</strong><span>Siparişleri Gör →</span></button>}
          {yapilacaklar.trackingMissing.length > 0 && <button type="button" onClick={() => setAktifSekme("aktif")}>⚠️ <strong>{yapilacaklar.trackingMissing.length} siparişte takip numarası eksik</strong><span>Kontrol Et →</span></button>}
          {yapilacaklar.claims.length > 0 && <button type="button" onClick={() => setAktifSekme("aktif")}>🟠 <strong>{yapilacaklar.claims.length} iade/itiraz inceleniyor</strong><span>Durumu Gör →</span></button>}
        </div>}
      </div>
      <div className="seller-orders-summary">
        <article><span>Toplam Satış</span><strong>{tutarFormatla({ toplam: toplamSatis })}</strong></article>
        <article><span>Bekleyen</span><strong>{bekleyen}</strong></article>
        <article><span>Hazırlanan</span><strong>{hazirlanan}</strong></article>
        <article><span>Kargoda</span><strong>{kargoda}</strong></article>
        <article><span>Teslim</span><strong>{teslim}</strong></article>
      </div>

      <header className="seller-orders-heading">
        <div>
          <span>Sipariş yönetimi</span>
          <h2>🛒 Siparişlerim</h2>
        </div>
        <strong>{siparisler.length} sipariş</strong>
      </header>

      <div className="seller-orders-tabs" role="tablist" aria-label="Sipariş türü">
        <button
          type="button"
          role="tab"
          aria-selected={aktifSekme === "aktif"}
          className={aktifSekme === "aktif" ? "active" : ""}
          onClick={() => {
            setAktifSekme("aktif");
            setAcikSiparis(null);
          }}
        >
          Aktif Siparişler <span>{aktifSiparisler.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aktifSekme === "tamamlanan"}
          className={aktifSekme === "tamamlanan" ? "active" : ""}
          onClick={() => {
            setAktifSekme("tamamlanan");
            setAcikSiparis(null);
          }}
        >
          Tamamlananlar <span>{tamamlananSiparisler.length}</span>
        </button>
      </div>

      {goruntulenenSiparisler.length === 0 ? (
        <div className="seller-orders-empty">
          <span>📦</span>
          <h3>
            {aktifSekme === "tamamlanan"
              ? "Henüz tamamlanan sipariş bulunmuyor"
              : "Henüz aktif sipariş bulunmuyor"}
          </h3>
          <p>
            {aktifSekme === "tamamlanan"
              ? "Teslim edilen siparişler bu bölümde saklanacak."
              : "Yeni siparişler geldiğinde bu alanda görüntülenecek."}
          </p>
        </div>
      ) : (
        <div className="seller-orders-table" role="table" aria-label="Satıcı siparişleri">
          <div className="seller-orders-table-header" role="row">
            <span role="columnheader">Ürün</span>
            <span role="columnheader">Sipariş No</span>
            <span role="columnheader">Alıcı</span>
            <span role="columnheader">Tarih</span>
            <span role="columnheader">Tutar</span>
            <span role="columnheader">Durum</span>
            <span role="columnheader">İşlem</span>
          </div>

          {goruntulenenSiparisler.map((siparis) => {
            const siparisNo = String(siparis.siparisNo || "Sipariş");
            const kisaSiparisNo = siparisNo.length > 14
              ? `${siparisNo.slice(0, 11)}…`
              : siparisNo;
            const acik = acikSiparis === siparis.id;
            const canonicalDurum = normalizeOrderStatus(siparis.durum);
            const hakEdis = payoutDisplay(siparis);
            const digital = isDigitalOrder(siparis);
            const nextAction = sellerNextAction(siparis);

            return (
              <Fragment key={siparis.id}>
                <div className="seller-orders-row" role="row">
                  <div className="seller-orders-product" role="cell" data-label="Ürün">
                    <SellerOrderThumbnail src={siparis.resim} baslik={siparis.ilanBaslik || siparis.urunAdi} />
                    <span>{siparis.ilanBaslik || siparis.urunAdi || "Ürün bilgisi yok"}</span>
                  </div>
                  <div role="cell" data-label="Sipariş No">
                    <span className="seller-order-number" title={siparisNo}>{kisaSiparisNo}</span>
                  </div>
                  <div role="cell" data-label="Alıcı">{siparis.alici || "—"}</div>
                  <div role="cell" data-label="Tarih">{tarihFormatla(siparis)}</div>
                  <div role="cell" data-label="Tutar"><strong>{tutarFormatla(siparis)}</strong></div>
                  <div role="cell" data-label="Durum">
                    <span className={`seller-order-badge ${durumSinifi(canonicalDurum)}`}>
                      {canonicalDurum}
                    </span>
                  </div>
                  <div role="cell" data-label="İşlem">
                    <button
                      type="button"
                      className="seller-order-detail-button"
                      onClick={() => toggleOrder(siparis, acik)}
                      aria-expanded={acik}
                    >
                      {acik ? "Gizle" : "Detay"}
                    </button>
                  </div>
                </div>

                {acik && (
                  <div className="seller-order-detail-panel">
                    {siparis.isRaffleGift && <div className="seller-order-guidance"><strong>🎁 Kura Hediyesi</strong><small>Yalnız kargolama için gerekli teslimat bilgileri gösterilir.</small></div>}
                    <div className="seller-order-detail-grid">
                      {!siparis.isRaffleGift && <div><strong>Alıcı</strong><span>{siparis.alici || "—"}</span></div>}
                      <div><strong>Satıcı</strong><span>{siparis.satici || "—"}</span></div>
                      {!siparis.isRaffleGift && <div><strong>Telefon</strong><span>{siparis.telefon || "—"}</span></div>}
                      {siparis.isRaffleGift && raffleDeliveries[siparis.id]?.error && <div><strong>Teslimat</strong><span>{raffleDeliveries[siparis.id].error}</span></div>}
                      {siparis.isRaffleGift && raffleDeliveries[siparis.id] && !raffleDeliveries[siparis.id].error && <><div><strong>Teslim alacak kişi</strong><span>{raffleDeliveries[siparis.id].fullName}</span></div><div><strong>Telefon</strong><span>{raffleDeliveries[siparis.id].phone}</span></div><div><strong>Adres</strong><span>{raffleDeliveries[siparis.id].address}, {raffleDeliveries[siparis.id].district} / {raffleDeliveries[siparis.id].city}</span></div></>}
                      <div><strong>Komisyon</strong><span>{tutarFormatla({ toplam: Number(siparis.toplam || 0) * 0.08 })}</span></div>
                      {!digital && canonicalDurum === "Hazırlanıyor" && <label>
                        <strong>Kargo firması</strong>
                        <select
                          value={kargoBilgileri[siparis.id]?.firma || "Yurtiçi"}
                          onChange={(event) => setKargoBilgileri((onceki) => ({
                            ...onceki,
                            [siparis.id]: { ...onceki[siparis.id], firma: event.target.value }
                          }))}
                        >
                          <option>Yurtiçi</option><option>MNG</option><option>Aras</option>
                          <option>Sürat</option><option>PTT</option><option>UPS</option><option>DHL</option>
                        </select>
                      </label>}
                      {!digital && canonicalDurum === "Hazırlanıyor" && <label>
                        <strong>Takip No</strong>
                        <input
                          type="text"
                          placeholder="Takip numarası"
                          value={kargoBilgileri[siparis.id]?.no || ""}
                          onChange={(event) => setKargoBilgileri((onceki) => ({
                            ...onceki,
                            [siparis.id]: { ...onceki[siparis.id], no: event.target.value }
                          }))}
                        />
                      </label>}
                    </div>

                    {(!siparis.isRaffleGift || raffleDeliveries[siparis.id]?.phone) && <div className="seller-order-contact-actions">
                      <a href={`tel:${raffleDeliveries[siparis.id]?.phone || siparis.telefon || ""}`} className="phone-btn">📞 Ara</a>
                      <a href={`https://wa.me/90${String(raffleDeliveries[siparis.id]?.phone || siparis.telefon || "").replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="whatsapp-btn">💬 WhatsApp</a>
                    </div>}

                    <div className="seller-order-status-actions">
                      {!digital && canonicalDurum === "Ödendi" && (
                        <button type="button" className="edit-btn" disabled={guncellenenSiparis === siparis.id} onClick={() => durumGuncelle(siparis, { durum: "Hazırlanıyor" })}>
                          {guncellenenSiparis === siparis.id ? "Hazırlanıyor..." : "📦 Siparişi Hazırla"}
                        </button>
                      )}
                      {!digital && canonicalDurum === "Hazırlanıyor" && (
                        <button type="button" className="cart-btn" disabled={guncellenenSiparis === siparis.id} onClick={async () => {
                        const firma = kargoBilgileri[siparis.id]?.firma || "Yurtiçi";
                        const takipNo = kargoBilgileri[siparis.id]?.no || "";
                        if (!takipNo) {
                          alert("Takip numarası giriniz.");
                          return;
                        }
                        await durumGuncelle(siparis, {
                          durum: "Kargoda",
                          kargoFirma: firma,
                          kargoNo: takipNo
                        });
                      }}>{guncellenenSiparis === siparis.id ? "Kaydediliyor..." : "🚚 Kargoya Ver"}</button>
                      )}
                      {nextAction.kind === "WAIT" && <span className="seller-order-guidance">{nextAction.label}<small>Şu anda işlem yapmanız gerekmiyor.</small></span>}
                      {nextAction.kind === "TRACKING_MISSING" && <span className="seller-order-guidance warning">Takip numarası eksik. Siparişin kargo bilgisini kontrol edin.</span>}
                      {hakEdis && <span className="seller-order-payout-status"><strong>{hakEdis.label}</strong><small>{hakEdis.detail}</small></span>}
                      <SellerReturnStatus claimId={siparis.aktifTalepId} />
                      <button type="button" className="detail-btn" onClick={() => window.print()}>🖨 Yazdır</button>
                    </div>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default SellerOrders;
