import "../styles/components/product-grid.css";
import { useRef } from "react";
import ProductCard from "./ProductCard";

function ProductGrid({

  title,

  ilanlar = [],

  setIlanlar

}) {

  const sliderRef = useRef(null);

  function sola() {

    sliderRef.current?.scrollBy({

      left: -320,

      behavior: "smooth"

    });

  }

  function saga() {

    sliderRef.current?.scrollBy({

      left: 320,

      behavior: "smooth"

    });

  }

  if (ilanlar.length === 0) {

    return null;

  }

  return (

    <section className="product-section">

      <div className="product-header">

        <h2>{title}</h2>

        <div className="slider-buttons">

          <button onClick={sola}>❮</button>

          <button onClick={saga}>❯</button>

        </div>

      </div>

      <div
        className="products-slider"
        ref={sliderRef}
      >

        {ilanlar.slice(0, 13).map((ilan) => (

          <div
            className="product-item"
            key={ilan.id}
          >

            <ProductCard
              ilan={ilan}
              ilanlar={ilanlar}
              setIlanlar={setIlanlar}
            />

          </div>

        ))}

      </div>

    </section>

  );

}

export default ProductGrid;