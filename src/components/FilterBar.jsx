import "../styles/components/filter-bar.css";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";

function FilterBar() {

  const navigate = useNavigate();

  function profileGit(hash) {
    const hedef = `/profil#${hash}`;

    if (!auth.currentUser) {
      navigate("/login", { state: { from: hedef } });
      return;
    }

    navigate(hedef);
  }

  return (

    <div className="filter-bar">

      <button
        onClick={() => profileGit("konum")}
      >
        📍 Konum
      </button>

      <button
        onClick={() => profileGit("telefon")}
      >
        ☎️ Tel
      </button>

      <button onClick={() => navigate("/favorilerim")}>

        ❤️ Favorilerim

      </button>

    </div>

  );

}

export default FilterBar;
