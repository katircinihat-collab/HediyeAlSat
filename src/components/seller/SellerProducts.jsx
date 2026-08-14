import "../../styles/pages/seller-products.css";

function SellerProducts({ urunler }) {

  return (

    <>

      <h2 className="section-title">

        📦 Ürünlerim

      </h2>

      {

        urunler.length === 0 ?

        <div className="empty-box">

          Henüz ürün eklenmemiş.

        </div>

        :

        <div className="products-grid">

          {

            urunler.map((urun)=>(

              <div
                className="product-card"
                key={urun.id}
              >

                <img

                  src={

                    urun.resim ||

                    "/no-image.png"

                  }

                  alt={urun.baslik}

                />

                <div className="product-body">

                  <div className="product-title">

                    {urun.baslik}

                  </div>

                  <div className="product-price">

                    ₺{Number(urun.fiyat).toLocaleString("tr-TR")}

                  </div>

                  <div className="product-stats">

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

                  <div style={{marginBottom:"15px"}}>

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

                  <div className="product-buttons">

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

    </>

  );

}

export default SellerProducts;