import "../styles/components/gift-assistant.css";
import { useState } from "react";

function GiftAssistant() {

  const [kisi, setKisi] = useState("");
  const [butce, setButce] = useState("");
  const [mesaj, setMesaj] = useState("");

  function oner() {

    if (!kisi || !butce) {

      alert("Lütfen kişi ve bütçe seçiniz.");

      return;

    }

    alert("🤖 Yapay zekâ hediye öneri sistemi yakında aktif olacak.");

  }

  return (

    <section className="gift-assistant">

      <div className="assistant-box">

        <h2>🤖 Yapay Zekâ Hediye Asistanı</h2>

        <p>

          Birkaç bilgi ver, sana en uygun hediyeleri bulalım.

        </p>

        <div className="assistant-grid">

          <select
            value={kisi}
            onChange={(e)=>setKisi(e.target.value)}
          >

            <option value="">👤 Kime?</option>

            <option>Eşim</option>

            <option>Anne</option>

            <option>Baba</option>

            <option>Çocuk</option>

            <option>Arkadaş</option>

            <option>Sevgili</option>

          </select>

          <select
            value={butce}
            onChange={(e)=>setButce(e.target.value)}
          >

            <option value="">💰 Bütçe</option>

            <option>0-500 TL</option>

            <option>500-1000 TL</option>

            <option>1000-2500 TL</option>

            <option>2500 TL +</option>

          </select>

        </div>

        <textarea

          placeholder="Örneğin:
30 yaşındaki eşime doğum günü hediyesi,
romantik ve teknolojiyi seviyor."

          value={mesaj}

          onChange={(e)=>setMesaj(e.target.value)}

        />

        <button onClick={oner}>

          🎁 Bana Hediye Öner

        </button>

      </div>

    </section>

  );

}

export default GiftAssistant;