import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
doc,
getDoc,
setDoc
} from "firebase/firestore";

function Profile(){

const [profil,setProfil]=useState({

ad:"",
telefon:"",
sehir:"",
hakkinda:""

});

useEffect(()=>{

async function getir(){

if(!auth.currentUser) return;

const ref=doc(db,"profiller",auth.currentUser.uid);

const snap=await getDoc(ref);

if(snap.exists()){

setProfil(snap.data());

}

}

getir();

},[]);

async function kaydet(){

await setDoc(

doc(db,"profiller",auth.currentUser.uid),

profil

);

alert("Profil kaydedildi ✅");

}

return(

<div className="page">

<h1>👤 Profilim</h1>

<p>

<b>Email:</b>

{auth.currentUser?.email}

</p>

<hr />

<div className="profile-menu">

<Link className="profile-link" to="/ilanlarim">
📦 İlanlarım
</Link>

<Link className="profile-link" to="/siparislerim">
🛒 Siparişlerim
</Link>
<Link
className="profile-link"
to="/sepet"
>
🛒 Sepetim
</Link>
<Link className="profile-link" to="/favoriler">
❤️ Favorilerim
</Link>

<Link className="profile-link" to="/mesajlar">
💬 Mesajlarım
</Link>

<Link className="profile-link" to="/magazalar">
🏪 Mağazalar
</Link>

<Link className="profile-link" to="/ayarlar">
⚙️ Ayarlar
</Link>
<Link

className="profile-link"

to="/satici-siparisleri"

>

📦 Satıcı Siparişleri

</Link>
</div>

<hr />

<input

placeholder="Ad Soyad"

value={profil.ad}

onChange={e=>

setProfil({

...profil,

ad:e.target.value

})

}

/>

<input

placeholder="Telefon"

value={profil.telefon}

onChange={e=>

setProfil({

...profil,

telefon:e.target.value

})

}

/>

<input

placeholder="Şehir"

value={profil.sehir}

onChange={e=>

setProfil({

...profil,

sehir:e.target.value

})

}

/>

<textarea

placeholder="Hakkımda"

value={profil.hakkinda}

onChange={e=>

setProfil({

...profil,

hakkinda:e.target.value

})

}

/>

<button onClick={kaydet}>

💾 Kaydet

</button>

</div>

);

}

export default Profile;