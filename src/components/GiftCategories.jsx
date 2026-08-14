import { Link } from "react-router-dom";

function GiftCategories(){

const list=[
["❤️","Sevgili"],
["👩","Anne"],
["👨","Baba"],
["👶","Çocuk"],
["🎂","Doğum Günü"],
["💍","Yıldönümü"],
["🎉","Sürpriz"],
["🎄","Yılbaşı"]
];

return(

<section className="gift-categories">

{list.map(([icon,text])=>(

<Link
key={text}
to={"/?arama="+text}
className="gift-card"
>

<div>{icon}</div>

<span>{text}</span>

</Link>

))}

</section>

);

}

export default GiftCategories;