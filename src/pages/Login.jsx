import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { firebaseAuthErrorMessage } from "../utils/auth";
import "../styles/pages/login.css";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  async function handleLogin(event) {
    event.preventDefault();
    if (submitting) return;
    if (!email.trim() || !password) {
      setMessage({ type: "error", text: "E-posta ve şifrenizi girin." });
      return;
    }
    setSubmitting(true);
    setMessage({ type: "", text: "" });
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate("/", { replace: true });
    } catch (error) {
      setMessage({ type: "error", text: firebaseAuthErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setMessage({ type: "error", text: "Şifre sıfırlamak için e-posta adresinizi girin." });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage({ type: "success", text: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi." });
    } catch (error) {
      setMessage({ type: "error", text: firebaseAuthErrorMessage(error) });
    }
  }

  return <main className="auth-page auth-login-page">
    <section className="auth-card" aria-labelledby="login-title">
      <Link className="auth-brand" to="/" aria-label="HediyeAlSat ana sayfa"><span aria-hidden="true">🎁</span><strong>Hediye<span>AlSat</span></strong></Link>
      <header className="auth-heading"><h1 id="login-title">Tekrar hoş geldiniz</h1><p>Hesabınıza güvenle giriş yapın.</p></header>
      <form className="auth-form" onSubmit={handleLogin} noValidate>
        <label>E-posta<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ornek@email.com" /></label>
        <label>Şifre<span className="auth-password-field"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Şifreniz" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Gizle" : "Göster"}</button></span></label>
        <div className="auth-options"><label className="auth-checkbox"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />Beni Hatırla</label><button className="auth-text-button" type="button" onClick={resetPassword}>Şifremi Unuttum</button></div>
        {message.text && <p className={`auth-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</p>}
        <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "Giriş yapılıyor..." : "Giriş Yap"}</button>
      </form>
      <p className="auth-switch">Henüz hesabınız yok mu? <Link to="/uye-ol">Üye Ol</Link></p>
    </section>
  </main>;
}

export default Login;
