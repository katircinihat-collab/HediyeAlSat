import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { buildConversations, filterConversations, isIncomingMessage, isOwnMessage, messagePreview, messageTimeValue } from "../utils/messages";
import "../styles/pages/messages.css";

function toDate(value) {
  if (!value) return null;
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function listTime(value) {
  const date = toDate(value);
  if (!date) return "";
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
}

function messageTime(value) {
  const date = toDate(value);
  return date ? date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "";
}

function safeInitial(value) {
  return String(value || "H").trim().slice(0, 1).toLocaleUpperCase("tr-TR");
}

function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const chatPanelRef = useRef(null);
  const shouldStickToBottom = useRef(true);
  const [user, setUser] = useState(undefined);
  const [messages, setMessages] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState("");
  const [sendError, setSendError] = useState("");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => setUser(currentUser)), []);
  const currentUid = user?.uid || "";
  const currentEmail = user?.email || "";

  useEffect(() => {
    if (user === undefined) return undefined;
    if (!currentUid || !currentEmail) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setQueryError("");
    const buckets = [[], [], [], []];
    const loaded = [false, false, false, false];
    const definitions = [
      ["gonderen", currentEmail], ["alan", currentEmail],
      ["gonderenUid", currentUid], ["alanUid", currentUid]
    ];

    const merge = () => {
      const unique = new Map(buckets.flat().map((message) => [message.id, message]));
      setMessages([...unique.values()].sort((a, b) => messageTimeValue(b.tarih) - messageTimeValue(a.tarih)));
      if (loaded.every(Boolean)) setLoading(false);
    };
    const fail = () => {
      setQueryError("Mesajlarınız şu anda yüklenemiyor. Lütfen biraz sonra tekrar deneyin.");
      setLoading(false);
    };

    const unsubscribers = definitions.map(([field, value], index) => onSnapshot(
      query(collection(db, "mesajlar"), where(field, "==", value), orderBy("tarih", "desc")),
      (snapshot) => {
        buckets[index] = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        loaded[index] = true;
        merge();
      },
      fail
    ));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [currentEmail, currentUid, user]);

  const conversations = useMemo(() => buildConversations(messages, currentUid, currentEmail), [messages, currentUid, currentEmail]);
  const visibleConversations = useMemo(() => filterConversations(conversations, search, unreadOnly), [conversations, search, unreadOnly]);
  const selected = useMemo(() => conversations.find((conversation) => conversation.key === selectedKey) || null, [conversations, selectedKey]);
  const totalUnread = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

  useEffect(() => {
    if (selectedKey && !selected && !loading) setSelectedKey("");
  }, [loading, selected, selectedKey]);

  useLayoutEffect(() => {
    if (!selected || !chatPanelRef.current || !shouldStickToBottom.current) return;
    chatPanelRef.current.scrollTo({ top: chatPanelRef.current.scrollHeight, behavior: "auto" });
    shouldStickToBottom.current = true;
  }, [selected, selected?.messages.length]);

  function goBack() {
    if (location.key === "default") navigate("/"); else navigate(-1);
  }

  async function openConversation(conversation) {
    shouldStickToBottom.current = true;
    setSelectedKey(conversation.key);
    setSendError("");
    const unread = conversation.messages.filter((message) => isIncomingMessage(message, currentUid, currentEmail) && message.okundu !== true);
    await Promise.allSettled(unread.map((message) => updateDoc(doc(db, "mesajlar", message.id), { okundu: true })));
  }

  function closeConversation() {
    setSelectedKey("");
    setSendError("");
  }

  function trackChatScroll(event) {
    const element = event.currentTarget;
    shouldStickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!selected || !user || !text || sending) return;
    setSending(true);
    setSendError("");
    shouldStickToBottom.current = true;
    try {
      await addDoc(collection(db, "mesajlar"), {
        ...(selected.uidBased
          ? { gonderenUid: currentUid, alanUid: selected.counterpart }
          : { gonderen: currentEmail, alan: selected.counterpart }),
        ilanId: selected.ilanId,
        ilanBaslik: selected.ilanBaslik,
        mesaj: text,
        okundu: false,
        tarih: serverTimestamp()
      });
      setDraft("");
    } catch {
      setSendError("Mesaj gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setSending(false);
    }
  }

  function handleComposerKey(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  if (user === undefined || loading) return <main className="messages-shell"><div className="messages-skeleton" aria-live="polite"><span /><span /><span /><p>Mesajlarınız yükleniyor...</p></div></main>;
  if (!user) return <main className="messages-shell messages-guest"><button type="button" className="messages-page-back" onClick={goBack}>← Geri</button><section><span aria-hidden="true">💬</span><h1>Mesajlarınıza erişin</h1><p>Satıcılarla ve alıcılarla HediyeAlSat üzerinden güvenle iletişim kurun.</p><Link to="/login">Giriş Yap</Link></section></main>;

  return <main className={`messages-shell ${selected ? "conversation-open" : ""}`}>
    <aside className="messages-inbox" aria-label="Konuşmalar">
      <header className="messages-inbox-header"><div><button type="button" onClick={goBack} aria-label="Önceki sayfaya dön">←</button><div><small>HESABIM</small><h1>Mesajlar</h1></div></div><span aria-label={`${totalUnread} okunmamış mesaj`}>{totalUnread || conversations.length}</span></header>
      <div className="messages-tools">
        <label><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Konuşmalarda ara" aria-label="Konuşmalarda ara" /></label>
        <div role="group" aria-label="Konuşma filtresi"><button type="button" className={!unreadOnly ? "active" : ""} onClick={() => setUnreadOnly(false)}>Tümü</button><button type="button" className={unreadOnly ? "active" : ""} onClick={() => setUnreadOnly(true)}>Okunmamış {totalUnread > 0 && <span>{totalUnread}</span>}</button></div>
      </div>
      {queryError ? <div className="messages-list-state error" role="alert"><span>!</span><h2>Mesajlar yüklenemedi</h2><p>{queryError}</p></div> : visibleConversations.length === 0 ? <div className="messages-list-state"><span aria-hidden="true">{conversations.length ? "⌕" : "💬"}</span><h2>{conversations.length ? "Sonuç bulunamadı" : "Henüz konuşmanız yok"}</h2><p>{conversations.length ? "Aramanızı veya filtrenizi değiştirin." : "Bir ürün hakkında soru sorduğunuzda konuşmanız burada görünür."}</p></div> : <div className="conversation-list">
        {visibleConversations.map((conversation) => <button type="button" key={conversation.key} className={selectedKey === conversation.key ? "conversation-item active" : "conversation-item"} onClick={() => openConversation(conversation)} aria-current={selectedKey === conversation.key ? "true" : undefined}>
          <span className="conversation-avatar" aria-hidden="true">{safeInitial(conversation.ilanBaslik)}</span>
          <span className="conversation-summary"><span><strong>HediyeAlSat kullanıcısı</strong><time>{listTime(conversation.lastMessage?.tarih)}</time></span><b>{conversation.ilanBaslik}</b><span className="conversation-preview">{messagePreview(conversation.lastMessage, currentUid, currentEmail)}</span></span>
          {conversation.unreadCount > 0 && <span className="conversation-unread" aria-label={`${conversation.unreadCount} okunmamış mesaj`}>{conversation.unreadCount}</span>}
        </button>)}
      </div>}
    </aside>

    <section className="messages-chat" aria-label="Aktif konuşma">
      {!selected ? <div className="messages-chat-empty"><span aria-hidden="true">✉️</span><h2>Mesaj merkeziniz</h2><p>Konuşmalarınızı görüntülemek için soldan bir sohbet seçin.</p><div><span>🔒 Güvenli iletişim</span><span>📦 Ürün bazlı sohbet</span></div></div> : <>
        <header className="messages-chat-header"><button type="button" className="mobile-conversation-back" onClick={closeConversation} aria-label="Konuşma listesine dön">←</button><span className="chat-person-avatar" aria-hidden="true">{safeInitial(selected.ilanBaslik)}</span><div><strong>HediyeAlSat kullanıcısı</strong><span>{selected.ilanBaslik}</span></div>{selected.ilanId && <Link to={`/ilan/${selected.ilanId}`}>İlanı Gör <span aria-hidden="true">→</span></Link>}</header>
        <div className="messages-thread" ref={chatPanelRef} onScroll={trackChatScroll}>
          {selected.messages.length === 0 ? <div className="thread-empty">Bu konuşmada henüz mesaj yok.</div> : selected.messages.map((message) => {
            const mine = isOwnMessage(message, currentUid, currentEmail);
            return <article key={message.id} className={mine ? "thread-message mine" : "thread-message received"}><div><p>{message.mesaj}</p><footer><time>{messageTime(message.tarih)}</time>{mine && <span aria-label={message.okundu ? "Okundu" : "Gönderildi"}>{message.okundu ? "✓✓" : "✓"}</span>}</footer></div></article>;
          })}
        </div>
        <div className="message-composer"><label htmlFor="message-draft" className="sr-only">Mesajınız</label><textarea id="message-draft" value={draft} onChange={(event) => { setDraft(event.target.value.slice(0, 5000)); setSendError(""); }} onKeyDown={handleComposerKey} placeholder="Mesajınızı yazın…" rows={1} maxLength={5000} /><button type="button" onClick={sendMessage} disabled={sending || !draft.trim()} aria-label="Mesajı gönder">{sending ? "Gönderiliyor…" : "Gönder"}<span aria-hidden="true">➤</span></button>{sendError && <p role="alert">{sendError}</p>}<small>Enter ile gönder · Shift+Enter ile satır atla</small></div>
      </>}
    </section>
  </main>;
}

export default Messages;
