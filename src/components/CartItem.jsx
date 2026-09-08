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

  const dijitalUrun =
    urun.urunTipi === "dijital" ||
    urun.fizikselKargo === false;

  const stokSinirinda =
    !dijitalUrun &&
    Number.isInteger(urun.stok) &&
    urun.adet >= urun.stok;

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

          {dijitalUrun
            ? "🟢 Dijital ürün"
            : Number.isInteger(urun.stok)
              ? `🟢 ${urun.stok} adet stokta`
              : "🟢 Stokta"}

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

            type="button"
            aria-label={`${urun.baslik} adedini azalt`}
            onClick={() => adetAzalt(urun)}

          >

            −

          </button>

          <span>

            {urun.adet}

          </span>

          <button

            type="button"
            aria-label={`${urun.baslik} adedini artır`}
            disabled={stokSinirinda}
            title={stokSinirinda ? "Stok sınırına ulaşıldı" : "Adedi artır"}
            onClick={() => adetArttir(urun)}

          >

            +

          </button>

        </div>

        {stokSinirinda && (
          <small className="cart-qty-warning">Stok sınırına ulaştınız.</small>
        )}

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
