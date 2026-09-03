
import "../styles/components/flash-sale.css";
import { useRef } from "react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";

function FlashSale({ ilanlar = [] }) {
  const trackRef = useRef(null);

  function kaydir(direction) {
    trackRef.current?.scrollBy({ left: direction * 260, behavior: "smooth" });
  }

  return (

    <section className="flash-sale" aria-labelledby="flash-sale-title">

      <div className="flash-intro">
        <div className="flash-left">

        <span className="flash-icon">
          ⚡
        </span>

        <div>

          <h2 id="flash-sale-title">
            Günün Fırsatları
          </h2>

          <p>
            Yayındaki fırsat ürünlerini tek yerde keşfet
          </p>

        </div>

        </div>
        <Link className="flash-all-link" to="/gunun-firsatlari">Tümünü Gör <span aria-hidden="true">→</span></Link>
      </div>

      {ilanlar.length > 0 && (
        <div className="flash-products-wrap">
          <button type="button" className="flash-arrow flash-arrow-prev" onClick={() => kaydir(-1)} aria-label="Önceki fırsatlar">‹</button>
          <div className="flash-products" ref={trackRef}>
            {ilanlar.map((ilan) => (
              <div className="flash-product-item" key={ilan.id}>
                <ProductCard ilan={ilan} variant="deal" />
              </div>
            ))}
          </div>
          <button type="button" className="flash-arrow flash-arrow-next" onClick={() => kaydir(1)} aria-label="Sonraki fırsatlar">›</button>
        </div>
      )}

    </section>

  );

}

export default FlashSale;
