import { auth } from "../firebase";
import { Navigate } from "react-router-dom";
import AddListing from "../components/AddListing";
import { Link } from "react-router-dom";
import "../App.css";


function AddListingPage(){
if(!auth.currentUser){

return <Navigate to="/login"/>

}

return (

<div>


<header className="header">


<div className="logo">

🎁 Hediye<span>AlSat</span>

</div>


<Link to="/">

Ana Sayfa

</Link>


</header>



<div className="page">


<h1>

Ücretsiz İlan Ver

</h1>


<p>

Ürünün bilgilerini gir ve yayınla

</p>



<AddListing />



</div>


</div>

)

}


export default AddListingPage;