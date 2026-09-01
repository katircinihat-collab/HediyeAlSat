import "../styles/components/product-card.css";

import {
  Link
} from "react-router-dom";

import {
  useState
} from "react";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc
} from "firebase/firestore";

import {
  auth,
  db
} from "../firebase";


function ProductCard({ ilan }) {


  /* =========================
     FAVORİ
  ========================= */

  const [fav, setFav] = useState(

    localStorage.getItem(
      "fav_" + ilan.id
    ) === "true"

  );


  /* =========================
     FİYAT
  ========================= */

  const fiyat =

    Number(

      String(
        ilan.fiyat || 0
      )

        .replace(
          /[^\d.,]/g,
          ""
        )

        .replace(
          ",",
          "."
        )

    ) || 0;


  const eskiFiyat =

    Number(

      String(
        ilan.eskiFiyat || 0
      )

        .replace(
          /[^\d.,]/g,
          ""
        )

        .replace(
          ",",
          "."
        )

    ) || 0;


  /* =========================
     İNDİRİM
  ========================= */

  const indirim =

    eskiFiyat > fiyat

      ? Math.round(

          (
            (eskiFiyat - fiyat) /
            eskiFiyat
          ) * 100

        )

      : Number(
          ilan.indirim || 0
        );


  /* =========================
     PUAN
  ========================= */

  const puan =

    Number(
      ilan.puan || 0
    );


  const yorumSayisi =

    Number(
      ilan.yorumSayisi || 0
    );


  /* =========================
     FAVORİ
  ========================= */

  function favori(e) {

    e.preventDefault();

    e.stopPropagation();


    const yeniDurum =
      !fav;


    localStorage.setItem(

      "fav_" + ilan.id,

      yeniDurum.toString()

    );


    setFav(
      yeniDurum
    );

  }


  /* =========================
     SEPETE EKLE
  ========================= */

  async function sepeteEkle(e) {

    e.preventDefault();

    e.stopPropagation();


    if (!auth.currentUser) {

      alert(
        "Lütfen giriş yapınız."
      );

      return;

    }


    if (
      auth.currentUser.email ===
      ilan.sahip
    ) {

      alert(
        "Kendi ürününüzü sepete ekleyemezsiniz."
      );

      return;

    }


    try {


      const q = query(

        collection(
          db,
          "sepet"
        ),

        where(
          "kullanici",
          "==",
          auth.currentUser.email
        ),

        where(
          "ilanId",
          "==",
          ilan.id
        )

      );


      const snap =
        await getDocs(q);


      /* ÜRÜN ZATEN VARSA */

      if (!snap.empty) {

        const belge =
          snap.docs[0];


        const veri =
          belge.data();


        await updateDoc(

          doc(
            db,
            "sepet",
            belge.id
          ),

          {

            adet:
              Number(
                veri.adet || 1
              ) + 1

          }

        );


        alert(
          "🛒 Ürün adedi artırıldı."
        );


        return;

      }


      /* YENİ ÜRÜN */

      await addDoc(

        collection(
          db,
          "sepet"
        ),

        {

          kullanici:
            auth.currentUser.email,

          ilanId:
            ilan.id,

          baslik:
            ilan.baslik,

          fiyat:
            fiyat,

          resim:

            ilan.resim ||

            "https://via.placeholder.com/500x500",

          adet:
            1,

          satici:
            ilan.sahip || "",

          eklenmeTarihi:
            new Date()

        }

      );


      alert(
        "🛒 Ürün sepete eklendi."
      );


    } catch (error) {


      console.error(

        "Sepete ekleme hatası:",

        error

      );


      alert(

        "Ürün sepete eklenirken bir hata oluştu."

      );

    }

  }


  return (


    <Link

      to={`/ilan/${ilan.id}`}

      className={`product-card ${
        ilan.oneCikan
          ? "featured-product"
          : ""
      } ${
        ilan.kategori === "A4 Tasarım"
          ? "product-card--a4"
          : ""
      }`}

    >


      {/* =========================
          RESİM
      ========================= */}

      <div className="product-image">


        <img

          src={

            ilan.resim ||

            "https://via.placeholder.com/500x500"

          }

          alt={
            ilan.baslik
          }

        />


        {/* FAVORİ */}

        <button

          className={

            fav

              ? "favorite-btn active"

              : "favorite-btn"

          }

          onClick={
            favori
          }

          title="Favorilere ekle"

        >

          {fav
            ? "❤️"
            : "♡"}

        </button>


        {/* ETİKETLER */}

        <div className="product-badges">


          {ilan.trend && (

            <span className="trend-badge">

              🔥 Trend

            </span>

          )}


          {ilan.oneCikan && (

            <span className="featured-badge">

              ⭐ Öne Çıkan

            </span>

          )}


        </div>


        {/* İNDİRİM */}

        {indirim > 0 && (

          <span className="discount-badge">

            %{indirim} İNDİRİM

          </span>

        )}


      </div>


      {/* =========================
          ÜRÜN BİLGİLERİ
      ========================= */}

      <div className="product-body">


        {/* KATEGORİ */}

        {ilan.kategori && (

          <div className="product-category">

            {ilan.kategori}

          </div>

        )}


        {/* BAŞLIK */}

        <h3 className="product-title">

          {ilan.baslik}

        </h3>


        {/* FİYAT */}

        <div className="product-price">


          {eskiFiyat > fiyat && (

            <span className="old-price">

              ₺
              {eskiFiyat.toLocaleString(
                "tr-TR"
              )}

            </span>

          )}


          <span className="current-price">

            ₺
            {fiyat.toLocaleString(
              "tr-TR"
            )}

          </span>


        </div>


        {/* =========================
            GERÇEK ÜRÜN PUANI
        ========================= */}

        <div className="product-rating">


          {puan > 0 ? (

            <>

              <span className="rating-stars">

                {"★".repeat(
                  Math.round(puan)
                )}

                {"☆".repeat(
                  5 -
                  Math.round(puan)
                )}

              </span>


              <strong>

                {puan.toFixed(1)}

              </strong>


              {yorumSayisi > 0 && (

                <span className="rating-count">

                  (
                  {yorumSayisi}
                  )

                </span>

              )}

            </>

          ) : (

            <span className="no-rating">

              Henüz değerlendirme yok

            </span>

          )}


        </div>


        {/* ALT BİLGİ */}

        <div className="product-stats">


          <span>

            👁
            {" "}
            {ilan.goruntulenme || 0}

          </span>


          <span>

            ❤️
            {" "}
            {ilan.favoriSayisi || 0}

          </span>


          <span

            className={

              Number(
                ilan.stok || 0
              ) > 0

                ? "stock in-stock"

                : "stock out-stock"

            }

          >

            {Number(
              ilan.stok || 0
            ) > 0

              ? "🟢 Stokta"

              : "🔴 Tükendi"}

          </span>


        </div>


        {/* SEPET */}

        <div className="product-actions">


          <button

            className="cart-btn"

            onClick={
              sepeteEkle
            }

            disabled={
              Number(
                ilan.stok || 0
              ) <= 0
            }

          >

            🛒

            <span>

              Sepete Ekle

            </span>

          </button>


        </div>


      </div>


    </Link>

  );

}


export default ProductCard;
