import { useState } from "react";
import { createPortal } from "react-dom";
import { auth } from "../firebase";
import { initializeListingBoost } from "../services/listingBoostApi";
import { isListingBoostActive, listingBoostEndDate, LISTING_BOOST_PACKAGES } from "../utils/listingBoost";
import "../styles/components/listing-boost.css";

export default function ListingBoostButton({ listing, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("boost_7");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = isListingBoostActive(listing);
  const endDate = listingBoostEndDate(listing);

  async function startPayment() {
    if (!auth.currentUser || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await initializeListingBoost(auth.currentUser, listing.id, selected);
      if (!result.paymentPageUrl) throw new Error("Güvenli ödeme sayfası oluşturulamadı.");
      window.location.assign(result.paymentPageUrl);
    } catch (paymentError) {
      setError(paymentError.message || "Öne çıkarma ödemesi başlatılamadı.");
      setLoading(false);
    }
  }

  function closeModal() {
    if (!loading) setOpen(false);
  }

  const modal = open && typeof document !== "undefined" ? createPortal(
    <div className="listing-boost-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && closeModal()}>
      <section
        className="listing-boost-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`boost-title-${listing.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header><div><small>İLAN GÖRÜNÜRLÜĞÜ</small><h2 id={`boost-title-${listing.id}`}>İlanını öne çıkar</h2><p>{listing.baslik || "İlan"}</p></div><button type="button" aria-label="Pencereyi kapat" disabled={loading} onClick={closeModal}>×</button></header>
        {active && <p className="listing-boost-extension">Yeni paket mevcut bitiş tarihinin üzerine eklenir; kalan süreniz kaybolmaz.</p>}
        <div className="listing-boost-packages">
          {LISTING_BOOST_PACKAGES.map((item) => <label key={item.id} className={selected === item.id ? "selected" : ""}>
            <input type="radio" name={`boost-${listing.id}`} value={item.id} checked={selected === item.id} onChange={() => setSelected(item.id)} />
            <span><strong>{item.days} gün</strong><small>Daha görünür ilan</small></span><b>₺{item.price}</b>
          </label>)}
        </div>
        <p className="listing-boost-note">Ödeme HediyeAlSat ilan tanıtım hizmeti içindir. Ürün satışı ve satıcı bakiyesiyle ilişkilendirilmez.</p>
        {error && <p className="listing-boost-error" role="alert">{error}</p>}
        <footer><button type="button" className="secondary" disabled={loading} onClick={closeModal}>Vazgeç</button><button type="button" disabled={loading} onClick={startPayment}>{loading ? "Güvenli ödeme hazırlanıyor..." : "Güvenli Ödemeye Geç"}</button></footer>
      </section>
    </div>,
    document.body,
  ) : null;

  return <>
    <button type="button" className="listing-boost-trigger" disabled={disabled} onClick={(event) => { event.stopPropagation(); setError(""); setOpen(true); }}>
      {active ? "⭐ Süreyi Uzat" : "⭐ Öne Çıkar"}
    </button>
    {active && endDate && <small className="listing-boost-active">Öne çıkarma {endDate.toLocaleDateString("tr-TR")} tarihine kadar aktif</small>}
    {modal}
  </>;
}
