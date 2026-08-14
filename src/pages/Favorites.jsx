import {useEffect,useState} from "react";
import {
collection,
getDocs,
query,
where
} from "firebase/firestore";

import {db,auth} from "../firebase";

import "../App.css";


function Favorites(){


const [favoriler,setFavoriler]=useState([]);



useEffect(()=>{


async function getir(){


if(!auth.currentUser)return;


const q=query(

collection(db,"favoriler"),

where(
"kullanici",
"==",
auth.currentUser.email
)

);



const snap=await getDocs(q);


setFavoriler(

snap.docs.map(d=>({

id:d.id,

...d.data()

}))

);


}


getir();


},[]);




return (

<div className="page">


<h1>

❤️ Favorilerim

</h1>



{

favoriler.length===0

?

<h3>

Favori ilan yok

</h3>


:

favoriler.map(f=>(


<div className="product" key={f.id}>


<h3>

{f.baslik}

</h3>


<p>

💰 {f.fiyat}

</p>


<p>

📍 {f.sehir}

</p>


</div>


))

}



</div>

)

}


export default Favorites;