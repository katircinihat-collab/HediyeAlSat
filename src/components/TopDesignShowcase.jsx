import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTopDesigns } from "../services/designVoteApi";
import TopDesignCard from "./TopDesignCard";
import "../styles/components/top-designs.css";

function TopDesignShowcase() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true); setError("");
    return getTopDesigns(4)
      .then((data) => setDesigns(data.designs || []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
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
        {loading ? Array.from({ length: 4 }, (_, index) => <span className="top-design-skeleton" key={index} aria-hidden="true" />) : error ? (
          <div className="top-design-showcase-empty" role="alert">{error} <button type="button" onClick={load}>Tekrar Dene</button></div>
        ) : designs.length ? designs.map((design) => (
          <TopDesignCard key={design.id} design={design} />
        )) : (
          <div className="top-design-showcase-empty">Bu hafta henüz oy alan tasarım bulunmuyor.</div>
        )}
      </div>
    </section>
  );
}

export default TopDesignShowcase;
