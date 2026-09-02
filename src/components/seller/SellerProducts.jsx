import "../../styles/pages/seller-products.css";

function SellerProducts({ urunler }) {

  return (

    <section className="seller-products-section">

      <h2 className="section-title">

        📦 Ürünlerim

      </h2>

      {

        urunler.length === 0 ?

        <div className="seller-products-empty">

          <span>📦</span>
          <strong>Henüz ürün eklenmemiş</strong>
          <p>Eklediğiniz ürünler bu bölümde görüntülenecek.</p>

        </div>

        :

        <div className="seller-products-grid">

          {

            urunler.map((urun)=>(

              <div
                className="seller-product-card"
                key={urun.id}
              >

                <div className="seller-product-image">
                  <img src={urun.resim || "/no-image.png"} alt={urun.baslik || "Ürün görseli"} />
                </div>

                <div className="seller-product-body">

                  <div className="seller-product-title">

                    {urun.baslik}

                  </div>

                  <div className="seller-product-price">

                    ₺{Number(urun.fiyat).toLocaleString("tr-TR")}

                  </div>

                  <div className="seller-product-stats">

                    <span>

                      👁 {urun.goruntulenme || 0}

                    </span>

                    <span>

                      ❤️ {urun.favori || 0}

                    </span>

                    <span>

                      📦 {urun.adet || 0}

                    </span>

                  </div>

                  <div className="seller-product-status">

                    {

                      urun.onay ?

                      <span className="badge success">

                        ✅ Yayında

                      </span>

                      :

                      <span className="badge waiting">

                        ⏳ Onay Bekliyor

                      </span>

                    }

                  </div>

                  <div className="seller-product-buttons">

                    <button

                      className="edit-btn"

                      onClick={()=>

                        window.location.href=

                        "/duzenle/"+urun.id

                      }

                    >

                      ✏ Düzenle

                    </button>

                    <button

                      className="cart-btn"

                      onClick={()=>

                        window.location.href=

                        "/ilan/"+urun.id

                      }

                    >

                      👁 Gör

                    </button>

                  </div>

                </div>

              </div>

            ))

          }

        </div>

      }

    </section>

  );

}

export default SellerProducts;
