import {useEffect,useState} from "react";
import {useParams,useNavigate} from "react-router-dom";
import {
doc,
getDoc,
updateDoc
} from "firebase/firestore";

import {db} from "../firebase";

import { auth } from "../firebase";

function EditListing(){

const CLOUD_NAME="dsncigidz";
const UPLOAD_PRESET="zcqdaoum";
const {id}=useParams();

const navigate=useNavigate();


const [ilan,setIlan]=useState(null);

const [yeniFotolar,setYeniFotolar]=useState([]);

useEffect(()=>{


async function getir(){


const snap = await getDoc(
doc(db,"ilanlar",id)
);


if(!snap.exists()){
return;
}



if(
snap.data().sahip !== auth.currentUser?.email &&
auth.currentUser?.email !== "alper54nihat@hediyealsat.com"
){

alert("Bu ilanı düzenleme yetkin yok");

navigate("/");

return;

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


await updateDoc(

doc(db,"ilanlar",id),

{
baslik:ilan.baslik,

fiyat:ilan.fiyat,

telefon:ilan.telefon,

aciklama:ilan.aciklama,

kategori:ilan.kategori,

renk:ilan.renk,

marka:ilan.marka,


resimler:
yeniFotolar.length > 0
?
yeniFotolar
:
ilan.resimler,


resim:
yeniFotolar.length > 0
?
yeniFotolar[0]
:
ilan.resim

}

);


alert("İlan güncellendi ✅");


navigate("/");


}




return (

<div className="ilan-form">


<h2>✏️ İlan Düzenle</h2>

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

value={ilan.telefon}

onChange={e=>

setIlan({

...ilan,

telefon:e.target.value

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



<button>

Kaydet

</button>



</form>


</div>

)


}


export default EditListing;
