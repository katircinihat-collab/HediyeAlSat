import "../styles/components/upcoming-events.css";
import { useNavigate } from "react-router-dom";

const events = [
  {
    icon: "❤️",
    title: "Sevgililer Günü",
    date: "14 Şubat"
  },
  {
    icon: "🌸",
    title: "Anneler Günü",
    date: "Mayıs • 2. Pazar"
  },
  {
    icon: "👔",
    title: "Babalar Günü",
    date: "Haziran • 3. Pazar"
  },
  {
    icon: "🎂",
    title: "Doğum Günü",
    date: "Her Zaman"
  },
  {
    icon: "🎓",
    title: "Mezuniyet",
    date: "Haziran"
  },
  {
    icon: "🎄",
    title: "Yılbaşı",
    date: "31 Aralık"
  }
];

function UpcomingEvents() {

  const navigate = useNavigate();

  function hediyeleriGor(gun) {

    navigate(
      `/ozel-gun/${encodeURIComponent(gun)}`
    );

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
              onClick={() =>
                hediyeleriGor(event.title)
              }
            >
              Hediyeleri Gör
            </button>

          </div>

        ))}

      </div>

    </section>

  );

}

export default UpcomingEvents;