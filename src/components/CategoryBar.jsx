import "../styles/components/category-bar.css";
import { categoryDefinitions } from "../data/categories";
import { useNavigate } from "react-router-dom";

function CategoryBar({
  kategori,
  setKategori,
  favoriler,
  setFavoriler
}) {

  const navigate = useNavigate();

  function kategoriSec(yeniKategori, slug) {

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


      {categoryDefinitions.map(
        (category) => (

          <button
            type="button"
            key={category.id}
            className={
              kategori === category.name
                ? "category-item active"
                : "category-item"
            }
            onClick={() =>
              kategoriSec(category.name, category.id)
            }
          >

            {category.icon}{" "}

            {category.name}

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
