import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { apiUrl } from "../../config/api";
import "../../styles/components/withdraw-request.css";

const normalizeIban = (value) => String(value || "").replace(/\s+/g, "").toUpperCase().slice(0, 26);
const formatIban = (value) => normalizeIban(value).match(/.{1,4}/g)?.join(" ") || "";

function BankAccount() {
  const [form, setForm] = useState({ bankaAdi: "", hesapSahibi: "", iban: "" });
  const [maskedIban, setMaskedIban] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) { setInitialLoading(false); return; }
    try {
      const response = await fetch(apiUrl(`/api/wallet/${encodeURIComponent(user.email)}`), {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Banka bilgileri alınamadı.");
      const wallet = data.wallet || {};
      setForm({ bankaAdi: wallet.bankaAdi || "", hesapSahibi: wallet.hesapSahibi || "", iban: formatIban(wallet.iban) });
      setMaskedIban(wallet.ibanMasked || "");
      setEditing(!wallet.iban);
    } catch (error) {
      console.error("Banka bilgileri alınamadı:", error.message);
    } finally { setInitialLoading(false); }
  }), []);

  async function kaydet() {
    const user = auth.currentUser;
    if (!user) return alert("Giriş yapınız.");
    if (!form.bankaAdi.trim() || !form.hesapSahibi.trim() || normalizeIban(form.iban).length !== 26) {
      return alert("Banka, hesap sahibi ve geçerli Türkiye IBAN'ını eksiksiz giriniz.");
    }
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/wallet/save-iban"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Banka bilgileri kaydedilemedi.");
      setMaskedIban(data.wallet?.ibanMasked || "");
      setForm((old) => ({ ...old, iban: formatIban(data.wallet?.iban || old.iban) }));
      setEditing(false);
      alert("Banka bilgileri başarıyla kaydedildi.");
    } catch (error) { alert(error.message); }
    finally { setLoading(false); }
  }

  return <section className="wallet-box bank-account-card">
    <h2>Banka Hesabım</h2>
    {!editing && maskedIban ? <>
      <strong className="masked-iban">{maskedIban}</strong>
      <p>{form.hesapSahibi} · {form.bankaAdi}</p>
      <button className="save-btn" type="button" onClick={() => setEditing(true)}>Banka hesabını düzenle</button>
    </> : <>
      <label>Banka Adı<input value={form.bankaAdi} onChange={(e) => setForm({ ...form, bankaAdi: e.target.value })} disabled={loading || initialLoading} /></label>
      <label>Hesap Sahibi Adı Soyadı<input value={form.hesapSahibi} onChange={(e) => setForm({ ...form, hesapSahibi: e.target.value })} disabled={loading || initialLoading} /></label>
      <label>IBAN<input autoComplete="off" placeholder="TR00 0000 0000 0000 0000 0000 00" value={form.iban} onChange={(e) => setForm({ ...form, iban: formatIban(e.target.value) })} disabled={loading || initialLoading} /></label>
      <button className="save-btn" type="button" onClick={kaydet} disabled={loading || initialLoading}>{loading ? "Kaydediliyor..." : "Banka hesabını kaydet"}</button>
    </>}
  </section>;
}

export default BankAccount;
