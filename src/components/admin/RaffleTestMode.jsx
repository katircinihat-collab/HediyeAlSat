import { useMemo, useState } from "react";
import RaffleMatchList from "../raffle/RaffleMatchList";
import RaffleDrawExperience from "../raffle/RaffleDrawExperience";
import RaffleResultCard from "../raffle/RaffleResultCard";
import { createCircularTestMatches, getTestResult, RAFFLE_TEST_PARTICIPANTS } from "../../utils/raffleTestMode";
import "../../styles/pages/raffle.css";

const TEST_EVENT = Object.freeze({
  title: "🎁 HediyeAlSat Test Kurası",
  description: "Yalnız localhost görünümünde çalışan örnek Kura etkinliği.",
  xpCost: 100,
  minimumParticipantCount: 10,
  joinStartAt: "2026-09-20T10:00:00.000Z",
  joinEndAt: "2026-09-21T10:00:00.000Z",
  drawAt: "2026-09-21T10:05:00.000Z"
});

const phaseLabels = { OPEN: "KATILIMA AÇIK", READY: "ÇEKİME HAZIR", DRAWING: "KURA ÇEKİLİYOR", MATCHED: "KURA ÇEKİLDİ" };

function RaffleTestMode() {
  const [phase, setPhase] = useState("");
  const [scenario, setScenario] = useState("insufficient");
  const [participantId, setParticipantId] = useState(RAFFLE_TEST_PARTICIPANTS[0].id);
  const [showResult, setShowResult] = useState(false);
  const [testNote, setTestNote] = useState(RAFFLE_TEST_PARTICIPANTS[0].giftHint);
  const [testNoteSaved, setTestNoteSaved] = useState(false);
  const matches = useMemo(() => phase === "MATCHED" ? createCircularTestMatches() : [], [phase]);
  const previewResult = getTestResult(createCircularTestMatches(), participantId);

  function draw() {
    if (phase !== "READY" || !window.confirm("Kura çekildiğinde test eşleşmeleri oluşturulacak. Bu işlem yalnızca localhost test görünümünü etkiler.")) return;
    setPhase("DRAWING");
  }

  return <section className="admin-raffle-test" aria-labelledby="raffle-test-title">
    <header><div><span>LOCALHOST · GELİŞTİRME</span><h2 id="raffle-test-title">🧪 Kura Test Modu</h2><p>Bu alan yalnızca geliştirme ortamında görünür. Gerçek kullanıcı, XP, Firestore veya production Kura verilerini değiştirmez.</p></div></header>
    {!phase ? <button type="button" className="admin-raffle-test__start" onClick={() => setPhase("OPEN")}>Test Kurasını Başlat</button> : <>
      <article className="admin-raffle-card admin-raffle-test__event">
        <header><div><span className="admin-raffle-status">{phaseLabels[phase]}</span><h3>{TEST_EVENT.title}</h3><p>{TEST_EVENT.description}</p></div><strong>👥 {phase === "OPEN" ? 3 : 10} / {TEST_EVENT.minimumParticipantCount}</strong></header>
        <dl><div><dt>Katılım bedeli</dt><dd>{TEST_EVENT.xpCost} XP</dd></div><div><dt>Katılım başlangıcı</dt><dd>{new Date(TEST_EVENT.joinStartAt).toLocaleString("tr-TR")}</dd></div><div><dt>Kura zamanı</dt><dd>{new Date(TEST_EVENT.drawAt).toLocaleString("tr-TR")}</dd></div></dl>
        <div className="admin-raffle-detail"><h4>Test Katılımcıları</h4>{RAFFLE_TEST_PARTICIPANTS.map((participant) => <div className="admin-raffle-person" key={participant.id}><strong>{participant.displayName}</strong><span>Aktif · Yerel test verisi</span><p>💌 {participant.giftHint}</p></div>)}</div>
        {phase === "OPEN" && <><p className="admin-raffle-note">Minimum katılımcı sayısına ulaşmak için 7 kişi daha gerekiyor.</p><div className="admin-raffle-actions"><button type="button" onClick={() => setPhase("READY")}>10 / 10 · Çekime Hazır Duruma Getir</button></div></>}
        {phase === "READY" && <><p className="admin-raffle-note">10 aktif katılımcı Kura çekimi için hazır.</p><div className="admin-raffle-actions"><button type="button" onClick={draw}>🎲 Test Kurasını Çek</button></div></>}
        {phase === "DRAWING" && <RaffleDrawExperience names={RAFFLE_TEST_PARTICIPANTS.map((participant) => participant.displayName)} onComplete={() => { setPhase("MATCHED"); setShowResult(true); }} />}
        {phase === "MATCHED" && <><p className="admin-raffle-complete">🎉 Kura başarıyla çekildi! 3 katılımcı başarıyla eşleştirildi. Kura tamamlandı.</p><div className="admin-raffle-detail"><h4>Eşleşme Sonuçları</h4><RaffleMatchList matches={matches} /></div></>}
      </article>

      <section className="admin-raffle-test__preview">
        <header><div><span>YEREL UI ÖNİZLEMESİ</span><h3>Katılım Ekranını Önizle</h3></div></header>
        <label>Senaryo<select value={scenario} onChange={(event) => setScenario(event.target.value)}><option value="insufficient">0 XP / yetersiz XP</option><option value="addressMissing">100 XP / adres eksik</option><option value="eligible">100 XP / adres seçili</option><option value="joined">Katılmış kullanıcı</option></select></label>
        {scenario === "insufficient" && <div className="raffle-join raffle-join--eligible admin-raffle-test__join"><span className="raffle-join__eyebrow">KATILIM DURUMU</span><h3>Bu Kura için biraz daha XP gerekiyor</h3><div className="raffle-join__balance"><span>⭐ Kullanılabilir XP <b>0 XP</b></span><span>🎟 Katılım bedeli <b>100 XP</b></span></div><button type="button" className="raffle-join__cta" disabled>🎲 Kuraya Katıl</button><small>Katılım için 100 kullanılabilir XP gerekiyor.</small></div>}
        {scenario === "addressMissing" && <div className="raffle-join raffle-join--eligible admin-raffle-test__join"><h3>📦 Teslimat adresi gerekli</h3><p>Kura'ya katılmak için teslimat adresini seçmelisin.</p><button type="button" className="raffle-join__cta" disabled>🎲 Kuraya Katıl</button><button type="button" className="raffle-secondary" onClick={() => setScenario("eligible")}>Test adresini seç</button></div>}
        {scenario === "eligible" && <div className="raffle-join raffle-join--eligible admin-raffle-test__join"><span className="raffle-join__eyebrow">KATILIM DURUMU</span><h3>🎲 Kuraya Katılmaya Hazırsın</h3><div className="raffle-join__balance"><span>⭐ Kullanılabilir XP <b>100 XP</b></span><span>🎟 Katılım bedeli <b>100 XP</b></span></div><label className="raffle-hint"><b>💌 Hediye Notum <small>(Opsiyonel)</small></b><span>Sana çıkacak kişiye küçük bir not bırak. Neleri sevdiğini anlatabilirsin.</span><textarea value={testNote} onChange={(event) => setTestNote(event.target.value.slice(0, 240))} maxLength={240} /><small className="raffle-hint__count">{testNote.length} / 240</small></label><button type="button" className="raffle-join__cta" onClick={() => setScenario("joined")}>🎲 Kuraya Katıl</button><small>Bu buton yalnız yerel önizleme durumunu değiştirir.</small></div>}
        {scenario === "joined" && <div className="raffle-join raffle-join--joined admin-raffle-test__join"><div className="raffle-joined"><strong>✓ KURAYA KATILDIN!</strong><span>Artık Kura listesindesin. Şimdi isimlerin çekilmesini bekle.</span></div><div className="raffle-joined__facts"><span>🎲 Kura çekimi bekleniyor</span><span>👥 3 katılımcı</span><span>⭐ 100 XP ile katıldın</span></div><label className="raffle-hint"><b>💌 Hediye Notum <small>(Opsiyonel)</small></b><span>Sana çıkacak kişiye küçük bir not bırak. Neleri sevdiğini anlatabilirsin.</span><textarea value={testNote} onChange={(event) => { setTestNote(event.target.value.slice(0, 240)); setTestNoteSaved(false); }} maxLength={240} /><small className="raffle-hint__count">{testNote.length} / 240</small></label><button type="button" className="raffle-secondary" onClick={() => setTestNoteSaved(true)}>💌 Notumu Kaydet</button>{testNoteSaved && <small className="raffle-note-success">Hediye notun kaydedildi. 💌</small>}<section className="raffle-chat admin-raffle-test__chat"><header><div><h2>💬 Kura Sohbeti</h2><p>Katılımcılar etkinlik hakkında burada sohbet edebilir.</p></div></header><div className="raffle-chat__messages"><p>Henüz mesaj yok. İlk mesajı sen bırakabilirsin. 👋</p></div></section></div>}
      </section>

      <section className="admin-raffle-test__preview">
        <header><div><span>YEREL UI ÖNİZLEMESİ</span><h3>Kullanıcı Sonucunu Önizle</h3></div></header>
        <label>Test katılımcısı<select value={participantId} onChange={(event) => setParticipantId(event.target.value)}>{RAFFLE_TEST_PARTICIPANTS.map((participant) => <option key={participant.id} value={participant.id}>{participant.displayName}</option>)}</select></label>
        <button type="button" onClick={() => setShowResult((value) => !value)}>{showResult ? "Önizlemeyi Gizle" : "Kullanıcı Sonucunu Önizle"}</button>
        {showResult && previewResult && <RaffleResultCard result={previewResult} />}
        {showResult && <div className="checkout-box checkout-raffle-gift"><h3>🎁 Kura Hediyesi Checkout Önizlemesi</h3><p>Bu hediye eşleşen kişi için gönderilecek. Açık teslimat adresi hediye alana gösterilmez.</p><p>Fiziksel ürün · Alıcı kargo ücreti: 0 TL · Satıcı karşılıyor</p></div>}
      </section>
      <button type="button" className="admin-reject" onClick={() => { setPhase(""); setScenario("insufficient"); setShowResult(false); setTestNote(RAFFLE_TEST_PARTICIPANTS[0].giftHint); setTestNoteSaved(false); }}>Test Görünümünü Sıfırla</button>
    </>}
  </section>;
}

export default RaffleTestMode;
