import "../styles/components/category-bar.css";
import categories from "../data/categories";
import { useNavigate } from "react-router-dom";

function CategoryBar({
  kategori,
  setKategori,
  favoriler,
  setFavoriler
}) {

  const navigate = useNavigate();

  const ikonlar = {

    "Çiçek": "🌸",
    "Takı & Aksesuar": "💍",
    "El Yapımı": "🧵",
    "2. El Hediyelik": "♻️",
    "Kişiye Özel": "🎁",
    "Organizasyon": "🎉",
    "Ev Dekorasyonu": "🏠",
    "Oyuncak": "🧸",
    "Hediye Kutuları": "🎀"

  };


  const sluglar = {

    "Çiçek": "cicek",
    "Takı & Aksesuar": "taki-aksesuar",
    "El Yapımı": "el-yapimi",
    "2. El Hediyelik": "2-el-hediyelik",
    "Kişiye Özel": "kisiye-ozel",
    "Organizasyon": "organizasyon",
    "Ev Dekorasyonu": "ev-dekorasyonu",
    "Oyuncak": "oyuncak",
    "Hediye Kutuları": "hediye-kutulari"

  };


  function kategoriSec(yeniKategori) {

    console.log(
      "Kategori seçildi:",
      yeniKategori
    );


    if (!yeniKategori) {

      setKategori("");

      navigate("/");

      return;

    }


    setKategori(yeniKategori);


    const slug =
      sluglar[yeniKategori];


    if (slug) {

      navigate(
        `/kategori/${slug}`
      );

    }

  }


  return (

    <section className="categories">

      <button
        type="button"
        className={
          kategori === ""
            ? "category-item active"
            : "category-item"
        }
        onClick={() =>
          kategoriSec("")
        }
      >
        🌍 Tümü
      </button>


      {Object.keys(categories).map(
        (kategoriAdi) => (

          <button
            type="button"
            key={kategoriAdi}
            className={
              kategori === kategoriAdi
                ? "category-item active"
                : "category-item"
            }
            onClick={() =>
              kategoriSec(kategoriAdi)
            }
          >

            {ikonlar[kategoriAdi] || "📦"}{" "}

            {kategoriAdi}

          </button>

        )
      )}


      <button
        type="button"
        className="category-item"
        onClick={() => {

          alert(
            "📍 Yakında konuma göre filtreleme eklenecek."
          );

        }}
      >
        📍 Konum
      </button>


      <button
        type="button"
        className="category-item"
        onClick={() => {

          alert(
            "☎️ Telefon filtresi yakında eklenecek."
          );

        }}
      >
        ☎️ Tel
      </button>


      <button
        type="button"
        className={
          favoriler
            ? "category-item active"
            : "category-item"
        }
        onClick={() =>
          setFavoriler(!favoriler)
        }
      >
        ❤️ Favorilerim
      </button>

    </section>

  );

}

export default CategoryBar;