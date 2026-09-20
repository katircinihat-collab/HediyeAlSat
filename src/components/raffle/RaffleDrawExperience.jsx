import { useEffect, useState } from "react";

const stages = [
  { key: "shuffle", icon: "🎲", text: "İsimler karıştırılıyor...", delay: 3000 },
  { key: "drawing", icon: "✨", text: "Kura çekiliyor...", delay: 2000 },
  { key: "three", icon: "3", text: "Sürpriz eşleşmen hazırlanıyor...", delay: 1000 },
  { key: "two", icon: "2", text: "Sürpriz eşleşmen hazırlanıyor...", delay: 1000 },
  { key: "one", icon: "1", text: "Sürpriz eşleşmen hazırlanıyor...", delay: 1000 },
  { key: "reveal", icon: "🎉", text: "Eşleşmen hazır!", delay: 2000 }
];

function RaffleDrawExperience({ onComplete, names = [] }) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      const timer = window.setTimeout(onComplete, 0);
      return () => window.clearTimeout(timer);
    }
    const stage = stages[stageIndex];
    const timer = window.setTimeout(() => {
      if (stageIndex === stages.length - 1) onComplete();
      else setStageIndex((current) => current + 1);
    }, stage.delay);
    return () => window.clearTimeout(timer);
  }, [onComplete, stageIndex]);

  const stage = stages[stageIndex];
  return <section className={`raffle-draw raffle-draw--${stage.key}`} role="status" aria-live="polite">
    <div className="raffle-draw__sparkles" aria-hidden="true">✦ ✨ ✦</div>
    {names.length > 0 && stage.key === "shuffle" && <div className="raffle-draw__names" aria-hidden="true">{names.map((name) => <span key={name}>{name}</span>)}</div>}
    <strong aria-hidden="true">{stage.icon}</strong>
    <h2>{stage.text}</h2>
    <p>Lütfen kısa bir an bekle.</p>
  </section>;
}

export default RaffleDrawExperience;
