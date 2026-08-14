import { useEffect,useState } from "react";
import { useParams,useNavigate } from "react-router-dom";

import {
doc,
getDoc,
updateDoc,
deleteDoc
} from "firebase/firestore";

import { db } from "../firebase";


function AdminDetail(){


const {id}=useParams();

const navigate=useNavigate();

const [ilan,setIlan]=useState(null);



useEffect(()=>{


async function getir(){


const snap =
await getDoc(
doc(db,"ilanlar",id)
);


if(snap.exists()){

setIlan({

id:snap.id,
...snap.data()

});

}


}


getir();


},[id]);




async function onayla(){


await updateDoc(

doc(db,"ilanlar",id),

{

onay:true

}

);


alert("İlan yayınlandı ✅");

navigate("/admin");


}




async function reddet(){


await updateDoc(

doc(db,"ilanlar",id),

{

onay:false

}

);


alert("İlan reddedildi");

navigate("/admin");


}




async function sil(){


if(!confirm("Silinsin mi?"))
return;


await deleteDoc(

doc(db,"ilanlar",id)

);


navigate("/admin");


}





if(!ilan){

return <h2>Yükleniyor...</h2>

}




return (

<div className="page">


<h1>
👑 Yönetici Kontrol
</h1>




<div className="detail-container">



<div className="detail-photo">



{

ilan.resimler?.map((foto,index)=>(


<img

key={index}

src={foto}

className="detail-img"

/>


))

}



</div>





<div className="detail-info">



<h2>

{ilan.baslik}

</h2>


<h2>

{ilan.fiyat}

</h2>



<p>
👤 Satıcı:
{ilan.sahip}
</p>



<p>
☎️ Telefon:
{ilan.telefon}
</p>



<p>
📍 Konum:
{ilan.sehir}
</p>



<p>
📦 Kategori:
{ilan.kategori}
</p>



<p>
🏷️ Tür:
{ilan.tip}
</p>



<hr/>


<h3>
Ürün Bilgileri
</h3>


<p>
Marka:
{ilan.marka || "-"}
</p>


<p>
Renk:
{ilan.renk || "-"}
</p>


<p>
Adet:
{ilan.adet || "-"}
</p>



<p>
Durum:
{ilan.durum || "-"}
</p>



<p>

📝 Açıklama:

</p>


<p>

{ilan.aciklama}

</p>



<button onClick={onayla}>
✅ Yayınla
</button>


<button onClick={reddet}>
❌ Reddet
</button>


<button onClick={sil}>
🗑 Sil
</button>




</div>


</div>



</div>


)

}


export default AdminDetail;