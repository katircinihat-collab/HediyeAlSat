import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { buildUserDocument, firebaseAuthErrorMessage, validateRegistration } from "../utils/auth";
import "../styles/pages/login.css";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", passwordAgain: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  function updateField(field, value) { setError(""); setForm((current) => ({ ...current, [field]: value })); }

  async function handleRegister(event) {
    event.preventDefault();
    if (submitting) return;
    const validationError = validateRegistration(form);
    if (validationError) { setError(validationError); return; }
    setSubmitting(true);
    setError("");
    try {
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const displayName = form.name.trim();
      await updateProfile(credential.user, { displayName });
      await setDoc(doc(db, "users", credential.user.uid), buildUserDocument({ name: displayName, email: credential.user.email, createdAt: serverTimestamp() }));
      navigate("/profil", { replace: true });
    } catch (firebaseError) {
      setError(firebaseAuthErrorMessage(firebaseError));
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="auth-page auth-register-page"><div className="register-layout">
    <aside className="register-intro">
      <Link className="auth-brand auth-brand-light" to="/"><span aria-hidden="true">🎁</span><strong>Hediye<span>AlSat</span></strong></Link>
      <div><p className="register-eyebrow">Hediye dünyasına katılın</p><h1>Güvenli alışveriş, güvenli satış.</h1><ul><li>✓ Güvenli ödeme</li><li>✓ Hediye odaklı pazaryeri</li><li>✓ Alıcı ve satıcı için kolay kullanım</li></ul></div>
    </aside>
    <section className="auth-card register-card" aria-labelledby="register-title">
      <header className="auth-heading"><h2 id="register-title">Üye Ol</h2><p>Birkaç saniyede ücretsiz hesabınızı oluşturun.</p></header>
      <form className="auth-form" onSubmit={handleRegister} noValidate>
        <label>Ad Soyad<input type="text" autoComplete="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Adınız ve soyadınız" /></label>
        <label>E-posta<input type="email" autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="ornek@email.com" /></label>
        <label>Şifre<span className="auth-password-field"><input type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={6} value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="En az 6 karakter" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Gizle" : "Göster"}</button></span></label>
        <label>Şifre Tekrar<input type="password" autoComplete="new-password" minLength={6} value={form.passwordAgain} onChange={(event) => updateField("passwordAgain", event.target.value)} placeholder="Şifrenizi tekrar girin" /></label>
        {error && <p className="auth-message error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "Hesabınız oluşturuluyor..." : "Üye Ol"}</button>
      </form>
      <p className="auth-legal">Üye olarak <Link to="/mesafeli-satis">Kullanım Koşulları</Link> ve <Link to="/gizlilik">Gizlilik Politikası</Link>’nı kabul etmiş olursunuz.</p>
      <p className="auth-switch">Zaten hesabınız var mı? <Link to="/login">Giriş Yap</Link></p>
    </section>
  </div></main>;
}

export default Register;
