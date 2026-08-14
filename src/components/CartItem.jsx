import { Link } from "react-router-dom";

function CartItem({

  urun,

  adetArttir,

  adetAzalt,

  sil,

  favorilereTasi

}) {

  const fiyat =

    Number(

      String(urun.fiyat || 0)

        .replace(/[^\d.,]/g, "")

        .replace(",", ".")

    ) || 0;

  const araToplam =

    fiyat * urun.adet;

  return (

    <div className="cart-card">

      {/* SOL */}

      <div className="cart-left">

        <img

          src={

            urun.resim ||

            "/no-image.png"

          }

          alt={urun.baslik}

          className="cart-image"

        />

      </div>

      {/* ORTA */}

      <div className="cart-center">

        <Link

          to={`/ilan/${urun.ilanId}`}

          className="cart-title"

        >

          <h2>

            {urun.baslik}

          </h2>

        </Link>

        <div className="cart-price">

          ₺{fiyat.toLocaleString("tr-TR")}

        </div>

        <p className="stock-text">

          🟢 Stokta

        </p>

        <p className="seller-text">

          🏪 Satıcı :

          <b>

            {urun.satici}

          </b>

        </p>
        <p className="delivery-text">

          🚚 Tahmini Teslim

          <b>

            1-3 İş Günü

          </b>

        </p>

        {/* ADET */}

        <div className="cart-qty">

          <button

            onClick={()=>

              adetAzalt(

                urun.id,

                urun.adet

              )

            }

          >

            −

          </button>

          <span>

            {urun.adet}

          </span>

          <button

            onClick={()=>

              adetArttir(

                urun.id,

                urun.adet

              )

            }

          >

            +

          </button>

        </div>

        {/* EK BİLGİ */}

        <div className="cart-extra">

          <div className="cart-info-row">

            <span>

              🚚 Kargo

            </span>

            <b>

              Ücretsiz

            </b>

          </div>

          <div className="cart-info-row">

            <span>

              📦 Ürün Durumu

            </span>

            <b>

              Yeni

            </b>

          </div>

          <div className="cart-info-row">

            <span>

              🛡 Garanti

            </span>

            <b>

              Var

            </b>

          </div>

        </div>
        {/* SAĞ TARAF */}

      </div>

      <div className="cart-right">

        <div className="subtotal-box">

          <span>

            Ara Toplam

          </span>

          <h2>

            ₺{araToplam.toLocaleString("tr-TR")}

          </h2>

        </div>

        <div className="cart-buttons">

          <button

            className="favorite-btn"

            onClick={()=>

              favorilereTasi(urun)

            }

          >

            ❤️ Favorilere Taşı

          </button>

          <button

            className="remove-btn"

            onClick={()=>

              sil(urun.id)

            }

          >

            🗑️ Sepetten Kaldır

          </button>

        </div>

        <div className="secure-info">

          <div>

            🔒 Güvenli Alışveriş

          </div>

          <div>

            ⭐ Onaylı Satıcı

          </div>

          <div>

            🚚 Hızlı Teslimat

          </div>

          <div>

            ↩️ 14 Gün İade

          </div>

        </div>
        

      </div>

    </div>

  );

}

export default CartItem;