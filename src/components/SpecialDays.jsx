import "./../styles/components/special-days.css";
import { useNavigate } from "react-router-dom";

function SpecialDays() {

  const navigate = useNavigate();

  const gunler = [
    { icon: "❤️", ad: "Sevgililer Günü", renk: "#ff4d6d" },
    { icon: "🌹", ad: "Anneler Günü", renk: "#ff7b7b" },
    { icon: "👔", ad: "Babalar Günü", renk: "#4d96ff" },
    { icon: "🎂", ad: "Doğum Günü", renk: "#ff9f1c" },
    { icon: "🎄", ad: "Yılbaşı", renk: "#2ec4b6" },
    { icon: "🎓", ad: "Mezuniyet", renk: "#8338ec" },
    { icon: "💍", ad: "Yıldönümü", renk: "#ff006e" },
    { icon: "🎉", ad: "Sürpriz", renk: "#06d6a0" }
  ];

  function hediyeleriGor(gun) {
    navigate(`/?ozelGun=${encodeURIComponent(gun)}`);
  }

  return (
    <section className="special-days">

      <h2>🎁 Özel Günler</h2>

      <div className="days-grid">

        {gunler.map((g, index) => (

          <div
            key={index}
            className="day-card"
            style={{ borderTop: `5px solid ${g.renk}` }}
          >

            <div className="day-icon">
              {g.icon}
            </div>

            <h3>
              {g.ad}
            </h3>

            <button
              type="button"
              onClick={() => hediyeleriGor(g.ad)}
            >
              Hediyeleri Gör
            </button>

          </div>

        ))}

      </div>

    </section>
  );
}

export default SpecialDays;