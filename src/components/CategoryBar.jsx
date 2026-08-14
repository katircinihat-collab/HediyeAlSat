import { useState } from "react";
import "../styles/components/category-bar.css";
import categories from "../data/categories";

function CategoryBar({

  setKategori,

  favoriler,

  setFavoriler

}) {

  const [aktifKategori, setAktifKategori] = useState("");

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

  function kategoriSec(kategori){

    setAktifKategori(kategori);

    setKategori(kategori);

  }

  return (

    <section className="categories">

      <button

        className={

          aktifKategori===""

          ?

          "category-item active"

          :

          "category-item"

        }

        onClick={()=>kategoriSec("")}

      >

        🌍 Tümü

      </button>

      {

        Object.keys(categories).map((kategori)=>(

          <button

            key={kategori}

            className={

              aktifKategori===kategori

              ?

              "category-item active"

              :

              "category-item"

            }

            onClick={()=>kategoriSec(kategori)}

          >

            {ikonlar[kategori] || "📦"} {kategori}

          </button>

        ))

      }

      <button

        className="category-item"

        onClick={()=>{

          alert("📍 Yakında konuma göre filtreleme eklenecek.");

        }}

      >

        📍 Konum

      </button>

      <button

        className="category-item"

        onClick={()=>{

          alert("☎️ Telefon filtresi yakında eklenecek.");

        }}

      >

        ☎️ Tel

      </button>

      <button

        className={

          favoriler

          ?

          "category-item active"

          :

          "category-item"

        }

        onClick={()=>setFavoriler(!favoriler)}

      >

        ❤️ Favorilerim

      </button>

    </section>

  );

}

export default CategoryBar;