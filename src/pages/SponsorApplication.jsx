import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { auth, db } from "../firebase";
import { sponsorStoreApi } from "../config/sponsorStoreApi";
import packageConfig from "../../shared/sponsorStorePackages.json";
import "../styles/pages/sponsor-application.css";

const labels = { REVIEW_PENDING: "İncelemede", REJECTED: "Reddedildi", APPROVED_PAYMENT_PENDING: "Onaylandı / Ödeme Bekleniyor", ACTIVE: "Aktif Sponsor" };

function applicationStatus(item, now) {
  if (item.status === "ACTIVE") {
    const end = new Date(item.sponsorEndDate?.seconds ? item.sponsorEndDate.seconds * 1000 : item.sponsorEndDate).getTime();
    if (Number.isFinite(end) && end <= now) return "Süresi Doldu";
  }
  if (item.paymentStatus === "FAILED") return "Ödeme Başarısız";
  return labels[item.status] || item.status;
}

function SponsorApplication() {
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState({ yetkiliAdi: auth.currentUser?.displayName || "", telefon: "", webSitesi: "", hakkinda: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [openedAt] = useState(() => Date.now());

  const load = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }
    try {
      const [storeSnap, own] = await Promise.all([
        getDocs(query(collection(db, "magazalar"), where("sahipUid", "==", user.uid), limit(1))),
        sponsorStoreApi("/applications/mine")
      ]);
      let found = storeSnap.docs[0];
      if (!found && user.email) {
        const legacy = await getDocs(query(collection(db, "magazalar"), where("sahip", "==", user.email), limit(1)));
        found = legacy.docs[0];
      }
      setStore(found ? { id: found.id, ...found.data() } : null);
      setApplications(own.applications || []);
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const blocking = useMemo(() => applications.some((item) => ["REVIEW_PENDING", "APPROVED_PAYMENT_PENDING"].includes(item.status) || (item.status === "ACTIVE" && new Date(item.sponsorEndDate?.seconds ? item.sponsorEndDate.seconds * 1000 : item.sponsorEndDate).getTime() > openedAt)), [applications, openedAt]);

  async function submit(event) {
    event.preventDefault();
    if (!store || submitting) return;
    setMessage(""); setSubmitting(true);
    try {
      await sponsorStoreApi("/applications", { method: "POST", body: JSON.stringify({ storeId: store.id, ...form }) });
      setMessage("Başvurunuz incelemeye alındı. Paket seçimi admin onayından sonra yapılacaktır.");
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setSubmitting(false); }
  }

  function pay(application) {
    const selected = packageConfig.packages.find((item) => item.id === application.selectedPackageId);
    if (!selected) return;
    navigate("/odeme", { state: { sponsor: true, sponsorBasvuruId: application.id, paketId: selected.id, paketAdi: selected.name, fiyat: selected.price, sure: selected.durationDays, magazaAdi: application.magazaAdi, yetkiliAdi: application.yetkiliAdi, email: application.email, telefon: application.telefon } });
  }

  return <><Navbar /><main className="sponsor-application-page"><div className="sponsor-application-container">
    <Link to="/sponsor-magaza" className="sponsor-application-back">← Sponsor Mağaza</Link>
    <section className="sponsor-application-hero"><div className="sponsor-application-icon">🏪</div><h1>Sponsor Mağaza Başvurusu</h1><p>Başvurunuz incelendikten sonra paketiniz admin tarafından belirlenir; ödeme tamamlanmadan sponsor görünümü açılmaz.</p></section>
    <section className="sponsor-package-section"><div className="sponsor-form-title"><span>✨</span><div><h2>Sponsor Paketleri</h2><p>Paket seçimini başvurunuzu inceleyen ekip yapar.</p></div></div><div className="sponsor-package-grid">{packageConfig.packages.map((item) => <div key={item.id} className={`sponsor-package-card sponsor-tier-${item.id}`}><h3>{item.name}</h3><div className="sponsor-package-price">{item.price.toLocaleString("tr-TR")} TL</div><div className="sponsor-package-duration">{item.durationDays} gün</div></div>)}</div></section>
    {applications.length > 0 && <section className="sponsor-application-form-section"><div className="sponsor-form-title"><span>📋</span><div><h2>Başvurularım</h2><p>İnceleme ve ödeme durumunu buradan takip edin.</p></div></div><div className="sponsor-status-list">{applications.map((item) => { const selected = packageConfig.packages.find((pkg) => pkg.id === item.selectedPackageId); return <article key={item.id} className="sponsor-status-card"><strong>{item.magazaAdi}</strong><span>{applicationStatus(item, openedAt)}</span>{selected && <p>{selected.name} · {selected.durationDays} gün · {selected.price.toLocaleString("tr-TR")} TL</p>}{item.status === "APPROVED_PAYMENT_PENDING" && <button type="button" onClick={() => pay(item)}>Ödemeyi Tamamla</button>}</article>; })}</div></section>}
    {loading ? <div className="sponsor-store-info">Başvuru bilgileri yükleniyor…</div> : !auth.currentUser ? <div className="sponsor-store-info">Başvuru için <Link to="/login">giriş yapın</Link>.</div> : !store ? <div className="sponsor-store-info">Sponsor başvurusu için önce kendi mağazanızı oluşturmalısınız.</div> : !blocking && <section className="sponsor-application-form-section"><div className="sponsor-form-title"><span>📝</span><div><h2>{store.magazaAdi || store.adi}</h2><p>Başvurunuz bu mağazaya güvenli biçimde bağlanacaktır.</p></div></div><form className="sponsor-application-form" onSubmit={submit}><div className="sponsor-form-grid"><div className="sponsor-form-group"><label>Yetkili Adı *</label><input value={form.yetkiliAdi} onChange={(e) => setForm({ ...form, yetkiliAdi: e.target.value })} required maxLength={100} /></div><div className="sponsor-form-group"><label>Telefon *</label><input type="tel" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} required maxLength={30} /></div><div className="sponsor-form-group sponsor-full"><label>Web Sitesi</label><input type="url" value={form.webSitesi} onChange={(e) => setForm({ ...form, webSitesi: e.target.value })} maxLength={250} /></div><div className="sponsor-form-group sponsor-full"><label>Mağazanız Hakkında *</label><textarea value={form.hakkinda} onChange={(e) => setForm({ ...form, hakkinda: e.target.value })} minLength={20} maxLength={1000} rows={6} required /></div></div><button className="sponsor-application-submit" disabled={submitting}>{submitting ? "Gönderiliyor…" : "Başvuruyu İncelemeye Gönder"}</button></form></section>}
    {message && <div className="sponsor-store-info" role="status">{message}</div>}
  </div></main></>;
}
export default SponsorApplication;
