import "../styles/components/filter-bar.css";
import { useNavigate } from "react-router-dom";

function FilterBar() {

  const navigate = useNavigate();

  return (

    <div className="filter-bar">

      <button
        onClick={()=>{
          navigate("/profil#konum");
        }}
      >
        📍 Konum
      </button>

      <button
        onClick={()=>{
          navigate("/profil#telefon");
        }}
      >
        ☎️ Tel
      </button>

      <button onClick={()=>navigate("/favorilerim")}>

        ❤️ Favorilerim

      </button>

    </div>

  );

}

export default FilterBar;
