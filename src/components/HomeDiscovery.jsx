import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import ProductCard from "./ProductCard";
import {
  getAdminFeaturedListings,
  getBudgetProducts,
  getNewestProducts,
  getTopProducts
} from "../utils/homeDiscovery";
import { isListingPublished } from "../utils/listingAvailability";

import "../styles/components/home-discovery.css";

function DiscoveryRail({ title, eyebrow, description, children, itemCount }) {
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
    <section className="discovery-section discovery-section-ranked">
      <header className="discovery-heading">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="discovery-heading-actions">
          <Link to="/ilanlar">Tümünü Gör →</Link>
          <div className="discovery-controls" aria-label={`${title} gezinme kontrolleri`}>
            <button type="button" onClick={() => move(-1)} disabled={!scroll.previous} aria-label={`${title} önceki`}>←</button>
            <button type="button" onClick={() => move(1)} disabled={!scroll.next} aria-label={`${title} sonraki`}>→</button>
          </div>
        </div>
      </header>
      <div className="discovery-rail" ref={railRef}>{children}</div>
    </section>
  );
}

function DiscoverySkeleton() {
  return <div className="discovery-skeleton" aria-hidden="true">{[1, 2, 3, 4].map((item) => <i key={item} />)}</div>;
}

export function BudgetProductShowcase({ listings, loading = false }) {
  const products = useMemo(() => getBudgetProducts(listings), [listings]);

  return (
    <div className="home-discovery home-discovery-budget">
      {loading && <DiscoverySkeleton />}
      {!loading && (
        <DiscoveryRail title="💯 Ne Alırsan 100 TL" eyebrow="UYGUN FİYATLI HEDİYELER" description="100 TL ve altındaki hediyeleri keşfet" itemCount={products.length}>
          {products.length ? products.map((listing) => (
            <article className="discovery-budget-product" key={listing.id}>
              <ProductCard ilan={listing} variant="home" />
            </article>
          )) : <div className="discovery-empty">Şu anda 100 TL ve altında yayında ürün bulunmuyor.</div>}
        </DiscoveryRail>
      )}
    </div>
  );
}

function HomeDiscovery({ listings, loading = false, sponsoredProduct = null, section = "all" }) {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [featuredPaused, setFeaturedPaused] = useState(false);
  const featured = useMemo(() => getAdminFeaturedListings(listings), [listings]);
  const top = useMemo(() => getTopProducts(listings), [listings]);
  const newest = useMemo(() => getNewestProducts(listings), [listings]);
  const visibleSponsoredProduct = useMemo(
    () => (sponsoredProduct && isListingPublished(sponsoredProduct) ? sponsoredProduct : null),
    [sponsoredProduct]
  );

  useEffect(() => {
    if (featured.length < 2 || featuredPaused) return undefined;
    const timer = window.setInterval(
      () => setFeaturedIndex((current) => (current + 1) % featured.length),
      6000
    );
    return () => window.clearInterval(timer);
  }, [featured.length, featuredPaused]);

  useEffect(() => {
    if (featuredIndex >= featured.length) setFeaturedIndex(0);
  }, [featured.length, featuredIndex]);

  const moveFeatured = (direction) => {
    setFeaturedIndex((current) => (current + direction + featured.length) % featured.length);
  };

  return (
    <div className="home-discovery" aria-label="HediyeAlSat keşif vitrini">
      {loading && <DiscoverySkeleton />}

      {!loading && section !== "rankings" && featured.length > 0 && (
        <section
          className="discovery-featured"
          aria-labelledby="discovery-featured-title"
          onMouseEnter={() => setFeaturedPaused(true)}
          onMouseLeave={() => setFeaturedPaused(false)}
          onFocusCapture={() => setFeaturedPaused(true)}
          onBlurCapture={() => setFeaturedPaused(false)}
        >
          <header>
            <span>PREMİUM VİTRİN</span>
            <h2 id="discovery-featured-title">⭐ Öne Çıkan İlanlar</h2>
          </header>
          <div className="discovery-featured-stage">
            <ProductCard
              key={featured[featuredIndex].id}
              ilan={featured[featuredIndex]}
              variant="discovery-hero"
              cardExtra={<span className="discovery-featured-cta">Ürünü Gör →</span>}
            />
            {featured.length > 1 && (
              <div className="discovery-featured-controls" aria-label="Öne çıkan ilan gezinme kontrolleri">
                <button type="button" onClick={() => moveFeatured(-1)} aria-label="Önceki öne çıkan ilan">←</button>
                <span>{featuredIndex + 1} / {featured.length}</span>
                <button type="button" onClick={() => moveFeatured(1)} aria-label="Sonraki öne çıkan ilan">→</button>
              </div>
            )}
          </div>
        </section>
      )}

      {!loading && section !== "featured" && visibleSponsoredProduct && (
        <aside className="discovery-sponsored-spot" aria-label="Sponsorlu ilan">
          <span>Sponsorlu</span>
          <Link to={`/ilan/${visibleSponsoredProduct.id}`}>
            {visibleSponsoredProduct.resim && <img src={visibleSponsoredProduct.resim} alt="" loading="lazy" />}
            <strong>{visibleSponsoredProduct.baslik || visibleSponsoredProduct.ad || "Öne çıkan ürün"}</strong>
            <small>İlanı keşfet →</small>
          </Link>
        </aside>
      )}

      {!loading && section !== "featured" && top.length > 0 && (
        <DiscoveryRail title="🔥 Bugünün Top 10 Ürünü" eyebrow="ÇOK SEVİLENLER" description="En çok görüntülenen popüler ürünler" itemCount={top.length}>
          {top.map((listing, index) => (
            <article className="discovery-ranked-card" key={listing.id}>
              <span className="discovery-rank-number" aria-label={`${index + 1}. sıra`}>{index + 1}</span>
              <div className="discovery-ranked-product"><ProductCard ilan={listing} variant="home" /></div>
            </article>
          ))}
        </DiscoveryRail>
      )}

      {!loading && section !== "featured" && newest.length > 0 && (
        <DiscoveryRail title="✨ Yeni Gelen 10 Ürün" eyebrow="TAZE KEŞİFLER" description="HediyeAlSat'a en son eklenen ürünler" itemCount={newest.length}>
          {newest.map((listing, index) => (
            <article className="discovery-ranked-card" key={listing.id}>
              <span className="discovery-rank-number" aria-label={`${index + 1}. sıra`}>{index + 1}</span>
              <div className="discovery-ranked-product"><ProductCard ilan={listing} variant="home" /></div>
            </article>
          ))}
        </DiscoveryRail>
      )}
    </div>
  );
}

export default HomeDiscovery;
