function PaymentCard({

kart,

setKart,

odemeTipi,

setOdemeTipi

}){

function degistir(e){

setKart({

...kart,

[e.target.name]:e.target.value

});

}

return(

<div className="payment-box">

<h2>

💳 Ödeme Yöntemi

</h2>

<div className="payment-methods">

<label>

<input

type="radio"

checked={odemeTipi==="kart"}

onChange={()=>setOdemeTipi("kart")}

/>

Kredi / Banka Kartı

</label>

<label>

<input

type="radio"

checked={odemeTipi==="havale"}

onChange={()=>setOdemeTipi("havale")}

/>

Havale / EFT

</label>

</div>

{

odemeTipi==="kart" && (

<>

<div className="form-group">

<label>Kart Sahibi</label>

<input

name="ad"

value={kart.ad}

onChange={degistir}

placeholder="Kart Üzerindeki İsim"

/>

</div>

<div className="form-group">

<label>Kart Numarası</label>

<input

name="no"

maxLength="19"

value={kart.no}

onChange={degistir}

placeholder="0000 0000 0000 0000"

/>

</div>

<div className="card-row">

<div className="form-group">

<label>Ay</label>

<input

name="ay"

maxLength="2"

value={kart.ay}

onChange={degistir}

placeholder="AA"

/>

</div>

<div className="form-group">

<label>Yıl</label>

<input

name="yil"

maxLength="2"

value={kart.yil}

onChange={degistir}

placeholder="YY"

/>

</div>

<div className="form-group">

<label>CVV</label>

<input

name="cvv"

maxLength="3"

value={kart.cvv}

onChange={degistir}

placeholder="123"

/>

</div>

</div>

</>

)

}

{

odemeTipi==="havale" && (

<div className="havale-box">

<h3>🏦 Havale / EFT Bilgileri</h3>

<p>

Banka : Ziraat Bankası

</p>

<p>

IBAN :

TR00 0000 0000 0000 0000 0000 00

</p>

<p>

Alıcı :

HediyeAlSat Teknoloji A.Ş.

</p>

<p style={{color:"#d32f2f"}}>

Açıklama kısmına sipariş numarası yazılacaktır.

</p>

</div>

)

}

</div>

);

}

export default PaymentCard;