import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import ProductCard from "./ProductCard";
import { getTopDesigns } from "../services/designVoteApi";
import {
  getActiveBoostListings,
  getAvailableRankedDesigns,
  getNewestDesigns
} from "../utils/homeDiscovery";
import { isListingPublished } from "../utils/listingAvailability";

import "../styles/components/home-discovery.css";

function DiscoveryRail({ title, eyebrow, description, children, itemCount, ranked = false }) {
  const railRef = useRef(null);
  const [scroll, setScroll] = useState({ previous: false, next: false });

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    const update = () => {
      const maximum = Math.max(0, rail.scrollWidth - rail.clientWidth);
      setScroll({ previous: rail.scrollLeft > 2, next: rail.scrollLeft < maximum - 2 });
    };
    update();
    rail.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      rail.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [itemCount]);

  const move = (direction) => railRef.current?.scrollBy({
    left: direction * Math.max(620, railRef.current.clientWidth * 0.78),
    behavior: "smooth"
  });

  return (
    <section className={`discovery-section${ranked ? " discovery-section-ranked" : ""}`}>
      <header className="discovery-heading">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="discovery-controls" aria-label={`${title} gezinme kontrolleri`}>
          <button type="button" onClick={() => move(-1)} disabled={!scroll.previous} aria-label={`${title} önceki`}>←</button>
          <button type="button" onClick={() => move(1)} disabled={!scroll.next} aria-label={`${title} sonraki`}>→</button>
        </div>
      </header>
      <div className="discovery-rail" ref={railRef}>{children}</div>
    </section>
  );
}

function DiscoverySkeleton() {
  return <div className="discovery-skeleton" aria-hidden="true">{[1, 2, 3, 4].map((item) => <i key={item} />)}</div>;
}

function HomeDiscovery({ listings, loading = false, sponsoredProduct = null }) {
  const [rankedDesigns, setRankedDesigns] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTopDesigns(10)
      .then((data) => { if (active) setRankedDesigns(data.designs || []); })
      .catch(() => { if (active) setRankedDesigns([]); })
      .finally(() => { if (active) setRankingLoading(false); });
    return () => { active = false; };
  }, []);

  const boosted = useMemo(() => getActiveBoostListings(listings), [listings]);
  const newest = useMemo(() => getNewestDesigns(listings), [listings]);
  const top = useMemo(() => getAvailableRankedDesigns(rankedDesigns, listings), [rankedDesigns, listings]);
  const visibleSponsoredProduct = useMemo(
    () => (sponsoredProduct && isListingPublished(sponsoredProduct) ? sponsoredProduct : null),
    [sponsoredProduct]
  );

  return (
    <div className="home-discovery" aria-label="HediyeAlSat keşif vitrini">
      {loading ? <DiscoverySkeleton /> : boosted.length > 0 && (
        <DiscoveryRail title="⭐ Öne Çıkan İlanlar" eyebrow="SEÇKİN VİTRİN" description="Sınırlı süre öne çıkan, keşfetmeye değer ilanlar" itemCount={boosted.length}>
          {boosted.map((listing) => <div className="discovery-product" key={listing.id}><ProductCard ilan={listing} variant="home" cardExtra={<span className="discovery-boost-badge">Öne Çıkan</span>} /></div>)}
        </DiscoveryRail>
      )}

      {!loading && visibleSponsoredProduct && (
        <aside className="discovery-sponsored-spot" aria-label="Sponsorlu ilan">
          <span>Sponsorlu</span>
          <Link to={`/ilan/${visibleSponsoredProduct.id}`}>
            {visibleSponsoredProduct.resim && <img src={visibleSponsoredProduct.resim} alt="" loading="lazy" />}
            <strong>{visibleSponsoredProduct.baslik || visibleSponsoredProduct.ad || "Öne çıkan ürün"}</strong>
            <small>İlanı keşfet →</small>
          </Link>
        </aside>
      )}

      {rankingLoading ? <DiscoverySkeleton /> : top.length > 0 && (
        <DiscoveryRail title="🔥 Bugünün Top 10 Tasarımı" eyebrow="TOP 10" description="Topluluğun oylarıyla öne çıkan dijital tasarımlar" itemCount={top.length} ranked>
          {top.map((design) => (
            <article className="discovery-ranked-card" key={design.id}>
              <span className="discovery-rank-number" aria-label={`${design.sira}. sıra`}>{design.sira}</span>
              <Link to={`/ilan/${design.id}`} className="discovery-ranked-preview">
                {design.resim ? <img src={design.resim} alt={design.baslik || "Tasarım"} loading="lazy" /> : <span>🎨</span>}
                <div><strong>{design.baslik || "İsimsiz tasarım"}</strong><small>{Number(design.oySayisi || 0)} oy</small></div>
              </Link>
            </article>
          ))}
        </DiscoveryRail>
      )}

      {!loading && newest.length > 0 && (
        <DiscoveryRail title="✨ Yeni 10 Tasarım" eyebrow="YENİ KEŞİFLER" description="A4 Tasarım pazarına en son eklenen çalışmalar" itemCount={newest.length}>
          {newest.map((listing) => <div className="discovery-product" key={listing.id}><ProductCard ilan={listing} variant="home" /></div>)}
        </DiscoveryRail>
      )}

      <div className="discovery-all-listings"><Link to="/ilanlar">Tüm İlanları Gör <span>→</span></Link></div>
    </div>
  );
}

export default HomeDiscovery;
