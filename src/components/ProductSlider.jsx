import { useRef, useEffect } from "react";

import ProductCard from "./ProductCard";

import "../styles/components/product-slider.css";

function ProductSlider({ title, ilanlar }) {

  const sliderRef = useRef(null);
useEffect(() => {

  const slider = sliderRef.current;

  if (!slider) return;

  const interval = setInterval(() => {

    const maxScroll =
      slider.scrollWidth - slider.clientWidth;

    if (slider.scrollLeft >= maxScroll - 10) {

      slider.scrollTo({

        left: 0,

        behavior: "smooth"

      });

    } else {

      slider.scrollBy({

        left: 320,

        behavior: "smooth"

      });

    }

  }, 4000);

  return () => clearInterval(interval);

}, []);
  function next() {

    sliderRef.current.scrollBy({

      left: 1500,

      behavior: "smooth"

    });

  }

  function prev() {

    sliderRef.current.scrollBy({

      left: -1500,

      behavior: "smooth"

    });

  }

  if (!ilanlar || ilanlar.length === 0) {

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

        <button className="all-button">

          Tümünü Gör →

        </button>

      </div>

      <div className="slider-wrapper">

        <button

          className="slider-arrow"

          onClick={prev}

        >

          ❮

        </button>

        <div
  className="slider-products"
  ref={sliderRef}
  onMouseEnter={() => sliderRef.current.style.scrollBehavior = "auto"}
  onMouseLeave={() => sliderRef.current.style.scrollBehavior = "smooth"}
>

          {

            ilanlar.map((ilan)=>(

              <div

                key={ilan.id}

                className="slider-item"

              >

                <ProductCard ilan={ilan} variant="home" />

              </div>

            ))

          }

        </div>

        <button

          className="slider-arrow"

          onClick={next}

        >

          ❯

        </button>

      </div>

    </section>

  );

}

export default ProductSlider;
