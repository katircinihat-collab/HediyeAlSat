import "../styles/components/filter-bar.css";
function FilterBar({ favoriler, setFavoriler }) {

  return (

    <div className="filter-bar">

      <button
        onClick={()=>{
          alert(
`📍 Semerciler Mahallesi
Dr. Nuri Bayar Caddesi
Birkent Pasajı Kat:1 No:69
Adapazarı / Sakarya`
          );
        }}
      >
        📍 Konum
      </button>

      <button
        onClick={()=>{
          alert(
`☎️ 05530229950
☎️ 05324093233`
          );
        }}
      >
        ☎️ Tel
      </button>

      <button onClick={()=>setFavoriler(!favoriler)}>

        ❤️ Favorilerim

      </button>

    </div>

  );

}

export default FilterBar;