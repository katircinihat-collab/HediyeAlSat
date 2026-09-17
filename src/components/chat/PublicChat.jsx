import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import "../../styles/components/public-chat.css";

const MAX_MESSAGE_LENGTH = 500;
const MINIMIZED_STORAGE_KEY = "hediyeCepMinimized";

function savedMinimizedPreference() {
  try {
    return window.localStorage.getItem(MINIMIZED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function PublicChat() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(savedMinimizedPreference);
  const [screen, setScreen] = useState("home");
  const [user, setUser] = useState(auth.currentUser);
  const [messages, setMessages] = useState([]);
  const [previewMessages, setPreviewMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setMessages([]);
    setPreviewMessages([]);
    setError("");
    setUser(currentUser);
  }), []);

  useEffect(() => {
    if (open || minimized || !user) return undefined;
    const previewQuery = query(collection(db, "publicChatMessages"), orderBy("createdAt", "desc"), limit(3));
    return onSnapshot(previewQuery, (snapshot) => {
      setPreviewMessages(snapshot.docs.map((messageDoc) => ({ id: messageDoc.id, ...messageDoc.data() })).reverse());
    }, (snapshotError) => {
      console.error("Canlı sohbet önizlemesi yüklenemedi:", snapshotError);
      setPreviewMessages([]);
    });
  }, [minimized, open, user]);

  useEffect(() => {
    if (!open || screen !== "chat" || !user) return undefined;
    const chatQuery = query(collection(db, "publicChatMessages"), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(chatQuery, (snapshot) => {
      setMessages(snapshot.docs.map((messageDoc) => ({ id: messageDoc.id, ...messageDoc.data() })).reverse());
      setError("");
    }, (snapshotError) => {
      console.error("Canlı sohbet yüklenemedi:", snapshotError);
      setError("Sohbet şu anda yüklenemiyor.");
    });
  }, [open, screen, user]);

  useEffect(() => {
    if (open && screen === "chat") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, screen]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setScreen("home");
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const openChat = () => { setOpen(true); setScreen("chat"); };
  const closeHub = () => { setOpen(false); setScreen("home"); };
  const goTo = (path) => { closeHub(); navigate(path); };
  const setMinimizedPreference = (value) => {
    setMinimized(value);
    try {
      window.localStorage.setItem(MINIMIZED_STORAGE_KEY, String(value));
    } catch {
      // Depolama kapalıysa tercih yalnız bu oturumda korunur.
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const message = text.trim();
    if (!user || !message || sending) return;
    if (message.length > MAX_MESSAGE_LENGTH) {
      setError(`Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir.`);
      return;
    }
    setSending(true);
    setError("");
    try {
      await addDoc(collection(db, "publicChatMessages"), {
        senderUid: user.uid,
        senderName: user.displayName?.trim() || "HediyeAlSat Üyesi",
        message,
        createdAt: serverTimestamp()
      });
      setText("");
    } catch (sendError) {
      console.error("Canlı sohbet mesajı gönderilemedi:", sendError);
      setError("Mesaj gönderilemedi. İletişim bilgisi paylaşmadığınızdan emin olun.");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (createdAt) => createdAt?.toDate
    ? createdAt.toDate().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return <div className="public-chat hediye-cep">
    {open ? <section className="public-chat__panel" aria-label="HediyeCep">
      <header className="public-chat__header"><div><strong>🎁 HediyeCep</strong><span>Keşfet • Katıl • Eğlen</span></div><button type="button" className="public-chat__close" onClick={closeHub} aria-label="HediyeCep'i kapat">×</button></header>
      {screen === "home" ? <div className="hediye-cep__home">
        <div className="hediye-cep__welcome"><span aria-hidden="true">📱</span><div><strong>Bugün ne yapmak istersin?</strong><small>Hediye dünyasına tek yerden katıl.</small></div></div>
        <div className="hediye-cep__apps" aria-label="HediyeCep uygulamaları">
          <button type="button" onClick={openChat}><span>💬</span><strong>Canlı Sohbet</strong><small>Toplulukla konuş</small></button>
          <button type="button" onClick={() => goTo("/#hediye-kapismasi")}><span>⚔️</span><strong>Hediye Kapışması</strong><small>Bugünün seçimini yap</small></button>
          <button type="button" onClick={() => goTo("/a4-tasarimlar")}><span>🎨</span><strong>A4 Tasarım</strong><small>Tasarımları keşfet</small></button>
          <button type="button" onClick={() => goTo("/hediye-fikirleri")}><span>💡</span><strong>Hediye Fikirleri</strong><small>İlhamını bul</small></button>
        </div>
      </div> : <>
        <button type="button" className="hediye-cep__back" onClick={() => setScreen("home")}>← HediyeCep</button>
        <div className="public-chat__messages">
          {messages.length === 0 && !error && <div className="public-chat__empty"><span>👋</span><strong>Sohbeti ilk sen başlat!</strong><small>Hediye fikirlerini paylaşabilir ve diğer üyelerle sohbet edebilirsin.</small></div>}
          {messages.map((item) => {
            const ownMessage = item.senderUid === user?.uid;
            return <div key={item.id} className={`public-chat__message ${ownMessage ? "public-chat__message--own" : ""}`}><div className="public-chat__message-meta"><strong>{ownMessage ? "Sen" : item.senderName || "Üye"}</strong><time>{formatTime(item.createdAt)}</time></div><p>{item.message}</p></div>;
          })}
          <div ref={bottomRef} />
        </div>
        {error && <div className="public-chat__error" role="alert">{error}</div>}
        {user ? <form className="public-chat__form" onSubmit={sendMessage}><textarea value={text} onChange={(event) => setText(event.target.value.slice(0, MAX_MESSAGE_LENGTH))} placeholder="Bir şeyler yaz..." rows="1" maxLength={MAX_MESSAGE_LENGTH} aria-label="Sohbet mesajı" /><button type="submit" disabled={!text.trim() || sending} aria-label="Mesaj gönder">{sending ? "…" : "➤"}</button></form> : <div className="public-chat__login"><strong>Sohbete katılmak ister misin?</strong><span>Mesajları görmek ve yazmak için giriş yapmalısın.</span><button type="button" onClick={() => goTo("/login")}>Giriş Yap</button></div>}
        <div className="public-chat__notice">Telefon, e-posta ve sosyal medya bilgilerini paylaşma.</div>
      </>}
    </section> : minimized ? <button type="button" className="hediye-cep__capsule" onClick={() => setMinimizedPreference(false)} aria-label="HediyeCep'i büyüt"><span aria-hidden="true">🟢</span><strong>HediyeCep</strong><span aria-hidden="true">💬</span></button> : <aside className="hediye-cep__live" aria-label="HediyeCep canlılık vitrini">
      <div className="hediye-cep__live-top"><button type="button" className="hediye-cep__live-heading" onClick={() => setOpen(true)} aria-expanded={open} aria-label="HediyeCep'i aç"><span aria-hidden="true">🟢</span><strong>HediyeAlSat Canlı</strong><b>📱 HediyeCep</b></button><button type="button" className="hediye-cep__minimize" onClick={() => setMinimizedPreference(true)} aria-label="HediyeCep'i küçült">−</button></div>
      {user && previewMessages.length > 0 ? <div className="hediye-cep__preview">{previewMessages.map((item) => <p key={item.id}><strong>{item.senderUid === user.uid ? "Sen" : item.senderName || "Üye"}:</strong> {item.message}</p>)}</div> : <p className="hediye-cep__guest-copy">Topluluğa katıl, hediyeler hakkında sohbet et.</p>}
      <div className="hediye-cep__live-actions"><button type="button" onClick={openChat}>💬 Sohbete Katıl</button><button type="button" onClick={() => setOpen(true)}>📱 Aç</button></div>
    </aside>}
  </div>;
}

export default PublicChat;
