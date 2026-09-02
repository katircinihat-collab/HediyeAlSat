import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTopDesigns } from "../services/designVoteApi";
import TopDesignCard from "./TopDesignCard";
import "../styles/components/top-designs.css";

function TopDesignShowcase() {
  const [designs, setDesigns] = useState([]);

  useEffect(() => {
    getTopDesigns(4)
      .then((data) => setDesigns(data.designs || []))
      .catch((error) => console.error("Top tasarımlar alınamadı:", error));
  }, []);

  return (
    <section className="top-design-showcase">
      <header>
        <div>
          <h2>🏆 Top 10 Tasarım</h2>
          <p>Bu haftanın en çok oy alan dijital tasarımları</p>
        </div>
        <Link to="/top-10-tasarim">Tüm Top 10’u Gör →</Link>
      </header>
      <div className="top-design-grid">
        {designs.length ? designs.map((design) => (
          <TopDesignCard key={design.id} design={design} />
        )) : (
          <div className="top-design-showcase-empty">Bu hafta henüz oy alan tasarım bulunmuyor.</div>
        )}
      </div>
    </section>
  );
}

export default TopDesignShowcase;
