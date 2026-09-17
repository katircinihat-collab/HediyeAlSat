import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../../firebase";
import "../../styles/components/public-chat.css";

const MAX_MESSAGE_LENGTH = 500;

function PublicChat() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setMessages([]);
      setError("");
      setUser(currentUser);
    });
  }, []);

  useEffect(() => {
    if (!open || !user) {
      return undefined;
    }

    const chatQuery = query(
      collection(db, "publicChatMessages"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      chatQuery,
      (snapshot) => {
        const nextMessages = snapshot.docs
          .map((messageDoc) => ({
            id: messageDoc.id,
            ...messageDoc.data()
          }))
          .reverse();

        setMessages(nextMessages);
        setError("");
      },
      (snapshotError) => {
        console.error("Canlı sohbet yüklenemedi:", snapshotError);
        setError("Sohbet şu anda yüklenemiyor.");
      }
    );

    return unsubscribe;
  }, [open, user]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMessage = async (event) => {
    event.preventDefault();

    const message = text.trim();

    if (!user || !message || sending) {
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      setError(`Mesaj en fazla ${MAX_MESSAGE_LENGTH} karakter olabilir.`);
      return;
    }

    setSending(true);
    setError("");

    try {
      await addDoc(collection(db, "publicChatMessages"), {
        senderUid: user.uid,
        senderName:
          user.displayName?.trim() ||
          "HediyeAlSat Üyesi",
        message,
        createdAt: serverTimestamp()
      });

      setText("");
    } catch (sendError) {
      console.error("Canlı sohbet mesajı gönderilemedi:", sendError);
      setError(
        "Mesaj gönderilemedi. İletişim bilgisi paylaşmadığınızdan emin olun."
      );
    } finally {
      setSending(false);
    }
  };

  const formatTime = (createdAt) => {
    if (!createdAt?.toDate) {
      return "";
    }

    return createdAt.toDate().toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="public-chat">
      {open && (
        <section
          className="public-chat__panel"
          aria-label="HediyeAlSat Canlı Sohbet"
        >
          <header className="public-chat__header">
            <div>
              <strong>🎁 HediyeAlSat Canlı Sohbet</strong>
              <span>Toplulukla sohbet et</span>
            </div>

            <button
              type="button"
              className="public-chat__close"
              onClick={() => setOpen(false)}
              aria-label="Sohbeti kapat"
            >
              ×
            </button>
          </header>

          <div className="public-chat__messages">
            {messages.length === 0 && !error && (
              <div className="public-chat__empty">
                <span>👋</span>
                <strong>Sohbeti ilk sen başlat!</strong>
                <small>
                  Hediye fikirlerini paylaşabilir ve diğer üyelerle sohbet
                  edebilirsin.
                </small>
              </div>
            )}

            {messages.map((item) => {
              const ownMessage = item.senderUid === user?.uid;

              return (
                <div
                  key={item.id}
                  className={`public-chat__message ${
                    ownMessage ? "public-chat__message--own" : ""
                  }`}
                >
                  <div className="public-chat__message-meta">
                    <strong>
                      {ownMessage ? "Sen" : item.senderName || "Üye"}
                    </strong>

                    <time>{formatTime(item.createdAt)}</time>
                  </div>

                  <p>{item.message}</p>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="public-chat__error" role="alert">
              {error}
            </div>
          )}

          {user ? (
            <form
              className="public-chat__form"
              onSubmit={sendMessage}
            >
              <textarea
                value={text}
                onChange={(event) =>
                  setText(event.target.value.slice(0, MAX_MESSAGE_LENGTH))
                }
                placeholder="Bir şeyler yaz..."
                rows="1"
                maxLength={MAX_MESSAGE_LENGTH}
                aria-label="Sohbet mesajı"
              />

              <button
                type="submit"
                disabled={!text.trim() || sending}
                aria-label="Mesaj gönder"
              >
                {sending ? "…" : "➤"}
              </button>
            </form>
          ) : (
            <div className="public-chat__login">
              <strong>Sohbete katılmak ister misin?</strong>
              <span>Mesaj göndermek için giriş yapmalısın.</span>
            </div>
          )}

          <div className="public-chat__notice">
            Telefon, e-posta ve sosyal medya bilgilerini paylaşma.
          </div>
        </section>
      )}

      <button
        type="button"
        className={`public-chat__launcher ${
          open ? "public-chat__launcher--open" : ""
        }`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Canlı sohbeti aç"
      >
        <span aria-hidden="true">💬</span>
        <strong>Canlı Sohbet</strong>
      </button>
    </div>
  );
}

export default PublicChat;
