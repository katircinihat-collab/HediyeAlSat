import { Link } from "react-router-dom";

import "../styles/components/special-days.css";


const ozelGunler = [

  {
    ad: "Sevgililer Günü",
    emoji: "❤️"
  },

  {
    ad: "Anneler Günü",
    emoji: "🌷"
  },

  {
    ad: "Babalar Günü",
    emoji: "👔"
  },

  {
    ad: "Doğum Günü",
    emoji: "🎂"
  },

  {
    ad: "Yılbaşı",
    emoji: "🎄"
  },

  {
    ad: "Mezuniyet",
    emoji: "🎓"
  },

  {
    ad: "Yıldönümü",
    emoji: "💍"
  },

  {
    ad: "Sürpriz",
    emoji: "🎉"
  }

];


function SpecialDays() {

  return (

    <section className="special-days">

      <div className="special-days-header">

        <h2>
          🎁 Özel Günler
        </h2>

        <p>
          Özel günler için en güzel hediyeleri keşfedin.
        </p>

      </div>


      <div className="special-days-grid">

        {ozelGunler.map((gun) => (

          <div
            className="special-day-card"
            key={gun.ad}
          >

            <div className="special-day-emoji">
              {gun.emoji}
            </div>


            <h3>
              {gun.ad}
            </h3>


            <Link
              to={`/ozel-gun/${encodeURIComponent(gun.ad)}`}
              className="special-day-button"
            >
              Hediyeleri Gör
            </Link>

          </div>

        ))}

      </div>

    </section>

  );

}


export default SpecialDays;