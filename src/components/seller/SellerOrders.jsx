import { Fragment, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
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
  if (durum === "Hazırlanıyor") return "preparing";
  if (durum === "Kargoda") return "shipping";
  if (durum === "Teslim" || durum === "Teslim Edildi") return "delivered";
  return "waiting";
}

function tamamlanmisSiparisMi(siparis) {
  return siparis.durum === "Teslim Edildi" || siparis.durum === "Teslim";
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

  const toplamSatis = siparisler.reduce(
    (toplam, siparis) => toplam + Number(siparis.toplam ?? siparis.fiyat ?? 0),
    0
  );
  const bekleyen = siparisler.filter((siparis) => siparis.durum === "Bekliyor").length;
  const hazirlanan = siparisler.filter((siparis) => siparis.durum === "Hazırlanıyor").length;
  const kargoda = siparisler.filter((siparis) => siparis.durum === "Kargoda").length;
  const teslim = siparisler.filter((siparis) => siparis.durum === "Teslim").length;
  const tamamlananSiparisler = siparisler.filter(tamamlanmisSiparisMi);
  const aktifSiparisler = siparisler.filter((siparis) => !tamamlanmisSiparisMi(siparis));
  const goruntulenenSiparisler = aktifSekme === "tamamlanan"
    ? tamamlananSiparisler
    : aktifSiparisler;

  return (
    <section className="seller-orders-section">
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
            const siparisNo = siparis.siparisNo || siparis.id;
            const kisaSiparisNo = siparisNo.length > 14
              ? `${siparisNo.slice(0, 11)}…`
              : siparisNo;
            const acik = acikSiparis === siparis.id;

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
                    <span className={`seller-order-badge ${durumSinifi(siparis.durum)}`}>
                      {siparis.durum || "Bekliyor"}
                    </span>
                  </div>
                  <div role="cell" data-label="İşlem">
                    <button
                      type="button"
                      className="seller-order-detail-button"
                      onClick={() => setAcikSiparis(acik ? null : siparis.id)}
                      aria-expanded={acik}
                    >
                      {acik ? "Gizle" : "Detay"}
                    </button>
                  </div>
                </div>

                {acik && (
                  <div className="seller-order-detail-panel">
                    <div className="seller-order-detail-grid">
                      <div><strong>Alıcı</strong><span>{siparis.alici || "—"}</span></div>
                      <div><strong>Satıcı</strong><span>{siparis.satici || "—"}</span></div>
                      <div><strong>Telefon</strong><span>{siparis.telefon || "—"}</span></div>
                      <div><strong>Komisyon</strong><span>{tutarFormatla({ toplam: Number(siparis.toplam || 0) * 0.08 })}</span></div>
                      <label>
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
                      </label>
                      <label>
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
                      </label>
                    </div>

                    <div className="seller-order-contact-actions">
                      <a href={`tel:${siparis.telefon || ""}`} className="phone-btn">📞 Ara</a>
                      <a href={`https://wa.me/90${siparis.telefon || ""}`} target="_blank" rel="noreferrer" className="whatsapp-btn">💬 WhatsApp</a>
                    </div>

                    <div className="seller-order-status-actions">
                      <button type="button" className="edit-btn" onClick={async () => {
                        await updateDoc(doc(db, "siparisler", siparis.id), { durum: "Hazırlanıyor" });
                        getir();
                      }}>📦 Hazırla</button>
                      <button type="button" className="cart-btn" onClick={async () => {
                        const firma = kargoBilgileri[siparis.id]?.firma || "Yurtiçi";
                        const takipNo = kargoBilgileri[siparis.id]?.no || "";
                        if (!takipNo) {
                          alert("Takip numarası giriniz.");
                          return;
                        }
                        await updateDoc(doc(db, "siparisler", siparis.id), {
                          durum: "Kargoda",
                          kargoFirma: firma,
                          kargoNo: takipNo,
                          kargoTarihi: new Date()
                        });
                        alert("🚚 Kargo bilgisi kaydedildi.");
                        getir();
                      }}>🚚 Kargoya Ver</button>
                      <button type="button" className="buy-btn" onClick={async () => {
                        await updateDoc(doc(db, "siparisler", siparis.id), {
                          durum: "Teslim",
                          teslimTarihi: new Date()
                        });
                        alert("✅ Sipariş teslim edildi.");
                        getir();
                      }}>✅ Teslim</button>
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
