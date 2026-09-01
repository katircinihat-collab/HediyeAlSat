import { formatListingCategory } from "./data/categories";

function ListingDetail({ilan,geri}){


return (

<div className="page">


<button onClick={geri}>
← Geri
</button>


<div className="detail">


<div className="photo big">


{ilan.resim ?

<img src={ilan.resim}/>

:

ilan.emoji || "🎁"

}


</div>


<h1>
{ilan.baslik}
</h1>


<h2>
{ilan.fiyat}
</h2>


<p>
📍 {ilan.sehir}
</p>


<p>
Kategori:
{formatListingCategory(ilan)}
</p>


<p>
Durum:
{ilan.tip}
</p>


<hr/>


<h3>
Satıcı Bilgisi
</h3>


<p>
HediyeAlSat üyesi
</p>


<button>
💬 Mesaj Gönder
</button>


</div>


</div>

)

}


export default ListingDetail;
