import {useEffect,useState} from "react";
import {useParams,useNavigate} from "react-router-dom";
import {
doc,
getDoc,
updateDoc,
deleteField
} from "firebase/firestore";

import {db} from "../firebase";

import { auth } from "../firebase";
import GiftAttributes from "../components/GiftAttributes";
import { normalizeGiftTaxonomy } from "../seo/giftTaxonomy";
import { validatePublicContent } from "../utils/publicContentModeration";
import { adminApi } from "../config/adminApi";

function EditListing(){

const CLOUD_NAME="dsncigidz";
const UPLOAD_PRESET="zcqdaoum";
const {id}=useParams();

const navigate=useNavigate();


const [ilan,setIlan]=useState(null);

const [yeniFotolar,setYeniFotolar]=useState([]);
const [adminMode,setAdminMode]=useState(false);
const [kaydediliyor,setKaydediliyor]=useState(false);
const [hata,setHata]=useState("");

useEffect(()=>{


async function getir(){


const snap = await getDoc(
doc(db,"ilanlar",id)
);


if(!snap.exists()){
return;
}



const veri=snap.data();
const sahibiMi=veri.sahipUid
? veri.sahipUid===auth.currentUser?.uid
: veri.sahip===auth.currentUser?.email;

if(!sahibiMi){

try {
await adminApi("/me");
setAdminMode(true);
} catch {

alert("Bu ilanı düzenleme yetkin yok");

navigate("/");

return;

}

}



setIlan({

id:snap.id,

...snap.data()

});


}
getir();
// Preserve the existing route-id-based authorization/load behavior.
// eslint-disable-next-line react-hooks/exhaustive-deps
},[id]);



if(!ilan)

return <h2>Yükleniyor...</h2>;





async function kaydet(e){

e.preventDefault();
if(kaydediliyor) return;
setKaydediliyor(true);
setHata("");

let guvenliAciklama;
try {
guvenliAciklama=validatePublicContent(ilan.aciklama);
} catch (error) {
setHata(error.message);
setKaydediliyor(false);
return;
}

const update = {
...normalizeGiftTaxonomy(ilan),
baslik:ilan.baslik,
fiyat:ilan.fiyat,
aciklama:guvenliAciklama,
kategori:ilan.kategori,
renk:ilan.renk,
marka:ilan.marka,
resimler:yeniFotolar.length > 0 ? yeniFotolar : ilan.resimler,
resim:yeniFotolar.length > 0 ? yeniFotolar[0] : ilan.resim
};

try {
if(adminMode){
await adminApi(`/listings/${id}`, {
method:"PATCH",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(update)
});
} else {
await updateDoc(doc(db,"ilanlar",id), {...update,telefon:deleteField()});
}
alert("İlan güncellendi ✅");
navigate(adminMode ? "/admin" : "/");
} catch (error) {
setHata(error.message || "İlan güncellenemedi.");
} finally {
setKaydediliyor(false);
}

}




return (

<div className="ilan-form">


<h2>✏️ İlan Düzenle</h2>

{hata && <p className="admin-operation-error" role="alert">{hata}</p>}

<div>

<h3>Mevcut Fotoğraflar</h3>


{
ilan.resimler?.map((foto,index)=>(

<img

key={index}

src={foto}

width="120"

style={{margin:"5px"}}

/>

))

}


<input

type="file"

multiple

accept="image/*"

onChange={async(e)=>{


const dosyalar =
Array.from(e.target.files);


let fotolar=[];


for(let dosya of dosyalar){


const formData=new FormData();


formData.append(
"file",
dosya
);


formData.append(
"upload_preset",
UPLOAD_PRESET
);



const cevap=await fetch(

`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,

{

method:"POST",

body:formData

}

);


const veri=await cevap.json();


fotolar.push(veri.secure_url);


}


setYeniFotolar(fotolar);


alert("Yeni fotoğraflar hazır ✅");


}}

/>

</div>
<form onSubmit={kaydet}>
<GiftAttributes value={ilan} onChange={attributes => setIlan(previous => ({ ...previous, ...attributes }))} />


<input

value={ilan.baslik}

onChange={e=>

setIlan({

...ilan,

baslik:e.target.value

})

}

/>



<input

value={ilan.fiyat}

onChange={e=>

setIlan({

...ilan,

fiyat:e.target.value

})

}

/>





<input

value={ilan.marka}

onChange={e=>

setIlan({

...ilan,

marka:e.target.value

})

}

/>



<input

value={ilan.renk}

onChange={e=>

setIlan({

...ilan,

renk:e.target.value

})

}

/>




<textarea

value={ilan.aciklama}

onChange={e=>

setIlan({

...ilan,

aciklama:e.target.value

})

}

/>



<button disabled={kaydediliyor}>

{kaydediliyor ? "Kaydediliyor..." : "Kaydet"}

</button>



</form>


</div>

)


}


export default EditListing;
