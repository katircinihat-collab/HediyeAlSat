import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, sendEmailVerification, signOut, updatePassword, updateProfile } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { auth, db } from "../firebase";
import { firebaseAuthErrorMessage } from "../utils/auth";
import { getAccountDisplayName, isPasswordAccount, validatePasswordChange } from "../utils/settings";
import "../styles/pages/settings.css";

const emptyPasswordForm = { currentPassword: "", newPassword: "", confirmation: "" };

function initials(name, email) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length) return parts.slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("tr-TR");
  return String(email || "H").slice(0, 1).toLocaleUpperCase("tr-TR");
}

function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savedName, setSavedName] = useState("");
  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [store, setStore] = useState(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const nameChanged = useMemo(() => name.trim() !== savedName, [name, savedName]);
  const passwordAccount = isPasswordAccount(user);

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    setUser(currentUser);
    setLoading(true);
    setLoadError("");
    try {
      const [profileResult, userResult, uidStores] = await Promise.all([
        getDoc(doc(db, "profiller", currentUser.uid)),
        getDoc(doc(db, "users", currentUser.uid)),
        getDocs(query(collection(db, "magazalar"), where("sahipUid", "==", currentUser.uid), limit(1)))
      ]);
      const profile = profileResult.exists() ? profileResult.data() : {};
      const userDocument = userResult.exists() ? userResult.data() : {};
      const displayName = getAccountDisplayName({ profile, userDocument, authUser: currentUser });
      setName(displayName);
      setSavedName(displayName);
      setPhotoURL(currentUser.photoURL || userDocument.photoURL || "");

      if (!uidStores.empty) {
        setStore({ id: uidStores.docs[0].id, ...uidStores.docs[0].data() });
      } else if (currentUser.email) {
        const legacyStores = await getDocs(query(collection(db, "magazalar"), where("sahip", "==", currentUser.email), limit(1)));
        setStore(legacyStores.empty ? null : { id: legacyStores.docs[0].id, ...legacyStores.docs[0].data() });
      }
    } catch {
      setLoadError("Hesap bilgileriniz yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }), [navigate]);

  function showMessage(type, text) { setMessage({ type, text }); }

  async function saveAccount(event) {
    event.preventDefault();
    const currentUser = auth.currentUser;
    const normalizedName = name.trim();
    if (!currentUser || savingAccount || !nameChanged) return;
    if (normalizedName.length < 2) {
      showMessage("error", "Ad Soyad en az 2 karakter olmalıdır.");
      return;
    }

    setSavingAccount(true);
    setMessage({ type: "", text: "" });
    try {
      await updateProfile(currentUser, { displayName: normalizedName });
      await setDoc(doc(db, "profiller", currentUser.uid), { ad: normalizedName }, { merge: true });
      setName(normalizedName);
      setSavedName(normalizedName);
      showMessage("success", "Hesap bilgileriniz kaydedildi.");
    } catch (error) {
      showMessage("error", firebaseAuthErrorMessage(error));
    } finally {
      setSavingAccount(false);
    }
  }

  async function sendVerification() {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.emailVerified || sendingVerification) return;
    setSendingVerification(true);
    setMessage({ type: "", text: "" });
    try {
      await sendEmailVerification(currentUser);
      showMessage("success", "Doğrulama e-postası gönderildi. Gelen kutunuzu kontrol edin.");
    } catch (error) {
      showMessage("error", firebaseAuthErrorMessage(error));
    } finally {
      setSendingVerification(false);
    }
  }

  function changePasswordField(field, value) {
    setMessage({ type: "", text: "" });
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  async function savePassword(event) {
    event.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email || savingPassword) return;
    const validationError = validatePasswordChange(passwordForm);
    if (validationError) {
      showMessage("error", validationError);
      return;
    }

    setSavingPassword(true);
    setMessage({ type: "", text: "" });
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passwordForm.newPassword);
      setPasswordForm(emptyPasswordForm);
      showMessage("success", "Şifreniz güvenle güncellendi.");
    } catch (error) {
      showMessage("error", firebaseAuthErrorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      showMessage("error", firebaseAuthErrorMessage(error));
      setLoggingOut(false);
    }
  }

  return <>
    <Navbar />
    <main className="settings-page">
      <header className="settings-hero">
        <div><span className="settings-eyebrow">Hesap merkezi</span><h1>Ayarlar</h1><p>Hesabınızı ve güvenlik tercihlerinizi tek yerden yönetin.</p></div>
        {!loading && user && <div className="settings-user-summary">
          {photoURL ? <img src={photoURL} alt="Profil fotoğrafı" referrerPolicy="no-referrer" onError={() => setPhotoURL("")} /> : <span aria-hidden="true">{initials(name, user.email)}</span>}
          <div><strong>{name || "HediyeAlSat Üyesi"}</strong><small>{user.email}</small></div>
        </div>}
      </header>

      {loading ? <section className="settings-state" aria-live="polite">Ayarlarınız yükleniyor...</section> : loadError ? <section className="settings-state settings-error" role="alert">{loadError}</section> : <div className="settings-layout">
        <nav className="settings-nav" aria-label="Ayar bölümleri">
          <a href="#hesap">Hesap Bilgileri</a><a href="#guvenlik">Şifre ve Güvenlik</a><a href="#teslimat">Teslimat Bilgileri</a>{store && <a href="#satici">Satıcı Bilgileri</a>}<a href="#gizlilik">Gizlilik ve Hesap</a>
        </nav>
        <div className="settings-content">
          {message.text && <p className={`settings-message ${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</p>}

          <section className="settings-card" id="hesap">
            <header><span aria-hidden="true">👤</span><div><h2>Hesap Bilgileri</h2><p>Temel hesap bilgilerinizi görüntüleyin ve adınızı güncelleyin.</p></div></header>
            <form onSubmit={saveAccount}>
              <div className="settings-field-row">
                <label>Ad Soyad<input value={name} onChange={(event) => { setName(event.target.value); setMessage({ type: "", text: "" }); }} autoComplete="name" maxLength={80} /></label>
                <label>E-posta<input type="email" value={user?.email || ""} readOnly aria-describedby="settings-email-note" /></label>
              </div>
              <div className="settings-verification" id="settings-email-note">
                <div><strong>{user?.emailVerified ? "E-posta doğrulandı" : "E-posta doğrulanmadı"}</strong><small>{user?.emailVerified ? "Hesabınızın e-posta adresi doğrulanmış." : "Hesap güvenliği için e-posta adresinizi doğrulayın."}</small></div>
                {!user?.emailVerified && <button type="button" className="settings-secondary-button" onClick={sendVerification} disabled={sendingVerification}>{sendingVerification ? "Gönderiliyor..." : "Doğrulama e-postası gönder"}</button>}
              </div>
              <button className="settings-primary-button" disabled={savingAccount || !nameChanged}>{savingAccount ? "Kaydediliyor..." : nameChanged ? "Değişiklikleri Kaydet" : "Değişiklik Yok"}</button>
            </form>
          </section>

          <section className="settings-card" id="guvenlik">
            <header><span aria-hidden="true">🔐</span><div><h2>Şifre ve Güvenlik</h2><p>Şifrenizi güvenli biçimde güncelleyin.</p></div></header>
            {passwordAccount ? <form onSubmit={savePassword}>
              <label>Mevcut Şifre<input type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => changePasswordField("currentPassword", event.target.value)} /></label>
              <div className="settings-field-row">
                <label>Yeni Şifre<input type="password" autoComplete="new-password" minLength={6} value={passwordForm.newPassword} onChange={(event) => changePasswordField("newPassword", event.target.value)} /></label>
                <label>Yeni Şifre Tekrar<input type="password" autoComplete="new-password" minLength={6} value={passwordForm.confirmation} onChange={(event) => changePasswordField("confirmation", event.target.value)} /></label>
              </div>
              <small className="settings-hint">Yeni şifreniz en az 6 karakter olmalıdır.</small>
              <button className="settings-primary-button" disabled={savingPassword}>{savingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}</button>
            </form> : <p className="settings-provider-note">Şifreniz, giriş yaptığınız hesap sağlayıcısı üzerinden yönetiliyor.</p>}
          </section>

          <section className="settings-card" id="teslimat">
            <header><span aria-hidden="true">📍</span><div><h2>Adres ve Teslimat Bilgileri</h2><p>Konum ve telefon bilgileriniz isteğe bağlıdır; yalnız ihtiyaç duyduğunuzda profilinizden yönetebilirsiniz.</p></div></header>
            <Link to="/profil#konum" className="settings-arrow-link">Profil bilgilerini düzenle <span aria-hidden="true">→</span></Link>
          </section>

          {store && <section className="settings-card" id="satici">
            <header><span aria-hidden="true">🏪</span><div><h2>Satıcı Bilgileri</h2><p>Mağaza ve finans işlemlerinizi güvenli satıcı alanından yönetin.</p></div></header>
            <div className="settings-store-row"><div><small>Mağazanız</small><strong>{store.magazaAdi || store.adi || "Mağazam"}</strong></div><span>Aktif satıcı hesabı</span></div>
            <div className="settings-actions"><Link to="/magazam" className="settings-secondary-button">Mağazayı Yönet</Link><Link to="/seller" className="settings-primary-link">Satıcı Paneline Git</Link></div>
          </section>}

          <section className="settings-card" id="gizlilik">
            <header><span aria-hidden="true">🛡️</span><div><h2>Gizlilik ve Hesap</h2><p>Hesap kullanımınızla ilgili sözleşme ve politikaları inceleyin.</p></div></header>
            <div className="settings-legal-links">
              <Link to="/gizlilik">Gizlilik Politikası <span>→</span></Link><Link to="/mesafeli-satis">Kullanım Koşulları ve Mesafeli Satış <span>→</span></Link><Link to="/teslimat-iade">Teslimat ve İade <span>→</span></Link>
            </div>
            <div className="settings-logout-row"><div><strong>Bu cihazdaki oturumu kapat</strong><small>Hesabınıza yeniden giriş yapmanız gerekir.</small></div><button type="button" onClick={logout} className="settings-logout-button" disabled={loggingOut}>{loggingOut ? "Çıkış yapılıyor..." : "Çıkış Yap"}</button></div>
          </section>
        </div>
      </div>}
    </main>
    <Footer />
  </>;
}

export default Settings;
