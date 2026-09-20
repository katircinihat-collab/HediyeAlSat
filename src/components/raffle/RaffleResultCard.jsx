import { Link } from "react-router-dom";

function firstName(displayName) {
  return String(displayName || "Bu kişi").trim().split(/\s+/)[0];
}

function RaffleResultCard({ result, eventId }) {
  const recipientName = result.displayName || "HediyeAlSat Üyesi";
  const recipientFirstName = firstName(recipientName);
  return <section className="raffle-result" aria-live="polite">
    <span aria-hidden="true">🎉</span>
    <p>KURA ÇEKİLDİ!</p>
    <h3>Sürpriz eşleşmen hazır.</h3>
    <div className="raffle-result__person">
      <small>🎁 Sana çıkan kişi</small>
      <strong>{recipientName.toLocaleUpperCase("tr-TR")} SANA ÇIKTI!</strong>
      <p className="raffle-result__responsibility">Sen {recipientName} için hediye hazırlayacaksın.</p>
      <div><b>💌 {recipientFirstName} sana küçük bir not bıraktı:</b><p>{result.giftHint || `💌 ${recipientFirstName} bu Kura için bir hediye notu bırakmamış.`}</p></div>
    </div>
    <p className="raffle-result__next">Şimdi sıra sende! Ona güzel bir sürpriz seç. 🎁</p>
    <Link className="raffle-result__discover" to="/ilanlar" onClick={() => {
      try { window.sessionStorage.setItem("hediyealsat.raffleGiftEvent", eventId || ""); } catch { /* Checkout backend doğrulaması authoritative kalır. */ }
    }}>🎁 {recipientFirstName} İçin Hediye Keşfet</Link>
  </section>;
}

export default RaffleResultCard;
