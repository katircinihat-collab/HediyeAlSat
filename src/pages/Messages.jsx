import { useEffect, useMemo, useState } from "react";

import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  doc,
  updateDoc
} from "firebase/firestore";

import { db, auth } from "../firebase";

import "../styles/pages/messages.css";

function Messages() {

  const [mesajlar, setMesajlar] = useState([]);
  const [secili, setSecili] = useState(null);
  const [yeniMesaj, setYeniMesaj] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const currentEmail = auth.currentUser?.email;

  useEffect(() => {

    if (!currentEmail) return;

    const q = query(
      collection(db, "mesajlar"),
      orderBy("tarih", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {

      const liste = snap.docs
        .map((item) => ({
          id: item.id,
          ...item.data()
        }))
        .filter(
          (m) =>
            m.gonderen === currentEmail ||
            m.alan === currentEmail
        );

      setMesajlar(liste);

    });

    return () => unsub();

  }, [currentEmail]);


  /*
  ==========================================
  SOHBETLERİ GRUPLA
  ==========================================
  */

  const sohbetler = useMemo(() => {

    const gruplar = {};

    mesajlar.forEach((m) => {

      const digerKisi =
        m.gonderen === currentEmail
          ? m.alan
          : m.gonderen;

      const anahtar =
        `${m.ilanId || "genel"}_${digerKisi}`;

      if (!gruplar[anahtar]) {

        gruplar[anahtar] = {
          key: anahtar,
          ilanId: m.ilanId || "",
          ilanBaslik:
            m.ilanBaslik || "Genel Sohbet",
          digerKisi,
          mesajlar: []
        };

      }

      gruplar[anahtar].mesajlar.push(m);

    });

    return Object.values(gruplar)
      .map((sohbet) => {

        const sirali = [...sohbet.mesajlar].sort(
          (a, b) => {

            const ta =
              a.tarih?.seconds || 0;

            const tb =
              b.tarih?.seconds || 0;

            return tb - ta;

          }
        );

        const sonMesaj = sirali[0];

        const okunmamis = sohbet.mesajlar.filter(
          (m) =>
            m.alan === currentEmail &&
            m.okundu !== true
        ).length;

        return {
          ...sohbet,
          sonMesaj,
          okunmamis
        };

      })
      .sort((a, b) => {

        const ta =
          a.sonMesaj?.tarih?.seconds || 0;

        const tb =
          b.sonMesaj?.tarih?.seconds || 0;

        return tb - ta;

      });

  }, [mesajlar, currentEmail]);


  /*
  ==========================================
  SOHBETİ AÇ
  ==========================================
  */

  async function sohbetAc(sohbet) {

    setSecili(sohbet);

    const okunmamisMesajlar =
      sohbet.mesajlar.filter(
        (m) =>
          m.alan === currentEmail &&
          m.okundu !== true
      );

    for (const mesaj of okunmamisMesajlar) {

      try {

        await updateDoc(
          doc(db, "mesajlar", mesaj.id),
          {
            okundu: true
          }
        );

      } catch (error) {

        console.log(
          "Okundu güncellenemedi:",
          error
        );

      }

    }

  }


  /*
  ==========================================
  MESAJ GÖNDER
  ==========================================
  */

  async function mesajGonder() {

    if (!currentEmail) {

      alert("Önce giriş yapmalısınız.");

      return;

    }

    if (!secili) return;

    if (!yeniMesaj.trim()) return;

    if (gonderiliyor) return;

    setGonderiliyor(true);

    const alan =
      secili.digerKisi;

    try {

      await addDoc(
        collection(db, "mesajlar"),
        {
          gonderen: currentEmail,
          alan: alan,
          ilanId: secili.ilanId,
          ilanBaslik: secili.ilanBaslik,
          mesaj: yeniMesaj.trim(),
          okundu: false,
          tarih: serverTimestamp()
        }
      );

      setYeniMesaj("");

    } catch (error) {

      console.error(
        "Mesaj gönderilemedi:",
        error
      );

      alert(
        "Mesaj gönderilirken bir hata oluştu."
      );

    } finally {

      setGonderiliyor(false);

    }

  }


  /*
  ==========================================
  ENTER İLE GÖNDER
  ==========================================
  */

  function klavyeGonder(e) {

    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {

      e.preventDefault();

      mesajGonder();

    }

  }


  /*
  ==========================================
  TARİH
  ==========================================
  */

  function tarihGoster(tarih) {

    if (!tarih) return "";

    try {

      const date = tarih.toDate
        ? tarih.toDate()
        : new Date(tarih);

      return date.toLocaleDateString(
        "tr-TR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }
      );

    } catch {

      return "";

    }

  }


  function saatGoster(tarih) {

    if (!tarih) return "";

    try {

      const date = tarih.toDate
        ? tarih.toDate()
        : new Date(tarih);

      return date.toLocaleTimeString(
        "tr-TR",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

    } catch {

      return "";

    }

  }


  /*
  ==========================================
  GİRİŞ KONTROLÜ
  ==========================================
  */

  if (!currentEmail) {

    return (

      <div className="messages-login">

        <div className="messages-login-card">

          <div className="messages-login-icon">
            💬
          </div>

          <h2>
            Mesajlarınızı görmek için
            giriş yapın
          </h2>

          <p>
            Satıcılarla ve alıcılarla
            güvenli şekilde iletişim kurun.
          </p>

        </div>

      </div>

    );

  }


  return (

    <div className="messages-page">

      {/* SOL PANEL */}

      <aside className="messages-sidebar">

        <div className="messages-sidebar-header">

          <div>

            <span className="messages-label">
              HEDİYE ALSAT
            </span>

            <h1>
              💬 Mesajlar
            </h1>

          </div>

          <div className="message-count">

            {sohbetler.length}

          </div>

        </div>


        <div className="messages-user">

          <div className="profile-circle">
            👤
          </div>

          <div>

            <strong>
              Sohbetlerim
            </strong>

            <span>
              {currentEmail}
            </span>

          </div>

        </div>


        <div className="chat-list">

          {sohbetler.length === 0 ? (

            <div className="no-chat">

              <div className="no-chat-icon">
                💬
              </div>

              <h3>
                Henüz mesaj yok
              </h3>

              <p>
                Bir ürün hakkında
                iletişim kurduğunuzda
                sohbetiniz burada görünecek.
              </p>

            </div>

          ) : (

            sohbetler.map((sohbet) => (

              <button
                key={sohbet.key}
                className={
                  secili?.key === sohbet.key
                    ? "chat-item active"
                    : "chat-item"
                }
                onClick={() =>
                  sohbetAc(sohbet)
                }
              >

                <div className="chat-avatar">
                  🏪
                </div>

                <div className="chat-info">

                  <div className="chat-top">

                    <h3>
                      {sohbet.ilanBaslik}
                    </h3>

                    {sohbet.okunmamis > 0 && (

                      <span className="unread-badge">
                        {sohbet.okunmamis}
                      </span>

                    )}

                  </div>

                  <strong>
                    {sohbet.digerKisi}
                  </strong>

                  <p>

                    {sohbet.sonMesaj?.gonderen ===
                    currentEmail
                      ? "Siz: "
                      : ""}

                    {sohbet.sonMesaj?.mesaj ||
                      "Mesaj"}

                  </p>

                  <small>

                    {tarihGoster(
                      sohbet.sonMesaj?.tarih
                    )}

                  </small>

                </div>

              </button>

            ))

          )}

        </div>

      </aside>


      {/* SAĞ PANEL */}

      <main className="messages-content">

        {!secili ? (

          <div className="chat-empty">

            <div className="empty-chat-icon">
              💌
            </div>

            <h2>
              Mesajlarınız
            </h2>

            <p>
              Soldan bir sohbet seçerek
              konuşmaya başlayabilirsiniz.
            </p>

            <div className="empty-features">

              <span>
                🔒 Güvenli iletişim
              </span>

              <span>
                📦 Ürün bazlı sohbet
              </span>

              <span>
                ⚡ Anlık mesajlaşma
              </span>

            </div>

          </div>

        ) : (

          <>

            {/* CHAT HEADER */}

            <header className="chat-header">

              <div className="chat-header-user">

                <div className="chat-header-avatar">
                  🏪
                </div>

                <div>

                  <h2>
                    {secili.ilanBaslik}
                  </h2>

                  <p>
                    {secili.digerKisi}
                  </p>

                </div>

              </div>

              <div className="chat-status">
                ● Aktif sohbet
              </div>

            </header>


            {/* MESAJLAR */}

            <div className="chat-messages">

              {[...secili.mesajlar]

                .sort((a, b) => {

                  const ta =
                    a.tarih?.seconds || 0;

                  const tb =
                    b.tarih?.seconds || 0;

                  return ta - tb;

                })

                .map((m) => {

                  const benim =
                    m.gonderen === currentEmail;

                  return (

                    <div
                      key={m.id}
                      className={
                        benim
                          ? "message-row mine"
                          : "message-row theirs"
                      }
                    >

                      <div
                        className={
                          benim
                            ? "message-bubble mine-bubble"
                            : "message-bubble"
                        }
                      >

                        <p>
                          {m.mesaj}
                        </p>

                        <div className="message-meta">

                          <span>
                            {saatGoster(
                              m.tarih
                            )}
                          </span>

                          {benim && (

                            <span
                              className={
                                m.okundu
                                  ? "message-read"
                                  : "message-sent"
                              }
                            >

                              {m.okundu
                                ? "✓✓"
                                : "✓"}

                            </span>

                          )}

                        </div>

                      </div>

                    </div>

                  );

                })}

            </div>


            {/* MESAJ GÖNDER */}

            <div className="chat-send">

              <div className="chat-input-wrapper">

                <textarea
                  value={yeniMesaj}
                  onChange={(e) =>
                    setYeniMesaj(
                      e.target.value
                    )
                  }
                  onKeyDown={klavyeGonder}
                  placeholder="Mesajınızı yazın..."
                  rows="1"
                />

                <span className="input-hint">
                  Enter = Gönder
                </span>

              </div>

              <button
                className="send-button"
                onClick={mesajGonder}
                disabled={
                  gonderiliyor ||
                  !yeniMesaj.trim()
                }
              >

                {gonderiliyor
                  ? "Gönderiliyor..."
                  : "📨 Gönder"}

              </button>

            </div>

          </>

        )}

      </main>

    </div>

  );

}

export default Messages;