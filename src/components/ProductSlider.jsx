import { useRef, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import ProductCard from "./ProductCard";
import { filterAvailableListings } from "../utils/listingAvailability";
import { sortListingsByBoost } from "../utils/listingBoost";

import "../styles/components/product-slider.css";

function ProductSlider({ title, ilanlar, sponsoredProductId = "", allTo = "/ilanlar" }) {

  const sliderRef = useRef(null);
  const visibleListings = useMemo(() => sortListingsByBoost(filterAvailableListings(ilanlar)), [ilanlar]);
  const [scrollState, setScrollState] = useState({ canPrev: false, canNext: false });

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return undefined;

    const updateScrollState = () => {
      const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth);
      setScrollState({
        canPrev: slider.scrollLeft > 2,
        canNext: slider.scrollLeft < maxScroll - 2
      });
    };

    updateScrollState();
    slider.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      slider.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [visibleListings.length]);

  const showArrows = scrollState.canPrev || scrollState.canNext;
  function next() {

    sliderRef.current?.scrollBy({

      left: Math.max(280, sliderRef.current.clientWidth * 0.85),

      behavior: "smooth"

    });

  }

  function prev() {

    sliderRef.current?.scrollBy({

      left: -Math.max(280, sliderRef.current.clientWidth * 0.85),

      behavior: "smooth"

    });

  }

  if (visibleListings.length === 0) {

    return null;

  }

  return (

    <section className="product-slider-section">

      <div className="slider-header">

        <div>

          <h2>{title}</h2>

          <p>

            Sana özel seçilmiş ürünler

          </p>

        </div>

        <Link className="all-button" to={allTo}>
          Tümünü Gör →
        </Link>

      </div>

      <div className="slider-wrapper">

        {showArrows && <button

          className="slider-arrow slider-arrow-prev"

          onClick={prev}

          disabled={!scrollState.canPrev}

          aria-label={`${title} önceki ürünler`}

        >

          ❮

        </button>}

        <div
  className="slider-products"
  ref={sliderRef}
>

          {

            visibleListings.map((ilan)=>(

              <div

                key={ilan.id}

                className="slider-item"

              >

                <ProductCard
                  ilan={ilan}
                  variant="home"
                  cardExtra={
                    ilan.id === sponsoredProductId
                      ? <span className="sponsored-card-badge">Sponsorlu</span>
                      : null
                  }
                />

              </div>

            ))

          }

        </div>

        {showArrows && <button

          className="slider-arrow slider-arrow-next"

          onClick={next}

          disabled={!scrollState.canNext}

          aria-label={`${title} sonraki ürünler`}

        >

          ❯

        </button>}

      </div>

    </section>

  );

}

export default ProductSlider;
