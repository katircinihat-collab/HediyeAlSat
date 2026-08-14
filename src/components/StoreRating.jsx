import "../styles/components/store-rating.css";

function StoreRating({

puanVer,

puanVerdiMi

}) {

return (

<section className="store-rating">

<div className="rating-card">

<h2>

⭐ Mağazayı Puanla

</h2>

{

puanVerdiMi ?

<div className="rating-success">

✅ Bu mağazayı puanladınız.

</div>

:

<>

<p>

Alışveriş deneyiminizi değerlendirin.

</p>

<div className="rating-stars">

<button

onClick={() => puanVer(1)}

>

⭐

</button>

<button

onClick={() => puanVer(2)}

>

⭐⭐

</button>

<button

onClick={() => puanVer(3)}

>

⭐⭐⭐

</button>

<button

onClick={() => puanVer(4)}

>

⭐⭐⭐⭐

</button>

<button

onClick={() => puanVer(5)}

className="active"

>

⭐⭐⭐⭐⭐

</button>

</div>

</>

}

</div>

</section>

);

}

export default StoreRating;