import { useRef, useState } from "react";
import { sellerDashboardRequest } from "../../services/sellerDashboardApi";
import { normalizeBankForm, validBankForm } from "../../utils/sellerDashboard";

export default function BankAccount({ wallet = {}, onSaved }) {
  const [form, setForm] = useState(() => normalizeBankForm(wallet));
  const [editing, setEditing] = useState(!wallet.iban);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  async function save(event) {
    event.preventDefault();
    if (lock.current) return;
    if (!validBankForm(form)) { setError("Banka, hesap sahibi ve geçerli Türkiye IBAN’ını kontrol edin."); return; }
    lock.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const result = await sellerDashboardRequest("/api/wallet/save-iban", { method: "POST", body: normalizeBankForm(form) });
      onSaved(result.wallet);
      setEditing(false);
      setMessage("Banka bilgileri kaydedildi. Bu işlem banka veya ödeme sağlayıcısı doğrulaması anlamına gelmez.");
    } catch { setError("Banka bilgileri kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section id="seller-bank" className="seller-final__section">
    <h2>Banka Hesabım</h2>
    <p>Mevcut kayıtlı banka hesabınız kullanılır. Kaydetmek, iyzico hesabının veya banka aktarımının doğrulandığı anlamına gelmez.</p>
    {!editing && wallet.iban ? <><strong>{wallet.ibanMasked || "Kayıtlı banka hesabı"}</strong><p>{wallet.hesapSahibi} · {wallet.bankaAdi}</p><button type="button" onClick={() => setEditing(true)}>Banka hesabını düzenle</button></>
      : <form className="seller-final__bank-form" onSubmit={save}>
        <label>Banka adı<input required minLength={2} maxLength={100} value={form.bankaAdi} disabled={busy} onChange={(e) => setForm({ ...form, bankaAdi: e.target.value })} /></label>
        <label>Hesap sahibi adı soyadı<input required minLength={3} maxLength={120} value={form.hesapSahibi} disabled={busy} onChange={(e) => setForm({ ...form, hesapSahibi: e.target.value })} /></label>
        <label>Türkiye IBAN<input required autoComplete="off" spellCheck={false} maxLength={32} value={form.iban} disabled={busy} onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })} /></label>
        <div><button disabled={busy} type="submit">{busy ? "Kaydediliyor…" : "Banka hesabını kaydet"}</button>{wallet.iban && <button className="seller-final__secondary" type="button" disabled={busy} onClick={() => { setForm(normalizeBankForm(wallet)); setEditing(false); setError(""); }}>Vazgeç</button>}</div>
      </form>}
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
  </section>;
}
