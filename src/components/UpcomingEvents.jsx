import "../styles/components/upcoming-events.css";
import { useNavigate } from "react-router-dom";

const events = [
  {
    icon: "❤️",
    title: "Sevgililer Günü",
    date: "14 Şubat",
    button: "Hediyeleri Gör"
  },
  {
    icon: "🌸",
    title: "Anneler Günü",
    date: "Mayıs • 2. Pazar",
    button: "Hediyeleri Gör"
  },
  {
    icon: "👔",
    title: "Babalar Günü",
    date: "Haziran • 3. Pazar",
    button: "Hediyeleri Gör"
  },
  {
    icon: "🎂",
    title: "Doğum Günü",
    date: "Her Zaman",
    button: "Hediyeleri Gör"
  },
  {
    icon: "🎓",
    title: "Mezuniyet",
    date: "Haziran",
    button: "Hediyeleri Gör"
  },
  {
    icon: "🎄",
    title: "Yılbaşı",
    date: "31 Aralık",
    button: "Hediyeleri Gör"
  }
];

function UpcomingEvents() {

  const navigate = useNavigate();

  function hediyeleriGor(gun) {
    navigate(`/?ozelGun=${encodeURIComponent(gun)}`);
  }

  return (
    <section className="events-section">

      <h2 className="events-title">
        📅 Yaklaşan Özel Günler
      </h2>

      <div className="events-grid">

        {events.map((event) => (

          <div
            className="event-card"
            key={event.title}
          >

            <div className="event-icon">
              {event.icon}
            </div>

            <h3>
              {event.title}
            </h3>

            <p>
              {event.date}
            </p>

            <button
              type="button"
              onClick={() => hediyeleriGor(event.title)}
            >
              {event.button}
            </button>

          </div>

        ))}

      </div>

    </section>
  );
}

export default UpcomingEvents;