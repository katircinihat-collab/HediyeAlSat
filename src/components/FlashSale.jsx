
import "../styles/components/flash-sale.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function FlashSale() {

  const [time, setTime] = useState("00:00:00");

  useEffect(() => {

    const timer = setInterval(() => {

      const now = new Date();

      const finish = new Date();

      finish.setHours(23, 59, 59, 999);

      const diff = finish - now;

      const saat = Math.floor(
        diff / 1000 / 60 / 60
      );

      const dakika = Math.floor(
        (diff / 1000 / 60) % 60
      );

      const saniye = Math.floor(
        (diff / 1000) % 60
      );

      setTime(
        `${String(saat).padStart(2, "0")}:${String(dakika).padStart(2, "0")}:${String(saniye).padStart(2, "0")}`
      );

    }, 1000);

    return () => clearInterval(timer);

  }, []);

  return (

    <Link
      to="/gunun-firsatlari"
      className="flash-sale"
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "flex"
      }}
    >

      <div className="flash-left">

        <span className="flash-icon">
          ⚡
        </span>

        <div>

          <h2>
            Günün Fırsatları
          </h2>

          <p>
            Gece 23:59'a kadar geçerli kampanyalar
          </p>

        </div>

      </div>


      <div className="flash-right">

        <span>
          ⏰
        </span>

        <strong>
          {time}
        </strong>

      </div>

    </Link>

  );

}

export default FlashSale;