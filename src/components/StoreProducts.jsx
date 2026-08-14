import ProductCard from "./ProductCard";
import { useRef } from "react";

import "../styles/components/store-products.css";

function StoreProducts({ ilanlar }) {

  const sliderRef = useRef(null);

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

  return (

    <section className="store-products">

      <div className="store-products-header">

        <h2>📦 Bu Mağazanın Ürünleri</h2>

        <span>{ilanlar.length} Ürün</span>

      </div>

      {

        ilanlar.length === 0 ?

        (

          <div className="empty-products">

            Henüz ürün bulunmuyor.

          </div>

        )

        :

        (

          <div className="slider-wrapper">

            <button

              className="slider-button"

              onClick={prev}

            >

              ❮

            </button>

            <div

              className="products-slider"

              ref={sliderRef}

            >

              {

                ilanlar.map((ilan) => (

                  <div

                    key={ilan.id}

                    className="store-product-item"

                  >

                    <ProductCard

                      ilan={ilan}

                    />

                  </div>

                ))

              }

            </div>

            <button

              className="slider-button"

              onClick={next}

            >

              ❯

            </button>

          </div>

        )

      }

    </section>

  );

}

export default StoreProducts;